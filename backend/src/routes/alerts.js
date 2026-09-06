import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403, staffOnly } from '../middleware/auth.js';
import { asAlertStatus, parseId } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  let result;
  if (req.user.role === 'citizen') {
    result = await query(
      'SELECT * FROM alerts WHERE citizen_id = $1 ORDER BY created_at DESC',
      [req.user.citizen_id]
    );
  } else {
    result = await query('SELECT * FROM alerts ORDER BY created_at DESC');
  }
  return res.json({ alerts: result.rows });
}));

router.patch('/:id', authenticate, staffOnly, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'id');
  const status = asAlertStatus(req.body.status);
  const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
  const result = await query(
    `UPDATE alerts
     SET status = $1, resolved_at = $2
     WHERE id = $3
     RETURNING *`,
    [status, resolvedAt, id]
  );
  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  return res.json({ alert: result.rows[0] });
}));

export default router;
