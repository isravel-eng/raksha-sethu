import { query } from '../db.js';
import { buildMlHistory } from './caseContext.js';
import { numericDynamicScore, predictRisk } from './mlClient.js';

/**
 * Shared assessment pipeline used by both the structured screening route
 * (POST /check-ins) and the OpenAI conversational assessment route
 * (POST /chat/assessment):
 *
 *   1. store the check-in
 *   2. load ALL chronological check-ins for the case
 *   3. load case events
 *   4. build the ML-compatible chronological history (existing case-context
 *      feature generation)
 *   5. send it to the existing ML service
 *   6. store the returned prediction
 *   7. create a counsellor alert when human review is required
 *
 * ML failures are captured in mlError so the caller can decide how to respond
 * (the check-in is still stored).
 */
export async function runCheckInPipeline({ caseRow, scales, timestamp, messageText }) {
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

  return {
    checkIn,
    mlRequest,
    predictionPayload,
    storedPrediction,
    alert,
    mlError,
  };
}

/**
 * Loads the most recent stored prediction for a case (used to compare against
 * a newly generated prediction during continuous NHAA monitoring).
 */
export async function latestPredictionForCase(caseId) {
  const result = await query(
    `SELECT * FROM predictions WHERE case_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [caseId]
  );
  return result.rows[0] || null;
}

/**
 * Compares a new prediction with the previous one and decides whether a
 * material escalation occurred. Alerts are created ONLY on material
 * escalation (human review required, risk-tier escalation, or an absolute
 * dynamic-score increase beyond the configurable threshold) — never merely
 * because some field changed.
 */
export function isMaterialEscalation(previous, next, escalationDelta) {
  if (!next) return false;
  if (next.human_review_required) return true;

  const previousScore = Number(previous?.dynamic_score ?? 0);
  const nextScore = Number(next.dynamic_score ?? 0);
  if (nextScore - previousScore >= escalationDelta) return true;

  const tierOrder = { MILD: 0, LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };
  const previousTier = tierOrder[String(previous?.risk_level || '').toUpperCase()] ?? 1;
  const nextTier = tierOrder[String(next.risk_level || '').toUpperCase()] ?? 1;
  return nextTier > previousTier;
}