// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener token del header
      token = req.headers.authorization.split(' ')[1];
      
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Obtener usuario del token (sin password)
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash'] }
      });
      
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Usuario no encontrado' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      return res.status(401).json({ 
        error: 'No autorizado, token fallido' 
      });
    }
  }
  
  if (!token) {
    return res.status(401).json({ 
      error: 'No autorizado, no hay token' 
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      error: 'No autorizado como administrador' 
    });
  }
};

const verified = (req, res, next) => {
  if (req.user && req.user.email_verified) {
    next();
  } else {
    return res.status(403).json({ 
      error: 'Por favor verifica tu email primero' 
    });
  }
};

module.exports = { protect, admin, verified };