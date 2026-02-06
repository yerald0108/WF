// backend/src/models/Product.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Category = require('./Category');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  short_description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  compare_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Precio original antes de descuento'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Costo de adquisición'
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Código único del producto'
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Código de barras'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  min_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: 'Stock mínimo para alertas'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    comment: 'ID de la categoría principal'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre de categoría (texto plano como backup)'
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Marca del producto'
  },
  unit: {
    type: DataTypes.STRING,
    defaultValue: 'unidad',
    comment: 'Unidad de medida: unidad, metro, litro, kilo, etc.'
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Peso en kilogramos'
  },
  dimensions: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Dimensiones: {length, width, height} en cm',
    defaultValue: {}
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
    comment: 'Array de URLs de imágenes'
  },
  thumbnail: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Imagen principal/miniatura'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'Etiquetas para búsqueda'
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Características técnicas del producto'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si el producto está activo/visible'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Producto destacado en home'
  },
  requires_shipping: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si requiere envío'
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Porcentaje de impuesto'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Contador de vistas'
  },
  sales_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Contador de ventas'
  },
  rating_average: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    },
    get() {
      const value = this.getDataValue('rating_average');
      return parseFloat(value) || 0;
    }
  },
  rating_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  meta_title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'SEO: Título meta'
  },
  meta_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'SEO: Descripción meta'
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'URL amigable del producto'
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['brand'] },
    { fields: ['is_active'] },
    { fields: ['is_featured'] },
    { fields: ['price'] },
    { fields: ['slug'], unique: true },
    { fields: ['sku'], unique: true }
  ]
});

// ============================================
// RELACIONES (definir DESPUÉS del modelo)
// ============================================
Product.belongsTo(Category, { 
  foreignKey: 'category_id',
  as: 'categoryInfo'
});

Category.hasMany(Product, { 
  foreignKey: 'category_id',
  as: 'products'
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================
Product.prototype.isInStock = function() {
  return this.stock > 0;
};

Product.prototype.isLowStock = function() {
  return this.stock <= this.min_stock && this.stock > 0;
};

Product.prototype.hasDiscount = function() {
  return this.compare_price && this.compare_price > this.price;
};

Product.prototype.getDiscountPercentage = function() {
  if (!this.hasDiscount()) return 0;
  return Math.round(((this.compare_price - this.price) / this.compare_price) * 100);
};

// ============================================
// HOOKS
// ============================================
Product.beforeCreate(async (product) => {
  // Generar SKU automático si no existe
  if (!product.sku) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    product.sku = `PRD-${timestamp}-${random}`;
  }
  
  // Generar slug si no existe
  if (!product.slug) {
    let baseSlug = product.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Verificar que el slug sea único
    let slug = baseSlug;
    let counter = 1;
    let existingProduct = await Product.findOne({ where: { slug } });
    
    while (existingProduct) {
      slug = `${baseSlug}-${counter}`;
      existingProduct = await Product.findOne({ where: { slug } });
      counter++;
    }
    
    product.slug = slug;
  }
});

Product.beforeUpdate(async (product) => {
  // Si se cambia el nombre y no se proporciona un nuevo slug, regenerarlo
  if (product.changed('name') && !product.changed('slug')) {
    let baseSlug = product.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    let existingProduct = await Product.findOne({ 
      where: { 
        slug,
        id: { [require('sequelize').Op.ne]: product.id }
      } 
    });
    
    while (existingProduct) {
      slug = `${baseSlug}-${counter}`;
      existingProduct = await Product.findOne({ 
        where: { 
          slug,
          id: { [require('sequelize').Op.ne]: product.id }
        } 
      });
      counter++;
    }
    
    product.slug = slug;
  }
});

module.exports = Product;