// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
  getRecentOrders,
  searchOrders,
  updatePaymentStatus
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

// Validaciones
const orderValidation = [
  body('addressId')
    .if(body('deliveryType').equals('delivery'))
    .notEmpty().withMessage('La dirección es requerida para entregas a domicilio')
    .isInt().withMessage('ID de dirección inválido'),
  body('paymentMethod')
    .notEmpty().withMessage('El método de pago es requerido')
    .isIn(['cash', 'transfer', 'card', 'yappy', 'nequi', 'other'])
    .withMessage('Método de pago inválido'),
  body('deliveryType')
    .optional()
    .isIn(['delivery', 'pickup'])
    .withMessage('Tipo de entrega inválido'),
  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de entrega inválida'),
  body('deliveryTimeSlot')
    .optional()
    .isString()
];

// ============================================
// RUTAS DE USUARIO (requieren autenticación)
// ============================================

// @route   POST /api/orders
// @desc    Crear orden desde el carrito
router.post('/', protect, orderValidation, createOrder);

// @route   GET /api/orders
// @desc    Obtener mis órdenes
router.get('/', protect, getMyOrders);

// @route   GET /api/orders/:id
// @desc    Obtener orden específica
router.get('/:id', protect, getOrderById);

// @route   POST /api/orders/:id/cancel
// @desc    Cancelar orden
router.post('/:id/cancel', protect, cancelOrder);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

// @route   GET /api/orders/admin/stats
// @desc    Obtener estadísticas de órdenes
router.get('/admin/stats', protect, admin, getOrderStats);

// @route   GET /api/orders/admin/recent
// @desc    Obtener órdenes recientes
router.get('/admin/recent', protect, admin, getRecentOrders);

// @route   GET /api/orders/admin/search
// @desc    Buscar órdenes
router.get('/admin/search', protect, admin, searchOrders);

// @route   GET /api/orders/admin/all
// @desc    Obtener todas las órdenes
router.get('/admin/all', protect, admin, getAllOrders);

// @route   PUT /api/orders/:id/status
// @desc    Actualizar estado de orden
router.put('/:id/status', protect, admin, updateOrderStatus);

// @route   PUT /api/orders/:id/payment
// @desc    Actualizar estado de pago
router.put('/:id/payment', protect, admin, updatePaymentStatus);

module.exports = router;