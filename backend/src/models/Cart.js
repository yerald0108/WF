// backend/src/models/Cart.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'Usuario dueño del carrito (null para invitados)'
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID de sesión para usuarios no autenticados'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'abandoned'),
    defaultValue: 'active'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de expiración del carrito'
  }
}, {
  tableName: 'carts',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'] },
    { fields: ['status'] }
  ]
});

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cart_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Cart,
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Precio al momento de agregar al carrito'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Descuento aplicado'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas especiales del producto'
  }
}, {
  tableName: 'cart_items',
  timestamps: true,
  indexes: [
    { fields: ['cart_id'] },
    { fields: ['product_id'] }
  ]
});

// Relaciones
User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'user_id' });

Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });

Product.hasMany(CartItem, { foreignKey: 'product_id' });
CartItem.belongsTo(Product, { foreignKey: 'product_id' });

// Métodos de instancia para Cart
Cart.prototype.getSubtotal = async function() {
  const items = await CartItem.findAll({ 
    where: { cart_id: this.id },
    include: [{ model: Product }]
  });
  
  return items.reduce((total, item) => {
    return total + (parseFloat(item.price) * item.quantity);
  }, 0);
};

Cart.prototype.getDiscount = async function() {
  const items = await CartItem.findAll({ 
    where: { cart_id: this.id } 
  });
  
  return items.reduce((total, item) => {
    return total + (parseFloat(item.discount) * item.quantity);
  }, 0);
};

Cart.prototype.getTotal = async function() {
  const subtotal = await this.getSubtotal();
  const discount = await this.getDiscount();
  return subtotal - discount;
};

Cart.prototype.getItemCount = async function() {
  const items = await CartItem.findAll({ 
    where: { cart_id: this.id } 
  });
  
  return items.reduce((total, item) => total + item.quantity, 0);
};

Cart.prototype.isEmpty = async function() {
  const count = await CartItem.count({ 
    where: { cart_id: this.id } 
  });
  return count === 0;
};

module.exports = { Cart, CartItem };