function errorHandler(err, req, res, _next) {
  if (err && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  console.error('ERROR NO OPERACIONAL:', err);
  const debug = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(debug && { debug: err.message, stack: err.stack?.split('\n').slice(0, 5) }),
    },
  });
}

module.exports = errorHandler;
