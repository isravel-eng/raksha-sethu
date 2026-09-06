import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403, staffOnly } from '../middleware/auth.js';
import { asEventType, asJsonObject, asTimestamp, requireFields } from '../middleware/validate.js';
import { stageFromEvent } from '../services/caseContext.js';

const router = Router();

router.post('/', authenticate, staffOnly, asyncHandler(async (req, res) => {
  requireFields(req.body, ['case_id', 'event_type']);
  const caseRow = await loadCaseOr403(req, req.body.case_id);
  const eventType = asEventType(req.body.event_type);
  const eventDate = asTimestamp(req.body.event_date);
  const details = asJsonObject(req.body.details_json, 'details_json');

  if (eventType === 'HEARING_POSTPONED' && details.postponement_days == null && !details.new_hearing_date) {
    requireFields(details, ['postponement_days']);
  }

  const inserted = await query(
    `INSERT INTO case_events (case_id, event_type, event_date, details_json)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING *`,
    [caseRow.id, eventType, eventDate.toISOString(), JSON.stringify(details)]
  );

  const nextStage = stageFromEvent(eventType, caseRow.case_stage);
  if (nextStage !== caseRow.case_stage) {
    await query('UPDATE cases SET case_stage = $1 WHERE id = $2', [nextStage, caseRow.id]);
  }

  return res.status(201).json({ event: inserted.rows[0] });
}));

export default router;
