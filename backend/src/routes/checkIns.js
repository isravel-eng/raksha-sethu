import { Router } from 'express';
import { AppError, asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403 } from '../middleware/auth.js';
import {
  asBoundedNumber,
  asTimestamp,
  requireFields,
} from '../middleware/validate.js';
import { runCheckInPipeline } from '../services/checkInPipeline.js';

const router = Router();

export function scaleFields(body) {
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

  const { checkIn, mlRequest, predictionPayload, storedPrediction, alert, mlError } =
    await runCheckInPipeline({ caseRow, scales, timestamp, messageText });

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
