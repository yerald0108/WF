// backend/src/models/Order.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_number: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Número de orden único'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM(
      'pending',      // Pendiente de confirmación
      'confirmed',    // Confirmada
      'processing',   // En preparación
      'ready',        // Lista para entrega
      'shipped',      // Enviada
      'delivered',    // Entregada
      'cancelled',    // Cancelada
      'refunded'      // Reembolsada
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM(
      'pending',      // Pendiente
      'paid',         // Pagado
      'failed',       // Fallido
      'refunded',     // Reembolsado
      'partial'       // Pago parcial
    ),
    defaultValue: 'pending',
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM(
      'cash',         // Efectivo
      'transfer',     // Transferencia
      'card',         // Tarjeta
      'yappy',        // Yappy
      'nequi',        // Nequi
      'other'         // Otro
    ),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  // Información de envío
  shipping_address: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Dirección completa de envío'
  },
  delivery_type: {
    type: DataTypes.ENUM('delivery', 'pickup'),
    defaultValue: 'delivery',
    comment: 'Entrega a domicilio o recojo en tienda'
  },
  delivery_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha programada de entrega'
  },
  delivery_time_slot: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Horario de entrega: "08:00-12:00", "14:00-18:00"'
  },
  
  // Información de contacto
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Notas y referencias
  customer_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas del cliente'
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas internas del administrador'
  },
  
  // Información de pago
  payment_reference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Referencia de pago o transacción'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Seguimiento
  tracking_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Número de seguimiento del envío'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['order_number'], unique: true },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['delivery_date'] },
    { fields: ['createdAt'] }
  ]
});

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Order,
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  product_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre del producto al momento de la orden'
  },
  product_sku: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Precio unitario al momento de la orden'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'quantity * unit_price'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'subtotal - discount'
  }
}, {
  tableName: 'order_items',
  timestamps: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['product_id'] }
  ]
});

// Historial de cambios de estado
const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Order,
      key: 'id'
    }
  },
  previous_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  new_status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID del usuario que cambió el estado'
  }
}, {
  tableName: 'order_status_history',
  timestamps: true
});

// Relaciones
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory', onDelete: 'CASCADE' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id' });

// Hooks para Order
Order.beforeCreate(async (order) => {
  // Generar número de orden único
  if (!order.order_number) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    order.order_number = `ORD-${year}${month}-${timestamp}${random}`;
  }
});

Order.afterUpdate(async (order, options) => {
  // Registrar cambio de estado en el historial
  if (order.changed('status')) {
    const previousStatus = order._previousDataValues.status;
    await OrderStatusHistory.create({
      order_id: order.id,
      previous_status: previousStatus,
      new_status: order.status,
      changed_by: options.userId || null
    });
  }
});

// Métodos de instancia para Order
Order.prototype.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

Order.prototype.isDelivered = function() {
  return this.status === 'delivered';
};

Order.prototype.isPaid = function() {
  return this.payment_status === 'paid';
};

Order.prototype.getTotalItems = async function() {
  const items = await OrderItem.findAll({ 
    where: { order_id: this.id } 
  });
  return items.reduce((total, item) => total + item.quantity, 0);
};

module.exports = { Order, OrderItem, OrderStatusHistory };