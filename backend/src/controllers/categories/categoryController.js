// backend/src/controllers/categories/categoryController.js
const CategoryHandlers = require('./handlers/categoryHandlers');
const ProductHandlers = require('./handlers/productHandlers');
const ResponseHelper = require('../products/helpers/responseHelpers');
const ErrorHandlers = require('../products/helpers/errorHandlers');
const CategoryFilterService = require('./services/categoryFilterService');
const { Op } = require('sequelize');
const Category = require('../../models/Category');

module.exports = {
  // Categorías principales
  getCategories: ErrorHandlers.wrapAsync(CategoryHandlers.handleGetCategories),
  getCategoryById: ErrorHandlers.wrapAsync(CategoryHandlers.handleGetCategoryById),
  getCategoryProducts: ErrorHandlers.wrapAsync(ProductHandlers.handleGetCategoryProducts),
  createCategory: ErrorHandlers.wrapAsync(CategoryHandlers.handleCreateCategory),
  updateCategory: ErrorHandlers.wrapAsync(CategoryHandlers.handleUpdateCategory),
  deleteCategory: ErrorHandlers.wrapAsync(CategoryHandlers.handleDeleteCategory),
  
  // Consultas especializadas
  getCategoryTree: ErrorHandlers.wrapAsync(CategoryHandlers.handleGetCategoryTree),
  getCategoryStats: ErrorHandlers.wrapAsync(CategoryHandlers.handleGetCategoryStats),

  // Métodos adicionales para productos de categoría
  getCategoryProductsWithSubcategories: ErrorHandlers.wrapAsync(
    ProductHandlers.handleGetCategoryProductsWithSubcategories
  ),
  
  getPopularCategoryProducts: ErrorHandlers.wrapAsync(
    ProductHandlers.handleGetPopularCategoryProducts
  ),

  // Método adicional: Obtener subcategorías de una categoría específica
  getSubcategories: ErrorHandlers.wrapAsync(async (req, res) => {
    const category = await Category.findOne({
      where: isNaN(req.params.id) 
        ? { slug: req.params.id, is_active: true } 
        : { id: parseInt(req.params.id), is_active: true }
    });
    
    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    const subcategories = await Category.findAll({
      where: { 
        parent_id: category.id,
        is_active: true 
      },
      order: [
        ['order', 'ASC'],
        ['name', 'ASC']
      ]
    });

    ResponseHelper.sendSuccess(res, { 
      count: subcategories.length, 
      data: subcategories,
      parentCategory: {
        id: category.id,
        name: category.name,
        slug: category.slug
      }
    });
  }),

  // Método adicional: Buscar categorías
  searchCategories: ErrorHandlers.wrapAsync(async (req, res) => {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return ResponseHelper.sendBadRequest(res, 'El término de búsqueda debe tener al menos 2 caracteres');
    }

    const categories = await Category.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } },
          { slug: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      limit: 20,
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'slug', 'description', 'products_count', 'parent_id']
    });

    ResponseHelper.sendSuccess(res, { 
      count: categories.length, 
      searchTerm,
      data: categories 
    });
  }),

  // Método adicional: Obtener breadcrumb de categoría
  getCategoryBreadcrumb: ErrorHandlers.wrapAsync(async (req, res) => {
    const category = await Category.findOne({
      where: isNaN(req.params.id) 
        ? { slug: req.params.id, is_active: true } 
        : { id: parseInt(req.params.id), is_active: true }
    });
    
    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    const breadcrumb = await CategoryFilterService.getCategoryBreadcrumb(category.id);

    ResponseHelper.sendSuccess(res, { 
      data: breadcrumb,
      currentCategory: {
        id: category.id,
        name: category.name,
        slug: category.slug
      }
    });
  }),

  // Método adicional: Obtener categorías principales (sin padre)
  getMainCategories: ErrorHandlers.wrapAsync(async (req, res) => {
    const categories = await Category.findAll({
      where: { 
        parent_id: null,
        is_active: true 
      },
      order: [
        ['order', 'ASC'],
        ['name', 'ASC']
      ],
      attributes: ['id', 'name', 'slug', 'description', 'image', 'icon', 'products_count']
    });

    ResponseHelper.sendSuccess(res, { 
      count: categories.length, 
      data: categories 
    });
  }),

  // Método adicional: Obtener categorías con filtros avanzados
  getFilteredCategories: ErrorHandlers.wrapAsync(async (req, res) => {
    const whereClause = CategoryFilterService.buildWhereClause(req.query);
    const order = CategoryFilterService.buildOrderOptions(req.query);
    const include = CategoryFilterService.buildIncludeOptions(req.query);
    const { page, limit, offset } = CategoryFilterService.parsePaginationParams(req.query);

    const { count, rows: categories } = await Category.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order,
      include,
      distinct: true
    });

    const paginationMetadata = CategoryFilterService.buildPaginationMetadata(count, page, limit);

    ResponseHelper.sendSuccess(res, {
      ...paginationMetadata,
      data: categories
    });
  }),

  // Método adicional: Activar/desactivar categoría
  toggleCategoryStatus: ErrorHandlers.wrapAsync(async (req, res) => {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    const newStatus = !category.is_active;
    await category.update({ is_active: newStatus });

    // Si se está desactivando, también desactivar subcategorías
    if (!newStatus) {
      await Category.update(
        { is_active: false },
        { where: { parent_id: category.id } }
      );
    }

    ResponseHelper.sendSuccess(res, `Categoría ${newStatus ? 'activada' : 'desactivada'} exitosamente`, {
      data: {
        id: category.id,
        name: category.name,
        is_active: newStatus
      }
    });
  }),

  // Método adicional: Reordenar categorías
  reorderCategories: ErrorHandlers.wrapAsync(async (req, res) => {
    const { orderList } = req.body;

    if (!Array.isArray(orderList)) {
      return ResponseHelper.sendBadRequest(res, 'La lista de orden es requerida');
    }

    const updatePromises = orderList.map(item => 
      Category.update({ order: item.order }, { where: { id: item.id } })
    );

    await Promise.all(updatePromises);

    ResponseHelper.sendSuccess(res, 'Categorías reordenadas exitosamente');
  })
};