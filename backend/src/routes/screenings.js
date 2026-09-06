import { Router } from 'express';
import { query } from '../db.js';
import { AppError, asyncHandler } from '../errors.js';
import { authenticate, loadCaseOr403, loadCitizenOr403 } from '../middleware/auth.js';
import { asJsonObject, optionalId, parseId, requireFields } from '../middleware/validate.js';

const router = Router();

router.post('/', authenticate, asyncHandler(async (req, res) => {
  requireFields(req.body, ['screening_type']);
  const citizenId = req.user.role === 'citizen'
    ? req.user.citizen_id
    : parseId(req.body.citizen_id, 'citizen_id');
  if (!citizenId) {
    throw new AppError(400, 'citizen_id is required');
  }
  await loadCitizenOr403(req, citizenId);

  const caseId = optionalId(req.body.case_id, 'case_id');
  if (caseId) {
    const caseRow = await loadCaseOr403(req, caseId);
    if (caseRow.citizen_id !== citizenId) {
      throw new AppError(400, 'case_id does not belong to this citizen');
    }
  }

  const score = req.body.score === undefined || req.body.score === null ? null : Number(req.body.score);
  if (score !== null && !Number.isFinite(score)) {
    throw new AppError(400, 'score must be numeric');
  }

  const result = await query(
    `INSERT INTO screenings (citizen_id, case_id, screening_type, responses_json, score)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING *`,
    [citizenId, caseId, String(req.body.screening_type), JSON.stringify(asJsonObject(req.body.responses_json, 'responses_json')), score]
  );
  return res.status(201).json({ screening: result.rows[0] });
}));

export default router;
