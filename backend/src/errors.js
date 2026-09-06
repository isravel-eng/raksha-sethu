export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record was not found' });
  }

  if (err.code === '22P02' || err.code === '23514') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
