import { config } from '../config.js';
import { AppError } from '../errors.js';

export async function predictRisk(checkinHistory) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.mlTimeoutMs);

  try {
    const response = await fetch(`${config.mlServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin_history: checkinHistory }),
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
      throw new AppError(502, 'ML service returned an error', {
        status: response.status,
        body,
      });
    }

    return body;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') {
      throw new AppError(504, 'ML service timed out');
    }
    throw new AppError(503, 'ML service is unavailable', { reason: error.message });
  } finally {
    clearTimeout(timer);
  }
}

export function numericDynamicScore(prediction) {
  if (prediction == null) return null;
  if (typeof prediction.dynamic_score === 'number') return prediction.dynamic_score;
  if (prediction.dynamic_score && typeof prediction.dynamic_score.score === 'number') {
    return prediction.dynamic_score.score;
  }
  return null;
}
