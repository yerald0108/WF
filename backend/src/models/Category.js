// backend/src/models/Category.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    comment: 'ID de categoría padre (para subcategorías)'
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nombre del ícono (ej: "wrench", "hammer")'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Orden de visualización'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  products_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Contador de productos en esta categoría'
  },
  meta_title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  meta_description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'categories',
  timestamps: true,
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['parent_id'] },
    { fields: ['is_active'] }
  ]
});

// Auto-relación para subcategorías
Category.hasMany(Category, { 
  as: 'subcategories', 
  foreignKey: 'parent_id' 
});
Category.belongsTo(Category, { 
  as: 'parent', 
  foreignKey: 'parent_id' 
});

// Hook para generar slug
Category.beforeCreate(async (category) => {
  if (!category.slug) {
    category.slug = category.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

module.exports = Category;