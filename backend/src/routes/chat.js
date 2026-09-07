import { Router } from 'express';
import { asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403 } from '../middleware/auth.js';
import { asTimestamp, requireFields } from '../middleware/validate.js';
import {
  conductAssessment,
  synthesizeSpeech,
  transcribeAudio,
} from '../services/openaiClient.js';
import { runCheckInPipeline } from '../services/checkInPipeline.js';

const router = Router();

function asMessages(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('messages must be a non-empty array');
  }
  return value.map((message, index) => {
    const role = message?.role;
    const content = message?.content;
    if (role !== 'user' && role !== 'assistant') {
      throw new Error(`messages[${index}].role must be "user" or "assistant"`);
    }
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error(`messages[${index}].content must be a non-empty string`);
    }
    return { role, content: content.trim() };
  });
}

/**
 * Runs OpenAI conversation -> structured JSON, and when the assessment is
 * complete stores the check-in and runs the existing ML pipeline. Optionally
 * synthesizes a spoken reply for the voicebot.
 */
async function completeTurn(req, res, messages, caseRow, { withAudio = false, transcript = null } = {}) {
  const { reply, assessment } = await conductAssessment(messages);

  let replyAudioBase64 = null;
  if (withAudio) {
    try {
      replyAudioBase64 = await synthesizeSpeech(reply);
    } catch (audioError) {
      // Spoken output is optional: a TTS failure must not block the assessment.
      replyAudioBase64 = null;
    }
  }

  if (!assessment.assessment_complete) {
    return res.json({
      transcript,
      reply,
      reply_audio_base64: replyAudioBase64,
      assessment,
      prediction: null,
      stored_prediction: null,
      alert: null,
      check_in: null,
      ml_error: null,
    });
  }

  const scales = {
    emotional_distress: assessment.emotional_distress,
    distress_frequency: assessment.distress_frequency,
    overwhelm: assessment.overwhelm,
    sleep_quality: assessment.sleep_quality,
    fatigue: assessment.fatigue,
    social_support: assessment.social_support,
    coping_ability: assessment.coping_ability,
    self_harm_indicator: assessment.self_harm_indicator,
  };

  const timestamp = asTimestamp(req.body.timestamp);
  const { checkIn, mlRequest, predictionPayload, storedPrediction, alert, mlError } =
    await runCheckInPipeline({
      caseRow,
      scales,
      timestamp,
      messageText: assessment.message_text,
    });

  return res.status(mlError ? 202 : 201).json({
    transcript,
    reply,
    reply_audio_base64: replyAudioBase64,
    assessment,
    check_in: checkIn,
    ml_request: { checkin_history: mlRequest },
    prediction: predictionPayload,
    stored_prediction: storedPrediction,
    alert,
    ...(mlError ? { ml_error: mlError } : {}),
  });
}

/**
 * POST /chat/assessment (text)
 * Body: { case_id, messages: [{role, content}] }
 */
router.post('/assessment', authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, ['case_id', 'messages']);

  let messages;
  try {
    messages = asMessages(req.body.messages);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const caseRow = await loadCaseOr403(req, req.body.case_id);
  return completeTurn(req, res, messages, caseRow, { withAudio: false });
}));

/**
 * POST /chat/voice (voicebot)
 * Body: { case_id, messages: [{role, content}], audio_base64 }
 *
 * The victim speaks -> OpenAI Whisper transcribes -> the same conversational
 * assessment continues -> OpenAI TTS speaks the reply back. The OpenAI key
 * stays entirely on the backend; the frontend only exchanges base64 audio.
 */
router.post('/voice', authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, ['case_id', 'messages', 'audio_base64']);

  let messages;
  try {
    messages = asMessages(req.body.messages);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const caseRow = await loadCaseOr403(req, req.body.case_id);

  const transcript = await transcribeAudio(req.body.audio_base64);
  const userMessage = { role: 'user', content: transcript };
  return completeTurn(req, res, [...messages, userMessage], caseRow, {
    withAudio: true,
    transcript,
  });
}));

export default router;