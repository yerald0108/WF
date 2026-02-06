// backend/src/models/index.js
// Exporta todos los modelos desde un solo lugar

const { sequelize } = require('../config/database');

// Importar modelos - IMPORTANTE: El orden importa para las relaciones
const User = require('./User');
const Address = require('./Address');
const Category = require('./Category');
const Product = require('./Product');
const Review = require('./Review');
const { Cart, CartItem } = require('./Cart');
const { Order, OrderItem, OrderStatusHistory } = require('./Order');

// ⚠️ NO DEFINIR RELACIONES AQUÍ
// Las relaciones ya están definidas en cada modelo individual
// Definirlas aquí causará conflictos y errores de "not associated"

// Exportar todos los modelos y la instancia de sequelize
module.exports = {
  sequelize,
  User,
  Address,
  Category,
  Product,
  Review,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory
};