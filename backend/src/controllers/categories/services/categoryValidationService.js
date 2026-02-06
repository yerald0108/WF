// backend/src/controllers/categories/services/categoryValidationService.js
class CategoryValidationService {
  static validateCategoryData(categoryData) {
    const errors = [];

    if (!categoryData.name || categoryData.name.trim().length < 2) {
      errors.push({
        field: 'name',
        message: 'El nombre debe tener al menos 2 caracteres'
      });
    }

    if (categoryData.slug && categoryData.slug.length < 2) {
      errors.push({
        field: 'slug',
        message: 'El slug debe tener al menos 2 caracteres'
      });
    }

    if (categoryData.parent_id && isNaN(categoryData.parent_id)) {
      errors.push({
        field: 'parent_id',
        message: 'El ID del padre debe ser un número válido'
      });
    }

    if (categoryData.order && (isNaN(categoryData.order) || parseInt(categoryData.order) < 0)) {
      errors.push({
        field: 'order',
        message: 'El orden debe ser un número positivo'
      });
    }

    return errors;
  }

  static validateCategoryDeletion(productsCount) {
    const errors = [];

    if (productsCount > 0) {
      errors.push({
        code: 'HAS_PRODUCTS',
        message: `No se puede eliminar. La categoría tiene ${productsCount} producto(s) asociado(s)`
      });
    }

    return errors;
  }

  static validateQueryParams(queryParams) {
    const errors = [];

    if (queryParams.page && (isNaN(queryParams.page) || parseInt(queryParams.page) < 1)) {
      errors.push({
        field: 'page',
        message: 'La página debe ser un número mayor a 0'
      });
    }

    if (queryParams.limit && (isNaN(queryParams.limit) || parseInt(queryParams.limit) < 1 || parseInt(queryParams.limit) > 100)) {
      errors.push({
        field: 'limit',
        message: 'El límite debe ser un número entre 1 y 100'
      });
    }

    const validSortFields = ['price', 'createdAt', 'name', 'sales_count', 'rating_average'];
    if (queryParams.sortBy && !validSortFields.includes(queryParams.sortBy)) {
      errors.push({
        field: 'sortBy',
        message: `El campo de ordenamiento debe ser uno de: ${validSortFields.join(', ')}`
      });
    }

    if (queryParams.order && !['ASC', 'DESC'].includes(queryParams.order.toUpperCase())) {
      errors.push({
        field: 'order',
        message: 'El orden debe ser ASC o DESC'
      });
    }

    return errors;
  }

  static createBusinessError(code, message) {
    const error = new Error(message);
    error.code = code;
    error.isBusinessError = true;
    return error;
  }
}

module.exports = CategoryValidationService;