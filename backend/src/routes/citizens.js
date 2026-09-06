import { Router } from 'express';
import { asyncHandler } from '../errors.js';
import { authenticate, loadCitizenOr403 } from '../middleware/auth.js';
import { parseId } from '../middleware/validate.js';

const router = Router();

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const citizen = await loadCitizenOr403(req, parseId(req.params.id, 'id'));
  return res.json({ citizen });
}));

export default router;
