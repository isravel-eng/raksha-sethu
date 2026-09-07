import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db.js';
import { AppError, asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403, loadCitizenOr403 } from '../middleware/auth.js';
import { asCaseStage, asEventType, asJsonObject, asTimestamp, parseId, requireFields } from '../middleware/validate.js';
import { buildMlHistory, contextAt, stageFromEvent, toMlCheckin } from '../services/caseContext.js';
import { isMaterialEscalation } from '../services/checkInPipeline.js';
import { numericDynamicScore, predictRisk } from '../services/mlClient.js';

const router = Router();

router.post('/', authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, ['district', 'state']);
  const citizenId = req.user.role === 'citizen'
    ? req.user.citizen_id
    : parseId(req.body.citizen_id, 'citizen_id');
  if (!citizenId) {
    throw new AppError(400, 'citizen_id is required');
  }
  await loadCitizenOr403(req, citizenId);

  const stage = asCaseStage(req.body.case_stage || 'FIR');
  const status = req.body.status || 'active';
  if (!['active', 'closed', 'on_hold'].includes(status)) {
    throw new AppError(400, 'Invalid case status');
  }

  const inserted = await query(
    `INSERT INTO cases (citizen_id, case_number, district, state, case_stage, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [citizenId, `TMP-${Date.now()}`, req.body.district, req.body.state, stage, status]
  );
  const created = inserted.rows[0];
  const numbered = await query(
    `UPDATE cases SET case_number = $1 WHERE id = $2 RETURNING *`,
    [`RS-${new Date().getUTCFullYear()}-${String(created.id).padStart(5, '0')}`, created.id]
  );
  return res.status(201).json({ case: numbered.rows[0] });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  let result;
  if (req.user.role === 'citizen') {
    if (!req.user.citizen_id) {
      return res.json({ cases: [] });
    }
    result = await query('SELECT * FROM cases WHERE citizen_id = $1 ORDER BY created_at DESC', [req.user.citizen_id]);
  } else {
    result = await query('SELECT * FROM cases ORDER BY created_at DESC');
  }
  return res.json({ cases: result.rows });
}));

router.post('/:id/reprocess', authenticate, asyncHandler(async (req, res) => {
  const caseRow = await loadCaseOr403(req, req.params.id);

  // A meaningful NHAA case update arrives as a case event; store it first so
  // the rebuilt case context (hearing postponement, stage, threat markers)
  // feeds the existing ML feature generation.
  let storedEvent = null;
  if (req.body && req.body.event) {
    const eventType = asEventType(req.body.event.event_type);
    const eventDate = asTimestamp(req.body.event.event_date);
    const details = asJsonObject(req.body.event.details_json, 'details_json');
    if (eventType === 'HEARING_POSTPONED' && details.postponement_days == null && !details.new_hearing_date) {
      requireFields(details, ['postponement_days']);
    }
    const insertedEvent = await query(
      `INSERT INTO case_events (case_id, event_type, event_date, details_json)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [caseRow.id, eventType, eventDate.toISOString(), JSON.stringify(details)]
    );
    storedEvent = insertedEvent.rows[0];

    const nextStage = stageFromEvent(eventType, caseRow.case_stage);
    if (nextStage !== caseRow.case_stage) {
      await query('UPDATE cases SET case_stage = $1 WHERE id = $2', [nextStage, caseRow.id]);
    }
  }

  const [historyResult, eventsResult] = await Promise.all([
    query('SELECT * FROM check_ins WHERE case_id = $1 ORDER BY timestamp ASC, id ASC', [caseRow.id]),
    query('SELECT * FROM case_events WHERE case_id = $1 ORDER BY event_date ASC, id ASC', [caseRow.id]),
  ]);

  if (historyResult.rows.length === 0) {
    throw new AppError(400, 'This case has no check-ins to reassess');
  }

  // Rebuild the current case + full chronological check-in history and send
  // the updated context to the existing ML service.
  let mlRequest = buildMlHistory(historyResult.rows, eventsResult.rows, caseRow.case_stage);

  // If the new case event postdates the newest check-in, append the victim's
  // latest known state re-evaluated under the UPDATED case context (same
  // self-report signals, current hearing/threat/stage context at the event
  // time) so the ML service can detect the case-driven change. No new patient
  // data is stored.
  if (storedEvent && historyResult.rows.length > 0) {
    const newestCheckIn = historyResult.rows[historyResult.rows.length - 1];
    if (new Date(storedEvent.event_date) > new Date(newestCheckIn.timestamp)) {
      const currentContext = contextAt(eventsResult.rows, storedEvent.event_date, caseRow.case_stage);
      mlRequest = [
        ...mlRequest,
        {
          ...toMlCheckin(newestCheckIn, currentContext),
          timestamp: new Date(storedEvent.event_date).toISOString(),
        },
      ];
    }
  }

  const predictionPayload = await predictRisk(mlRequest);

  // Store the new prediction against the latest check-in (one check-in can
  // legitimately receive multiple predictions as NHAA context changes).
  const latestCheckIn = historyResult.rows[historyResult.rows.length - 1];
  const saved = await query(
    `INSERT INTO predictions (
       citizen_id, case_id, check_in_id, risk_level, dynamic_score,
       urgent_probability, confidence, trend, top_risk_factors_json,
       protective_factors_json, human_review_required, model_version
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)
     RETURNING *`,
    [
      caseRow.citizen_id,
      caseRow.id,
      latestCheckIn.id,
      predictionPayload.risk_level,
      numericDynamicScore(predictionPayload),
      predictionPayload.urgent_probability ?? null,
      predictionPayload.confidence ?? null,
      predictionPayload.trend ?? null,
      JSON.stringify(predictionPayload.top_risk_factors || []),
      JSON.stringify(predictionPayload.protective_factors || []),
      Boolean(predictionPayload.human_review_required),
      predictionPayload.model_version ?? null,
    ]
  );
  const storedPrediction = saved.rows[0];

  // Compare with the previous prediction (the one before the just-stored one):
  // alert ONLY on material escalation.
  const recentPredictions = await query(
    `SELECT * FROM predictions WHERE case_id = $1 ORDER BY created_at DESC, id DESC LIMIT 2`,
    [caseRow.id]
  );
  const previousPrediction = recentPredictions.rows.length >= 2 ? recentPredictions.rows[1] : null;
  const previousScore = previousPrediction ? Number(previousPrediction.dynamic_score) : null;
  const currentScore = numericDynamicScore(predictionPayload);
  const riskDelta = previousScore == null || currentScore == null ? null : Math.round(currentScore - previousScore);

  const escalated = isMaterialEscalation(previousPrediction, predictionPayload, config.mlEscalationDelta);
  let alert = null;
  if (escalated) {
    const severity = String(predictionPayload.risk_level || 'HIGH').toUpperCase();
    const factors = (predictionPayload.top_risk_factors || []).join(', ') || 'none listed';
    const createdAlert = await query(
      `INSERT INTO alerts (citizen_id, case_id, prediction_id, severity, status, message)
       VALUES ($1,$2,$3,$4,'open',$5)
       RETURNING *`,
      [
        caseRow.citizen_id,
        caseRow.id,
        storedPrediction.id,
        severity,
        `Risk reassessment after NHAA case update: ${String(previousPrediction?.risk_level || 'n/a')} (${previousScore ?? 'n/a'}) -> ${predictionPayload.risk_level} (${currentScore ?? 'n/a'}). Factors: ${factors}.`,
      ]
    );
    alert = createdAlert.rows[0];
  }

  return res.status(201).json({
    event: storedEvent,
    ml_request: { checkin_history: mlRequest },
    prediction: predictionPayload,
    stored_prediction: storedPrediction,
    previous_prediction: previousPrediction && previousPrediction.id !== storedPrediction.id ? previousPrediction : null,
    previous_score: previousScore,
    current_score: currentScore,
    risk_delta: riskDelta,
    escalated,
    alert,
  });
}));

router.get('/:id/check-ins', authenticate, asyncHandler(async (req, res) => {
  const caseRow = await loadCaseOr403(req, req.params.id);
  const result = await query(
    'SELECT * FROM check_ins WHERE case_id = $1 ORDER BY timestamp ASC, id ASC',
    [caseRow.id]
  );
  return res.json({ check_ins: result.rows });
}));

router.get('/:id/events', authenticate, asyncHandler(async (req, res) => {
  const caseRow = await loadCaseOr403(req, req.params.id);
  const result = await query(
    'SELECT * FROM case_events WHERE case_id = $1 ORDER BY event_date ASC, id ASC',
    [caseRow.id]
  );
  return res.json({ events: result.rows });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const caseRow = await loadCaseOr403(req, req.params.id);
  return res.json({ case: caseRow });
}));

export default router;
