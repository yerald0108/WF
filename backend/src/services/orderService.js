// backend/src/services/orderService.js
const { Order, OrderItem, OrderStatusHistory } = require('../models/Order');
const { Cart, CartItem } = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const Address = require('../models/Address');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const CartService = require('./cartService');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('./emailService');
const { 
  generateOrderNumber, 
  isValidStatusTransition, 
  getStatusMessage, 
  getPaymentMethodLabel 
} = require('../utils/orderHelpers');

class OrderService {
  /**
   * Crear orden desde el carrito
   * @param {number} userId - ID del usuario
   * @param {Object} orderData - Datos de la orden
   * @returns {Object} - Orden creada
   */
  static async createOrderFromCart(userId, orderData) {
    const transaction = await sequelize.transaction();

    try {
      const {
        addressId,
        paymentMethod,
        deliveryType = 'delivery',
        deliveryDate,
        deliveryTimeSlot,
        customerNotes
      } = orderData;

      // 1. Obtener carrito del usuario
      const cart = await CartService.getOrCreateCart(userId);
      
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // 2. Validar carrito
      const validation = await CartService.validateCart(cart.id);
      if (!validation.valid) {
        throw new Error(`Carrito inválido: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 3. Obtener información del usuario
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // 4. Obtener dirección de envío
      let shippingAddress;
      if (deliveryType === 'delivery') {
        const address = await Address.findOne({
          where: { 
            id: addressId,
            user_id: userId 
          }
        });

        if (!address) {
          throw new Error('Dirección de envío no encontrada');
        }

        shippingAddress = {
          street: address.street,
          city: address.city,
          province: address.province,
          references: address.references
        };
      } else {
        // Pickup en tienda
        shippingAddress = {
          street: 'Recogida en tienda',
          city: 'Por definir',
          province: 'Por definir',
          references: 'Cliente recogerá en tienda'
        };
      }

      // 5. Calcular totales
      const totals = await CartService.calculateTotals(cart.id);

      // 6. GENERAR NÚMERO DE ORDEN (CRÍTICO)
      const orderNumber = generateOrderNumber();
      console.log('🔢 Número de orden generado:', orderNumber);

      // 7. Crear orden CON el número de orden
      const order = await Order.create({
        order_number: orderNumber, // ⭐ EXPLÍCITAMENTE ASIGNADO
        user_id: userId,
        status: 'pending',
        payment_status: 'pending',
        payment_method: paymentMethod,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping_cost: deliveryType === 'delivery' ? 5.00 : 0,
        tax: 0,
        total: totals.total + (deliveryType === 'delivery' ? 5.00 : 0),
        shipping_address: shippingAddress,
        delivery_type: deliveryType,
        delivery_date: deliveryDate || null,
        delivery_time_slot: deliveryTimeSlot || null,
        customer_name: `${user.first_name} ${user.last_name}`,
        customer_email: user.email,
        customer_phone: user.phone,
        customer_notes: customerNotes || null
      }, { transaction });

      console.log('✅ Orden creada con ID:', order.id, 'y número:', order.order_number);

      // 8. Crear items de la orden
      const items = await CartItem.findAll({
        where: { cart_id: cart.id },
        include: [{ model: Product }]
      });

      for (const cartItem of items) {
        const product = cartItem.Product;

        // Verificar stock nuevamente
        if (product.stock < cartItem.quantity) {
          throw new Error(`Stock insuficiente para ${product.name}`);
        }

        // Crear item de orden
        await OrderItem.create({
          order_id: order.id,
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: cartItem.quantity,
          unit_price: parseFloat(cartItem.price),
          discount: parseFloat(cartItem.discount),
          subtotal: parseFloat(cartItem.price) * cartItem.quantity,
          total: (parseFloat(cartItem.price) - parseFloat(cartItem.discount)) * cartItem.quantity
        }, { transaction });

        // Reducir stock
        await product.decrement('stock', { 
          by: cartItem.quantity,
          transaction 
        });

        // Incrementar contador de ventas
        await product.increment('sales_count', { 
          by: cartItem.quantity,
          transaction 
        });
      }

      // 9. Marcar carrito como completado
      await cart.update({ status: 'completed' }, { transaction });

      // 10. Commit transaction
      await transaction.commit();

      // 11. Obtener orden completa con items
      const completeOrder = await this.getOrderById(order.id);

      // 12. Enviar email de confirmación
      try {
        await sendOrderConfirmationEmail(user.email, {
          orderNumber: order.order_number,
          userName: `${user.first_name} ${user.last_name}`,
          total: order.total,
          items: completeOrder.items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
          })),
          shippingAddress: order.shipping_address,
          paymentMethod: getPaymentMethodLabel(order.payment_method)
        });
      } catch (emailError) {
        console.error('Error enviando email de confirmación:', emailError);
        // No fallar la orden si el email falla
      }

      return completeOrder;
    } catch (error) {
      await transaction.rollback();
      console.error('Error creando orden:', error);
      throw error;
    }
  }

  /**
   * Obtener orden por ID
   */
  static async getOrderById(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            attributes: ['id', 'name', 'slug', 'thumbnail']
          }]
        },
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: OrderStatusHistory,
          as: 'statusHistory',
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    return order;
  }

  /**
   * Obtener órdenes de un usuario
   */
  static async getUserOrders(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate
    } = options;

    const where = { user_id: userId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          attributes: ['id', 'name', 'slug', 'thumbnail']
        }]
      }]
    });

    const totalPages = Math.ceil(count / limit);

    return {
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Actualizar estado de una orden
   */
  static async updateOrderStatus(orderId, newStatus, options = {}) {
    const { userId, notes, trackingNumber } = options;

    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new Error('Orden no encontrada');
    }

    const previousStatus = order.status;

    // Validar transición de estado
    if (!isValidStatusTransition(previousStatus, newStatus)) {
      throw new Error(`No se puede cambiar de ${previousStatus} a ${newStatus}`);
    }

    // Actualizar estado
    const updates = { status: newStatus };

    // Campos adicionales según el nuevo estado
    if (newStatus === 'cancelled') {
      updates.cancelled_at = new Date();
      updates.cancellation_reason = notes || 'Cancelado por usuario';
      
      // Restaurar stock
      await this.restoreOrderStock(orderId);
    }

    if (newStatus === 'delivered') {
      updates.completed_at = new Date();
      updates.payment_status = 'paid';
    }

    if (newStatus === 'shipped' && trackingNumber) {
      updates.tracking_number = trackingNumber;
    }

    await order.update(updates);

    // Registrar en historial
    await OrderStatusHistory.create({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      notes,
      changed_by: userId
    });

    // Enviar email de actualización
    try {
      const user = await User.findByPk(order.user_id);
      if (user) {
        await sendOrderStatusUpdateEmail(user.email, {
          orderNumber: order.order_number,
          userName: `${user.first_name} ${user.last_name}`,
          status: newStatus,
          statusMessage: getStatusMessage(newStatus),
          trackingNumber: order.tracking_number
        });
      }
    } catch (emailError) {
      console.error('Error enviando email de actualización:', emailError);
    }

    return await this.getOrderById(orderId);
  }

  /**
   * Restaurar stock de una orden cancelada
   */
  static async restoreOrderStock(orderId) {
    const items = await OrderItem.findAll({
      where: { order_id: orderId }
    });

    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (product) {
        await product.increment('stock', { by: item.quantity });
        await product.decrement('sales_count', { by: item.quantity });
      }
    }
  }

  /**
   * Cancelar orden
   */
  static async cancelOrder(orderId, userId, reason) {
    const order = await Order.findByPk(orderId);

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    // Verificar permisos
    const user = await User.findByPk(userId);
    if (order.user_id !== userId && user.role !== 'admin') {
      throw new Error('No tienes permiso para cancelar esta orden');
    }

    // Verificar si puede cancelarse
    if (!order.canBeCancelled()) {
      throw new Error('Esta orden no puede ser cancelada en su estado actual');
    }

    return await this.updateOrderStatus(orderId, 'cancelled', {
      userId,
      notes: reason
    });
  }

  /**
   * Obtener estadísticas de órdenes (admin)
   */
  static async getOrderStats(options = {}) {
    const { startDate, endDate } = options;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const totalOrders = await Order.count({ where });

    const ordersByStatus = await Order.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total_amount']
      ],
      group: ['status']
    });

    const revenue = await Order.sum('total', {
      where: {
        ...where,
        payment_status: 'paid'
      }
    });

    const avgOrderValue = await Order.findOne({
      where,
      attributes: [
        [sequelize.fn('AVG', sequelize.col('total')), 'average']
      ]
    });

    const topProducts = await OrderItem.findAll({
      attributes: [
        'product_id',
        'product_name',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      group: ['product_id', 'product_name'],
      order: [[sequelize.literal('total_sold'), 'DESC']],
      limit: 10
    });

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: parseInt(item.dataValues.count),
        totalAmount: parseFloat(item.dataValues.total_amount || 0)
      })),
      revenue: parseFloat(revenue || 0),
      averageOrderValue: parseFloat(avgOrderValue?.dataValues?.average || 0),
      topProducts: topProducts.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        totalSold: parseInt(item.dataValues.total_sold),
        revenue: parseFloat(item.dataValues.revenue)
      }))
    };
  }

  /**
   * Obtener órdenes recientes (admin)
   */
  static async getRecentOrders(limit = 10) {
    return await Order.findAll({
      limit,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: OrderItem,
          as: 'items'
        }
      ]
    });
  }

  /**
   * Buscar órdenes (admin)
   */
  static async searchOrders(searchTerm) {
    return await Order.findAll({
      where: {
        [Op.or]: [
          { order_number: { [Op.iLike]: `%${searchTerm}%` } },
          { customer_name: { [Op.iLike]: `%${searchTerm}%` } },
          { customer_email: { [Op.iLike]: `%${searchTerm}%` } },
          { customer_phone: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      limit: 20,
      order: [['createdAt', 'DESC']],
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });
  }
}

module.exports = OrderService;