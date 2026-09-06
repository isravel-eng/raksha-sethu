import { Router } from 'express';
import { query } from '../db.js';
import { AppError, asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403 } from '../middleware/auth.js';
import {
  asBoundedNumber,
  asTimestamp,
  requireFields,
} from '../middleware/validate.js';
import { buildMlHistory } from '../services/caseContext.js';
import { numericDynamicScore, predictRisk } from '../services/mlClient.js';

const router = Router();

function scaleFields(body) {
  return {
    emotional_distress: asBoundedNumber(body.emotional_distress, 'emotional_distress', 0, 10),
    distress_frequency: asBoundedNumber(body.distress_frequency, 'distress_frequency', 0, 7),
    overwhelm: asBoundedNumber(body.overwhelm, 'overwhelm', 0, 10),
    sleep_quality: asBoundedNumber(body.sleep_quality, 'sleep_quality', 0, 10),
    fatigue: asBoundedNumber(body.fatigue, 'fatigue', 0, 10),
    social_support: asBoundedNumber(body.social_support, 'social_support', 0, 10),
    coping_ability: asBoundedNumber(body.coping_ability, 'coping_ability', 0, 10),
    self_harm_indicator: asBoundedNumber(body.self_harm_indicator, 'self_harm_indicator', 0, 1),
  };
}

router.post('/', authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, [
    'case_id',
    'emotional_distress',
    'distress_frequency',
    'overwhelm',
    'sleep_quality',
    'fatigue',
    'social_support',
    'coping_ability',
    'self_harm_indicator',
  ]);

  const caseRow = await loadCaseOr403(req, req.body.case_id);
  const scales = scaleFields(req.body);
  const timestamp = asTimestamp(req.body.timestamp);
  const messageText = req.body.message_text == null ? '' : String(req.body.message_text);

  const inserted = await query(
    `INSERT INTO check_ins (
       citizen_id, case_id, timestamp,
       emotional_distress, distress_frequency, overwhelm, sleep_quality, fatigue,
       social_support, coping_ability, self_harm_indicator, message_text
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      caseRow.citizen_id,
      caseRow.id,
      timestamp.toISOString(),
      scales.emotional_distress,
      scales.distress_frequency,
      scales.overwhelm,
      scales.sleep_quality,
      scales.fatigue,
      scales.social_support,
      scales.coping_ability,
      scales.self_harm_indicator,
      messageText,
    ]
  );
  const checkIn = inserted.rows[0];

  const [historyResult, eventsResult] = await Promise.all([
    query('SELECT * FROM check_ins WHERE case_id = $1 ORDER BY timestamp ASC, id ASC', [caseRow.id]),
    query('SELECT * FROM case_events WHERE case_id = $1 ORDER BY event_date ASC, id ASC', [caseRow.id]),
  ]);

  const mlRequest = buildMlHistory(historyResult.rows, eventsResult.rows, caseRow.case_stage);

  let predictionPayload = null;
  let storedPrediction = null;
  let alert = null;
  let mlError = null;

  try {
    predictionPayload = await predictRisk(mlRequest);
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
        checkIn.id,
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
    storedPrediction = saved.rows[0];

    if (predictionPayload.human_review_required) {
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
          `Human review required: ${severity} risk (dynamic score ${numericDynamicScore(predictionPayload) ?? 'n/a'}). Factors: ${factors}.`,
        ]
      );
      alert = createdAlert.rows[0];
    }
  } catch (error) {
    mlError = {
      message: error.message,
      status: error.status || 503,
      details: error.details,
    };
  }

  return res.status(mlError ? 202 : 201).json({
    check_in: checkIn,
    ml_request: { checkin_history: mlRequest },
    prediction: predictionPayload,
    stored_prediction: storedPrediction,
    alert,
    ...(mlError ? { ml_error: mlError } : {}),
  });
}));

export default router;
