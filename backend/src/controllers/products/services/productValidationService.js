// backend/src/controllers/products/services/productValidationService.js
const { validationResult } = require('express-validator');

class ProductValidationService {
  /**
   * Valida los datos de creación de producto
   * @param {Object} productData - Datos del producto
   * @returns {Array} - Array de errores de validación
   */
  static validateProductData(productData) {
    const errors = [];

    // Validación de nombre
    if (!productData.name || productData.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'El nombre debe tener al menos 3 caracteres'
      });
    }

    // Validación de precio
    if (!productData.price || parseFloat(productData.price) <= 0) {
      errors.push({
        field: 'price',
        message: 'El precio debe ser mayor a 0'
      });
    }

    // Validación de compare_price si existe
    if (productData.compare_price && parseFloat(productData.compare_price) <= parseFloat(productData.price)) {
      errors.push({
        field: 'compare_price',
        message: 'El precio de comparación debe ser mayor al precio normal'
      });
    }

    // Validación de SKU
    if (!productData.sku || productData.sku.trim().length < 3) {
      errors.push({
        field: 'sku',
        message: 'El SKU debe tener al menos 3 caracteres'
      });
    }

    // Validación de stock
    if (productData.stock !== undefined && parseInt(productData.stock) < 0) {
      errors.push({
        field: 'stock',
        message: 'El stock no puede ser negativo'
      });
    }

    // Validación de categoría
    if (!productData.category || productData.category.trim().length === 0) {
      errors.push({
        field: 'category',
        message: 'La categoría es requerida'
      });
    }

    // Validación de imágenes
    if (productData.images && !Array.isArray(productData.images)) {
      errors.push({
        field: 'images',
        message: 'Las imágenes deben ser un array'
      });
    }

    // Validación de tags
    if (productData.tags && !Array.isArray(productData.tags)) {
      errors.push({
        field: 'tags',
        message: 'Los tags deben ser un array'
      });
    }

    return errors;
  }

  /**
   * Valida los datos de actualización de stock
   * @param {Object} stockData - Datos del stock
   * @returns {Array} - Array de errores de validación
   */
  static validateStockUpdate(stockData) {
    const errors = [];

    if (stockData.stock === undefined) {
      errors.push({
        field: 'stock',
        message: 'El stock es requerido'
      });
    } else if (isNaN(stockData.stock) || parseInt(stockData.stock) < 0) {
      errors.push({
        field: 'stock',
        message: 'El stock debe ser un número positivo'
      });
    }

    if (stockData.operation && !['add', 'subtract', 'set'].includes(stockData.operation)) {
      errors.push({
        field: 'operation',
        message: 'La operación debe ser: add, subtract o set'
      });
    }

    return errors;
  }

  /**
   * Valida los datos de actualización de imágenes
   * @param {Object} imageData - Datos de imágenes
   * @returns {Array} - Array de errores de validación
   */
  static validateImageUpdate(imageData) {
    const errors = [];

    if (imageData.operation && !['add', 'remove', 'set'].includes(imageData.operation)) {
      errors.push({
        field: 'operation',
        message: 'La operación debe ser: add, remove o set'
      });
    }

    if (imageData.images && !Array.isArray(imageData.images)) {
      errors.push({
        field: 'images',
        message: 'Las imágenes deben ser un array'
      });
    }

    if (imageData.thumbnail && typeof imageData.thumbnail !== 'string') {
      errors.push({
        field: 'thumbnail',
        message: 'El thumbnail debe ser una URL válida'
      });
    }

    return errors;
  }

  /**
   * Valida parámetros de búsqueda de productos
   * @param {Object} queryParams - Parámetros de búsqueda
   * @returns {Array} - Array de errores de validación
   */
  static validateSearchParams(queryParams) {
    const errors = [];

    // Validar página
    if (queryParams.page && (isNaN(queryParams.page) || parseInt(queryParams.page) < 1)) {
      errors.push({
        field: 'page',
        message: 'La página debe ser un número mayor a 0'
      });
    }

    // Validar límite
    if (queryParams.limit && (isNaN(queryParams.limit) || parseInt(queryParams.limit) < 1 || parseInt(queryParams.limit) > 100)) {
      errors.push({
        field: 'limit',
        message: 'El límite debe ser un número entre 1 y 100'
      });
    }

    // Validar precio mínimo
    if (queryParams.minPrice && (isNaN(queryParams.minPrice) || parseFloat(queryParams.minPrice) < 0)) {
      errors.push({
        field: 'minPrice',
        message: 'El precio mínimo debe ser un número positivo'
      });
    }

    // Validar precio máximo
    if (queryParams.maxPrice && (isNaN(queryParams.maxPrice) || parseFloat(queryParams.maxPrice) < 0)) {
      errors.push({
        field: 'maxPrice',
        message: 'El precio máximo debe ser un número positivo'
      });
    }

    // Validar rango de precios
    if (queryParams.minPrice && queryParams.maxPrice && parseFloat(queryParams.minPrice) > parseFloat(queryParams.maxPrice)) {
      errors.push({
        field: 'priceRange',
        message: 'El precio mínimo no puede ser mayor al precio máximo'
      });
    }

    // Validar rating mínimo
    if (queryParams.minRating && (isNaN(queryParams.minRating) || parseFloat(queryParams.minRating) < 0 || parseFloat(queryParams.minRating) > 5)) {
      errors.push({
        field: 'minRating',
        message: 'El rating mínimo debe ser entre 0 y 5'
      });
    }

    return errors;
  }

  /**
   * Formatea errores de express-validator
   * @param {Object} validationResult - Resultado de validación de express-validator
   * @returns {Array} - Array de errores formateados
   */
  static formatValidationErrors(validationResult) {
    if (validationResult.isEmpty()) {
      return [];
    }

    return validationResult.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
  }

  /**
   * Crea un error de negocio
   * @param {String} code - Código del error
   * @param {String} message - Mensaje del error
   * @returns {Error} - Error de negocio
   */
  static createBusinessError(code, message) {
    const error = new Error(message);
    error.code = code;
    error.isBusinessError = true;
    return error;
  }

  /**
   * Verifica si un producto puede ser eliminado
   * @param {Object} product - Producto a verificar
   * @returns {Array} - Array de errores si no se puede eliminar
   */
  static validateProductDeletion(product) {
    const errors = [];

    // Verificar si tiene ventas pendientes
    if (product.sales_count > 0) {
      errors.push({
        code: 'HAS_SALES',
        message: 'No se puede eliminar un producto con ventas registradas'
      });
    }

    // Verificar si hay stock
    if (product.stock > 0) {
      errors.push({
        code: 'HAS_STOCK',
        message: 'No se puede eliminar un producto con stock disponible'
      });
    }

    return errors;
  }
}

module.exports = ProductValidationService;