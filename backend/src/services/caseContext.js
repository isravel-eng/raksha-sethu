function asObject(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
}

export function contextAt(events, timestamp, fallbackStage = 'FIR') {
  const at = new Date(timestamp);
  const prior = [...events]
    .filter((event) => new Date(event.event_date) <= at)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date) || a.id - b.id);

  let case_stage = fallbackStage;
  let hearingDate = null;
  let hearing_postponed = 0;
  let postponement_days = 0;
  let threat_reported = 0;
  let protection_needed = 0;
  let relief_pending = 0;
  let legal_aid_pending = 0;

  for (const event of prior) {
    const details = asObject(event.details_json);
    switch (event.event_type) {
      case 'FIR':
        case_stage = 'FIR';
        break;
      case 'CHARGESHEET':
        case_stage = 'CHARGESHEET';
        break;
      case 'TRIAL_DATE':
        case_stage = 'TRIAL';
        hearing_postponed = 0;
        postponement_days = 0;
        hearingDate = details.hearing_date ? new Date(details.hearing_date) : hearingDate;
        break;
      case 'HEARING_POSTPONED':
        hearing_postponed = 1;
        postponement_days = Number(details.postponement_days || 0);
        if (details.new_hearing_date) {
          hearingDate = new Date(details.new_hearing_date);
        } else if (hearingDate && postponement_days) {
          hearingDate = addDays(hearingDate, postponement_days);
        }
        break;
      case 'RELIEF':
        case_stage = 'RELIEF';
        relief_pending = details.relief_pending ? 1 : 0;
        break;
      case 'THREAT_REPORTED':
        threat_reported = 1;
        protection_needed = details.protection_needed === false ? 0 : 1;
        break;
      default:
        break;
    }
    if (details.legal_aid_pending !== undefined) {
      legal_aid_pending = details.legal_aid_pending ? 1 : 0;
    }
    if (details.protection_needed === true) protection_needed = 1;
    if (details.relief_pending === true) relief_pending = 1;
  }

  let days_until_hearing = 0;
  if (hearingDate && !Number.isNaN(hearingDate.getTime())) {
    days_until_hearing = Math.max(0, Math.ceil((hearingDate.getTime() - at.getTime()) / 86400000));
  }

  return {
    case_stage,
    days_until_hearing,
    hearing_postponed,
    postponement_days,
    threat_reported,
    protection_needed,
    relief_pending,
    legal_aid_pending,
  };
}

export function toMlCheckin(checkIn, context) {
  return {
    timestamp: new Date(checkIn.timestamp).toISOString(),
    message_text: checkIn.message_text || '',
    emotional_distress: Number(checkIn.emotional_distress),
    distress_frequency: Number(checkIn.distress_frequency),
    overwhelm: Number(checkIn.overwhelm),
    sleep_quality: Number(checkIn.sleep_quality),
    fatigue: Number(checkIn.fatigue),
    social_support: Number(checkIn.social_support),
    coping_ability: Number(checkIn.coping_ability),
    self_harm_indicator: Number(checkIn.self_harm_indicator),
    case_stage: context.case_stage,
    days_until_hearing: context.days_until_hearing,
    hearing_postponed: context.hearing_postponed,
    postponement_days: context.postponement_days,
    threat_reported: context.threat_reported,
    protection_needed: context.protection_needed,
    relief_pending: context.relief_pending,
    legal_aid_pending: context.legal_aid_pending,
  };
}

export function buildMlHistory(checkIns, events, fallbackStage) {
  return [...checkIns]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp) || a.id - b.id)
    .map((checkIn) => toMlCheckin(checkIn, contextAt(events, checkIn.timestamp, fallbackStage)));
}

export function stageFromEvent(eventType, currentStage) {
  switch (eventType) {
    case 'FIR':
      return 'FIR';
    case 'CHARGESHEET':
      return 'CHARGESHEET';
    case 'TRIAL_DATE':
    case 'HEARING_POSTPONED':
      return currentStage === 'CLOSED' ? currentStage : 'TRIAL';
    case 'RELIEF':
      return 'RELIEF';
    default:
      return currentStage;
  }
}
