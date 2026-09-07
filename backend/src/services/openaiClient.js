import { config } from '../config.js';
import { AppError } from '../errors.js';

/**
 * OpenAI conversational assessment adapter.
 *
 * OpenAI's ONLY responsibilities here are:
 *   - conducting a short, adaptive conversational assessment
 *   - understanding victim natural-language responses
 *   - extracting the structured assessment fields below
 *   - identifying missing fields and asking follow-up questions
 *
 * OpenAI NEVER computes the final 0-100 stress score. The existing RakshaSetu
 * ML service (mlClient.js) remains the authoritative stress/risk predictor.
 *
 * Field contract (exactly these keys, exactly these ranges):
 *   emotional_distress   0-10
 *   distress_frequency   0-7
 *   overwhelm            0-10
 *   sleep_quality        0-10
 *   fatigue              0-10
 *   social_support       0-10
 *   coping_ability       0-10
 *   self_harm_indicator  0-1
 *   message_text         free-text narrative (may be empty)
 *   missing_fields       list of field names still needed
 *   assessment_complete  boolean
 */

const FIELD_RANGES = {
  emotional_distress: [0, 10],
  distress_frequency: [0, 7],
  overwhelm: [0, 10],
  sleep_quality: [0, 10],
  fatigue: [0, 10],
  social_support: [0, 10],
  coping_ability: [0, 10],
  self_harm_indicator: [0, 1],
};

const REQUIRED_FIELDS = Object.keys(FIELD_RANGES);

const SYSTEM_PROMPT = `You are "RakshaSetu", a warm, supportive conversational assessment guide for a person who may be under significant distress (often involving ongoing legal/court proceedings). Your job is to run a SHORT, adaptive conversation — never a giant questionnaire — that collects the following information naturally:

1. emotional distress (0-10 scale)
2. distress frequency (how often over the last 2 weeks, 0-7)
3. overwhelm / ability to cope with daily demands (0-10)
4. sleep quality (0-10)
5. fatigue / energy (0-10)
6. social support (0-10)
7. coping ability (0-10)
8. an EXPLICIT safety/self-harm answer (0 = no thoughts of self-harm, 1 = passive or active self-harm thoughts)
9. a short free-text narrative of what they are experiencing

Rules you must follow:
- Ask ONE question at a time. Adapt follow-ups to what the person already shared. Keep replies brief (2-3 sentences), simple, non-clinical and kind.
- NEVER invent or infer field values from vague language. A field is only extracted when the person explicitly provides the information. In particular, NEVER infer self-harm/safety from vague language — only set self_harm_indicator when the person explicitly answers the safety question.
- If information is still missing, list it in "missing_fields" and ask an appropriate follow-up question in "reply".
- Set "assessment_complete" to true ONLY when all 8 numeric fields (including the explicit safety answer) are available.
- If the person indicates any self-harm risk (self_harm_indicator = 1), keep the reply caring and immediately include the Tele-MANAS 24x7 helpline (14416) in it.
- Do NOT diagnose, do NOT promise clinical outcomes. You are collecting information for a counsellor-reviewed triage pipeline.

Respond ONLY with a single JSON object in exactly this shape:
{
  "reply": "your conversational reply to the person",
  "assessment": {
    "emotional_distress": <number 0-10 or null>,
    "distress_frequency": <number 0-7 or null>,
    "overwhelm": <number 0-10 or null>,
    "sleep_quality": <number 0-10 or null>,
    "fatigue": <number 0-10 or null>,
    "social_support": <number 0-10 or null>,
    "coping_ability": <number 0-10 or null>,
    "self_harm_indicator": <0 or 1 or null>,
    "message_text": "<short narrative the person shared>",
    "missing_fields": ["field names still missing"],
    "assessment_complete": <true|false>
  }
}`;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalizes a raw OpenAI extraction into the exact field contract.
 * Missing/invalid values become 0 and are listed in missing_fields; the
 * backend (not the model) is authoritative for missing_fields and
 * assessment_complete. No value is ever invented.
 */
export function sanitizeAssessment(assessment = {}) {
  const sanitized = {};
  const missingFields = [];

  for (const field of REQUIRED_FIELDS) {
    const [min, max] = FIELD_RANGES[field];
    const raw = assessment[field];
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    if (
      raw === null ||
      raw === undefined ||
      raw === '' ||
      !Number.isFinite(numeric)
    ) {
      sanitized[field] = 0;
      missingFields.push(field);
    } else {
      sanitized[field] = clamp(numeric, min, max);
    }
  }

  const messageText =
    typeof assessment.message_text === 'string' && assessment.message_text.trim()
      ? assessment.message_text.trim()
      : '';

  return {
    ...sanitized,
    message_text: messageText,
    missing_fields: missingFields,
    assessment_complete: missingFields.length === 0,
  };
}

/**
 * Runs one step of the conversational assessment with OpenAI.
 * @param {{role: 'user'|'assistant', content: string}[]} messages - transcript so far (without system prompt)
 * @returns {Promise<{reply: string, assessment: object}>}
 */
export async function conductAssessment(messages) {
  if (!config.openaiApiKey) {
    throw new AppError(503, 'OPENAI_API_KEY is not configured on the backend');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.openaiTimeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let body;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }

    if (!response.ok) {
      const detail =
        body && typeof body === 'object'
          ? body.error?.message || JSON.stringify(body).slice(0, 300)
          : String(body || '').slice(0, 300);
      throw new AppError(502, `OpenAI request failed: ${detail}`);
    }

    const content = body?.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(502, 'OpenAI returned no message content');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AppError(502, 'OpenAI returned malformed JSON');
    }

    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : 'Could you tell me a little more about how you are feeling?';
    const assessment = sanitizeAssessment(parsed.assessment);

    return { reply, assessment };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') {
      throw new AppError(504, 'OpenAI request timed out');
    }
    throw new AppError(503, 'OpenAI service is unavailable', { reason: error.message });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Voicebot speech-to-text via OpenAI Whisper. Audio arrives as a base64
 * string (WebM/Opus from the browser MediaRecorder). The OpenAI key never
 * leaves the backend.
 */
export async function transcribeAudio(audioBase64) {
  if (!config.openaiApiKey) {
    throw new AppError(503, 'OPENAI_API_KEY is not configured on the backend');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.openaiTimeoutMs);

  try {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(audioBase64, 'base64')]), 'voice.webm');
    form.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.openaiApiKey}` },
      body: form,
      signal: controller.signal,
    });

    const raw = await response.text();
    let body;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }

    if (!response.ok) {
      const detail =
        body && typeof body === 'object'
          ? body.error?.message || JSON.stringify(body).slice(0, 300)
          : String(body || '').slice(0, 300);
      throw new AppError(502, `OpenAI transcription failed: ${detail}`);
    }

    const transcript = body?.text;
    if (!transcript || !String(transcript).trim()) {
      throw new AppError(502, 'OpenAI returned an empty transcription');
    }
    return String(transcript).trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') {
      throw new AppError(504, 'OpenAI transcription timed out');
    }
    throw new AppError(503, 'OpenAI speech service is unavailable', { reason: error.message });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Voicebot text-to-speech via OpenAI TTS. Returns base64-encoded audio bytes
 * so the frontend never needs an OpenAI key.
 */
export async function synthesizeSpeech(text) {
  if (!config.openaiApiKey) {
    throw new AppError(503, 'OPENAI_API_KEY is not configured on the backend');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.openaiTimeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: String(text || '').slice(0, 1000),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new AppError(502, `OpenAI speech synthesis failed: ${raw.slice(0, 300)}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') {
      throw new AppError(504, 'OpenAI speech synthesis timed out');
    }
    throw new AppError(503, 'OpenAI speech service is unavailable', { reason: error.message });
  } finally {
    clearTimeout(timer);
  }
}