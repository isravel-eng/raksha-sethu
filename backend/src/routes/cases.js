import { Router } from 'express';
import { query } from '../db.js';
import { AppError, asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403, loadCitizenOr403 } from '../middleware/auth.js';
import { asCaseStage, parseId, requireFields } from '../middleware/validate.js';

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
