// backend/src/controllers/orderController.js
const OrderService = require('../services/orderService');
const { validationResult } = require('express-validator');

/**
 * @desc    Crear orden desde el carrito
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const orderData = req.body;

    const order = await OrderService.createOrderFromCart(userId, orderData);

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      data: order
    });
  } catch (error) {
    console.error('Error creando orden:', error);
    
    if (error.message.includes('carrito está vacío') ||
        error.message.includes('Stock insuficiente') ||
        error.message.includes('Dirección') ||
        error.message.includes('inválido')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear la orden'
    });
  }
};

/**
 * @desc    Obtener órdenes del usuario actual
 * @route   GET /api/orders
 * @access  Private
 */
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, status, startDate, endDate } = req.query;

    const result = await OrderService.getUserOrders(userId, {
      page,
      limit,
      status,
      startDate,
      endDate
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las órdenes'
    });
  }
};

/**
 * @desc    Obtener orden específica por ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(parseInt(id));

    // Verificar que la orden pertenece al usuario (o es admin)
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver esta orden'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error obteniendo orden:', error);
    
    if (error.message === 'Orden no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al obtener la orden'
    });
  }
};

/**
 * @desc    Cancelar orden
 * @route   POST /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await OrderService.cancelOrder(
      parseInt(id),
      req.user.id,
      reason || 'Cancelado por el usuario'
    );

    res.json({
      success: true,
      message: 'Orden cancelada exitosamente',
      data: order
    });
  } catch (error) {
    console.error('Error cancelando orden:', error);
    
    if (error.message.includes('no encontrada') ||
        error.message.includes('permiso') ||
        error.message.includes('no puede ser cancelada')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al cancelar la orden'
    });
  }
};

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

/**
 * @desc    Obtener todas las órdenes (admin)
 * @route   GET /api/orders/admin/all
 * @access  Private/Admin
 */
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const where = {};
    
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (page - 1) * limit;

    const { Order, OrderItem } = require('../models/Order');
    const User = require('../models/User');
    const { Op } = require('sequelize');

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: OrderItem,
          as: 'items'
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error obteniendo todas las órdenes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las órdenes'
    });
  }
};

/**
 * @desc    Actualizar estado de orden (admin)
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, trackingNumber } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'El estado es requerido'
      });
    }

    const order = await OrderService.updateOrderStatus(
      parseInt(id),
      status,
      {
        userId: req.user.id,
        notes,
        trackingNumber
      }
    );

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: order
    });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    
    if (error.message.includes('no encontrada') ||
        error.message.includes('No se puede cambiar')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar el estado'
    });
  }
};

/**
 * @desc    Obtener estadísticas de órdenes (admin)
 * @route   GET /api/orders/admin/stats
 * @access  Private/Admin
 */
const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await OrderService.getOrderStats({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

/**
 * @desc    Obtener órdenes recientes (admin)
 * @route   GET /api/orders/admin/recent
 * @access  Private/Admin
 */
const getRecentOrders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const orders = await OrderService.getRecentOrders(parseInt(limit));

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error obteniendo órdenes recientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener órdenes recientes'
    });
  }
};

/**
 * @desc    Buscar órdenes (admin)
 * @route   GET /api/orders/admin/search
 * @access  Private/Admin
 */
const searchOrders = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const orders = await OrderService.searchOrders(searchTerm);

    res.json({
      success: true,
      count: orders.length,
      searchTerm,
      data: orders
    });
  } catch (error) {
    console.error('Error buscando órdenes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar órdenes'
    });
  }
};

/**
 * @desc    Actualizar información de pago (admin)
 * @route   PUT /api/orders/:id/payment
 * @access  Private/Admin
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentReference } = req.body;

    const { Order } = require('../models/Order');
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    const updates = {};
    if (paymentStatus) updates.payment_status = paymentStatus;
    if (paymentReference) updates.payment_reference = paymentReference;
    if (paymentStatus === 'paid') updates.paid_at = new Date();

    await order.update(updates);

    res.json({
      success: true,
      message: 'Estado de pago actualizado',
      data: order
    });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado de pago'
    });
  }
};

module.exports = {
  // Rutas de usuario
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,

  // Rutas de administración
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
  getRecentOrders,
  searchOrders,
  updatePaymentStatus
};