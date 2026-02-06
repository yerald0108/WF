// backend/src/controllers/categories/handlers/categoryHandlers.js
const CategoryQueryService = require('../services/categoryQueryService');
const CategoryValidationService = require('../services/categoryValidationService');
const ResponseHelper = require('../../products/helpers/responseHelpers');
const QueryHelpers = require('../../products/helpers/queryHelpers');
const Category = require('../../../models/Category');

class CategoryHandlers {
  static async handleGetCategories(req, res) {
    const includeInactive = req.query.includeInactive === 'true';
    const includeSubcategories = req.query.includeSubcategories !== 'false';
    
    const categories = await CategoryQueryService.getCategoriesWithFilters({
      includeInactive,
      includeSubcategories
    });

    ResponseHelper.sendSuccess(res, { 
      count: categories.length, 
      data: categories 
    });
  }

  static async handleGetCategoryById(req, res) {
    const category = await CategoryQueryService.getCategoryByIdOrSlug(req.params.id);

    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    ResponseHelper.sendSuccess(res, { data: category });
  }

  static async handleGetCategoryProducts(req, res) {
    const validationErrors = CategoryValidationService.validateQueryParams(req.query);
    if (validationErrors.length > 0) {
      return ResponseHelper.sendValidationError(res, validationErrors, 'custom');
    }

    const category = await CategoryQueryService.getCategoryByIdOrSlug(req.params.id);

    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    const { page, limit, offset } = QueryHelpers.parsePagination(req.query);
    const { count, products } = await CategoryQueryService.getCategoryProducts(category.id, {
      page,
      limit,
      sortBy: req.query.sortBy,
      order: req.query.order
    });

    const paginationMetadata = QueryHelpers.buildPaginationMetadata(count, page, limit);

    ResponseHelper.sendSuccess(res, {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description
      },
      ...paginationMetadata,
      data: products
    });
  }

  static prepareCategoryData(body) {
    return {
      name: body.name,
      slug: body.slug,
      description: body.description,
      parent_id: body.parent_id,
      image: body.image,
      icon: body.icon,
      order: body.order || 0,
      meta_title: body.meta_title,
      meta_description: body.meta_description
    };
  }

  static async handleCreateCategory(req, res) {
    const categoryData = this.prepareCategoryData(req.body);
    const validationErrors = CategoryValidationService.validateCategoryData(categoryData);
    
    if (validationErrors.length > 0) {
      return ResponseHelper.sendValidationError(res, validationErrors, 'custom');
    }

    // Verificar si ya existe una categoría con ese nombre
    const existingCategory = await CategoryQueryService.checkCategoryExists(categoryData.name);
    
    if (existingCategory) {
      throw CategoryValidationService.createBusinessError(
        'CATEGORY_EXISTS', 
        'Ya existe una categoría con ese nombre'
      );
    }

    // Crear categoría
    const category = await Category.create(categoryData);

    ResponseHelper.sendCreated(res, 'Categoría creada exitosamente', { data: category });
  }

  static async handleUpdateCategory(req, res) {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      throw CategoryValidationService.createBusinessError(
        'CATEGORY_NOT_FOUND', 
        'Categoría no encontrada'
      );
    }

    const updates = req.body;
    const validationErrors = CategoryValidationService.validateCategoryData({
      ...category.toJSON(),
      ...updates
    });
    
    if (validationErrors.length > 0) {
      return ResponseHelper.sendValidationError(res, validationErrors, 'custom');
    }

    // Si se está cambiando el nombre, verificar que no exista
    if (updates.name && updates.name !== category.name) {
      const existingCategory = await CategoryQueryService.checkCategoryExists(updates.name, category.id);
      
      if (existingCategory) {
        throw CategoryValidationService.createBusinessError(
          'CATEGORY_EXISTS', 
          'Ya existe una categoría con ese nombre'
        );
      }
    }

    // Actualizar categoría
    await category.update(updates);

    ResponseHelper.sendSuccess(res, 'Categoría actualizada exitosamente', { data: category });
  }

  static async handleDeleteCategory(req, res) {
    const { category, productsCount } = await CategoryQueryService.getCategoryWithProductsCount(req.params.id);

    if (!category) {
      throw CategoryValidationService.createBusinessError(
        'CATEGORY_NOT_FOUND', 
        'Categoría no encontrada'
      );
    }

    const deletionErrors = CategoryValidationService.validateCategoryDeletion(productsCount);
    if (deletionErrors.length > 0) {
      return ResponseHelper.sendBusinessError(res, deletionErrors[0]);
    }

    // Soft delete: marcar como inactiva
    await category.update({ is_active: false });

    ResponseHelper.sendSuccess(res, 'Categoría eliminada exitosamente');
  }

  static async handleGetCategoryTree(req, res) {
    const categories = await CategoryQueryService.getCategoryTree();

    ResponseHelper.sendSuccess(res, { 
      count: categories.length, 
      data: categories 
    });
  }

  static async handleGetCategoryStats(req, res) {
    const stats = await CategoryQueryService.getCategoryStats();

    ResponseHelper.sendSuccess(res, { 
      data: stats 
    });
  }
}

module.exports = CategoryHandlers;