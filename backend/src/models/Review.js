// backend/src/models/Review.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Calificación de 1 a 5 estrellas'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Título de la reseña'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comentario detallado'
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
    comment: 'Imágenes adjuntas a la reseña'
  },
  verified_purchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si es una compra verificada'
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si la reseña fue aprobada por admin'
  },
  helpful_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Contador de "útil"'
  },
  reported_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Contador de reportes'
  },
  admin_response: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Respuesta del administrador'
  },
  admin_response_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['user_id'] },
    { fields: ['rating'] },
    { fields: ['is_approved'] },
    { fields: ['verified_purchase'] }
  ]
});

// Relaciones
Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id' });

// Hook para actualizar rating del producto
Review.afterCreate(async (review) => {
  await updateProductRating(review.product_id);
});

Review.afterUpdate(async (review) => {
  await updateProductRating(review.product_id);
});

Review.afterDestroy(async (review) => {
  await updateProductRating(review.product_id);
});

async function updateProductRating(productId) {
  const reviews = await Review.findAll({
    where: { 
      product_id: productId,
      is_approved: true 
    }
  });
  
  if (reviews.length === 0) {
    await Product.update(
      { 
        rating_average: 0,
        rating_count: 0 
      },
      { where: { id: productId } }
    );
    return;
  }
  
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = totalRating / reviews.length;
  
  await Product.update(
    { 
      rating_average: average.toFixed(2),
      rating_count: reviews.length 
    },
    { where: { id: productId } }
  );
}

module.exports = Review;