// backend/src/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  validateCart,
  syncPrices,
  mergeCart,
  getCartCount
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Middleware opcional: permite acceso tanto a usuarios autenticados como invitados
const optionalAuth = (req, res, next) => {
  // Intentar autenticar, pero no fallar si no hay token
  const token = req.headers.authorization?.startsWith('Bearer') 
    ? req.headers.authorization.split(' ')[1] 
    : null;

  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
      
      User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash'] }
      }).then(user => {
        if (user) req.user = user;
        next();
      }).catch(() => next());
    } catch (error) {
      next();
    }
  } else {
    next();
  }
};

// ============================================
// RUTAS PÚBLICAS (con optional auth)
// ============================================

// @route   GET /api/cart/count
// @desc    Obtener conteo rápido de items
router.get('/count', optionalAuth, getCartCount);

// @route   GET /api/cart/validate
// @desc    Validar disponibilidad del carrito
router.get('/validate', optionalAuth, validateCart);

// @route   GET /api/cart
// @desc    Obtener carrito completo
router.get('/', optionalAuth, getCart);

// @route   POST /api/cart/items
// @desc    Agregar producto al carrito
router.post('/items', optionalAuth, addItem);

// @route   PUT /api/cart/items/:itemId
// @desc    Actualizar cantidad de un item
router.put('/items/:itemId', optionalAuth, updateItemQuantity);

// @route   DELETE /api/cart/items/:itemId
// @desc    Eliminar item del carrito
router.delete('/items/:itemId', optionalAuth, removeItem);

// @route   DELETE /api/cart
// @desc    Vaciar carrito
router.delete('/', optionalAuth, clearCart);

// @route   POST /api/cart/sync-prices
// @desc    Sincronizar precios con los actuales
router.post('/sync-prices', optionalAuth, syncPrices);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

// @route   POST /api/cart/merge
// @desc    Fusionar carrito de invitado al autenticarse
router.post('/merge', protect, mergeCart);

module.exports = router;