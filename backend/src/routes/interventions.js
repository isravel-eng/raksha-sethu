import { Router } from 'express';
import { query } from '../db.js';
import { AppError, asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403, staffOnly } from '../middleware/auth.js';
import { parseId, requireFields } from '../middleware/validate.js';

const router = Router();

router.post('/', authenticate, staffOnly, asyncHandler(async (req, res) => {
  requireFields(req.body, ['case_id', 'action']);
  const caseRow = await loadCaseOr403(req, req.body.case_id);
  const alertId = req.body.alert_id == null ? null : parseId(req.body.alert_id, 'alert_id');

  if (alertId) {
    const alert = await query('SELECT id, case_id FROM alerts WHERE id = $1', [alertId]);
    if (!alert.rows[0] || alert.rows[0].case_id !== caseRow.id) {
      throw new AppError(400, 'alert_id does not belong to this case');
    }
  }

  const result = await query(
    `INSERT INTO interventions (citizen_id, case_id, alert_id, counsellor_id, action, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [caseRow.citizen_id, caseRow.id, alertId, req.user.id, String(req.body.action), req.body.notes || null]
  );
  return res.status(201).json({ intervention: result.rows[0] });
}));

export default router;
