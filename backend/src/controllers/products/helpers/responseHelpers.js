// backend/src/controllers/products/helpers/responseHelpers.js

const ProductValidationService = require('../services/productValidationService');

class ResponseHelper {
  static sendSuccess(res, message = '', data = {}) {
    const response = {
      success: true,
      ...(message && typeof message === 'string' ? { message } : { data: message })
    };
    
    if (Object.keys(data).length > 0) {
      response.data = data;
    }
    
    res.json(response);
  }

  static sendError(res, message = 'Error en el servidor', error = null, statusCode = 500) {
    console.error('Error:', error || message);
    
    const response = {
      success: false,
      error: message,
      ...(error && process.env.NODE_ENV === 'development' && { details: error.message })
    };
    
    res.status(statusCode).json(response);
  }

  static sendNotFound(res, message = 'Recurso no encontrado') {
    this.sendError(res, message, null, 404);
  }

  static sendBadRequest(res, message = 'Solicitud inválida') {
    this.sendError(res, message, null, 400);
  }

  static sendValidationError(res, errors) {
    res.status(400).json({
      success: false,
      error: 'Error de validación',
      errors: errors
    });
  }

  static sendCreated(res, message = 'Creado exitosamente', data = {}) {
    const response = {
      success: true,
      message,
      ...data
    };
    
    res.status(201).json(response);
  }

  static sendValidationError(res, errors, source = 'express-validator') {
    let formattedErrors;
    
    if (source === 'express-validator') {
      formattedErrors = ProductValidationService.formatValidationErrors(errors);
    } else {
      formattedErrors = errors;
    }

    res.status(400).json({
      success: false,
      error: 'Error de validación',
      errors: formattedErrors
    });
  }

  static sendBusinessError(res, error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
}

module.exports = ResponseHelper;