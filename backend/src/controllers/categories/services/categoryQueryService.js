// backend/src/controllers/categories/services/categoryQueryService.js
const { Op } = require('sequelize');
const Category = require('../../../models/Category');
const Product = require('../../../models/Product');

class CategoryQueryService {
  static async getCategoriesWithFilters(options = {}) {
    const {
      includeInactive = false,
      includeSubcategories = true,
      parentId = null
    } = options;

    const where = {};
    
    if (includeInactive !== true) {
      where.is_active = true;
    }

    if (parentId !== undefined) {
      where.parent_id = parentId;
    }

    const include = [];
    
    if (includeSubcategories === true) {
      include.push({
        model: Category,
        as: 'subcategories',
        where: { is_active: true },
        required: false
      });
    }

    return await Category.findAll({
      where,
      include,
      order: [
        ['order', 'ASC'],
        ['name', 'ASC']
      ]
    });
  }

  static async getCategoryByIdOrSlug(identifier) {
    const where = isNaN(identifier) 
      ? { slug: identifier, is_active: true } 
      : { id: parseInt(identifier), is_active: true };

    return await Category.findOne({
      where,
      include: [
        {
          model: Category,
          as: 'subcategories',
          where: { is_active: true },
          required: false
        },
        {
          model: Category,
          as: 'parent',
          required: false
        }
      ]
    });
  }

  static async getCategoryProducts(categoryId, options = {}) {
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      order = 'DESC'
    } = options;

    const validSortFields = ['price', 'createdAt', 'name', 'sales_count', 'rating_average'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: products } = await Product.findAndCountAll({
      where: { 
        category_id: categoryId,
        is_active: true 
      },
      limit: parseInt(limit),
      offset,
      order: [[sortField, sortOrder]]
    });

    return { count, products };
  }

  static async getCategoryTree() {
    return await Category.findAll({
      where: { 
        parent_id: null,
        is_active: true 
      },
      include: [{
        model: Category,
        as: 'subcategories',
        where: { is_active: true },
        required: false,
        separate: true,
        order: [['order', 'ASC'], ['name', 'ASC']]
      }],
      order: [['order', 'ASC'], ['name', 'ASC']]
    });
  }

  static async getCategoryStats() {
    const categories = await Category.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'products_count'],
      order: [['products_count', 'DESC']],
      limit: 10
    });

    const totalCategories = await Category.count({ 
      where: { is_active: true } 
    });
    
    const emptyCategories = await Category.count({ 
      where: { 
        is_active: true,
        products_count: 0 
      } 
    });

    return {
      total: totalCategories,
      withProducts: totalCategories - emptyCategories,
      empty: emptyCategories,
      topCategories: categories
    };
  }

  static async checkCategoryExists(name, excludeId = null) {
    const where = { name };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    return await Category.findOne({ where });
  }

  static async getCategoryWithProductsCount(categoryId) {
    const productsCount = await Product.count({ 
      where: { category_id: categoryId } 
    });
    
    const category = await Category.findByPk(categoryId);
    
    return { category, productsCount };
  }
}

module.exports = CategoryQueryService;