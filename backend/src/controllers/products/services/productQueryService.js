// backend/src/controllers/products/services/productQueryService.js
const { Op } = require('sequelize');
const Product = require('../../../models/Product');
const Category = require('../../../models/Category');
const Review = require('../../../models/Review');

class ProductQueryService {
  static async getProductsWithFilters(whereClause, options) {
    const { limit = 12, offset = 0, sortBy = 'createdAt', order = 'DESC' } = options;

    const validSortFields = ['price', 'createdAt', 'name', 'stock', 'sales_count', 'rating_average', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortField, sortOrder]],
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'slug'],
        required: false
      }]
    });

    return { count, products: rows };
  }

  static async getProductByIdOrSlug(identifier) {
    const where = isNaN(identifier) 
      ? { slug: identifier, is_active: true } 
      : { id: parseInt(identifier), is_active: true };

    return await Product.findOne({
      where,
      include: [
        {
          model: Category,
          as: 'categoryInfo',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Review,
          as: 'reviews',
          where: { is_approved: true },
          required: false,
          limit: 5,
          order: [['createdAt', 'DESC']],
          include: [{
            model: require('../../../models/User'),
            attributes: ['id', 'first_name', 'last_name']
          }]
        }
      ]
    });
  }

  static async checkSkuExists(sku, excludeId = null) {
    const where = { sku };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    return await Product.findOne({ where });
  }

  static async getRelatedProducts(product, limit = 4) {
    return await Product.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { category: product.category },
          { brand: product.brand },
          { tags: { [Op.overlap]: product.tags } }
        ],
        id: { [Op.ne]: product.id }
      },
      limit: parseInt(limit),
      order: [['sales_count', 'DESC']],
      attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'rating_average', 'brand']
    });
  }

  static async getBestSellers(options) {
    const { limit = 10, category } = options;
    const where = { 
      is_active: true,
      sales_count: { [Op.gt]: 0 }
    };

    if (category) {
      where.category = category;
    }

    return await Product.findAll({
      where,
      limit: parseInt(limit),
      order: [['sales_count', 'DESC']],
      attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'rating_average', 'sales_count']
    });
  }
}

module.exports = ProductQueryService;