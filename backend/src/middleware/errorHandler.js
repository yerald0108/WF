// backend/src/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);

  // Error de Sequelize - Validación
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      error: 'Error de validación',
      details: errors
    });
  }

  // Error de Sequelize - Unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Este registro ya existe'
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado'
    });
  }

  // Error genérico
  res.status(err.statusCode || 500).json({
    error: err.message || 'Error interno del servidor'
  });
};

module.exports = { errorHandler };