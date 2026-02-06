// backend/src/controllers/products/helpers/errorHandlers.js
const logger = require('../../../utils/logger'); // Asumiendo que tienes un logger configurado

class ErrorHandlers {
  /**
   * Maneja errores de validación de Sequelize
   * @param {Error} error - Error de Sequelize
   * @returns {Object} - Respuesta de error formateada
   */
  static handleSequelizeError(error) {
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        type: err.type
      }));
      
      return {
        statusCode: 400,
        response: {
          success: false,
          error: 'Error de validación',
          details: errors
        }
      };
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'campo único';
      return {
        statusCode: 409,
        response: {
          success: false,
          error: `Conflicto de unicidad`,
          message: `El valor para ${field} ya existe en la base de datos`
        }
      };
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return {
        statusCode: 400,
        response: {
          success: false,
          error: 'Error de referencia',
          message: 'La referencia a la entidad relacionada no es válida'
        }
      };
    }

    // Error por defecto de Sequelize
    return {
      statusCode: 500,
      response: {
        success: false,
        error: 'Error de base de datos',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
      }
    };
  }

  /**
   * Maneja errores de lógica de negocio
   * @param {Error} error - Error de negocio
   * @returns {Object} - Respuesta de error formateada
   */
  static handleBusinessError(error) {
    const businessErrors = {
      'PRODUCT_NOT_FOUND': { statusCode: 404, message: 'Producto no encontrado' },
      'INSUFFICIENT_STOCK': { statusCode: 400, message: 'Stock insuficiente' },
      'INVALID_PRICE': { statusCode: 400, message: 'Precio inválido' },
      'SKU_ALREADY_EXISTS': { statusCode: 409, message: 'El SKU ya existe' },
      'PRODUCT_INACTIVE': { statusCode: 400, message: 'El producto está inactivo' },
      'INVALID_CATEGORY': { statusCode: 400, message: 'Categoría inválida' }
    };

    const errorConfig = businessErrors[error.code];
    
    if (errorConfig) {
      return {
        statusCode: errorConfig.statusCode,
        response: {
          success: false,
          error: errorConfig.message,
          code: error.code
        }
      };
    }

    return null;
  }

  /**
   * Log de error con contexto
   * @param {Error} error - Error ocurrido
   * @param {Object} context - Contexto adicional (req, userId, etc.)
   */
  static logError(error, context = {}) {
    const logData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'production') {
      logger.error('Error en producto controller', logData);
    } else {
      console.error('Error detallado:', logData);
    }
  }

  /**
   * Middleware wrapper para manejo de errores en controladores
   * @param {Function} handler - Función del controlador
   * @returns {Function} - Handler envuelto con manejo de errores
   */
  static wrapAsync(handler) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        // Log del error
        this.logError(error, {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
          params: req.params,
          query: req.query
        });

        // Manejar errores de Sequelize
        if (error.name?.includes('Sequelize')) {
          const sequelizeError = this.handleSequelizeError(error);
          return res.status(sequelizeError.statusCode).json(sequelizeError.response);
        }

        // Manejar errores de negocio
        const businessError = this.handleBusinessError(error);
        if (businessError) {
          return res.status(businessError.statusCode).json(businessError.response);
        }

        // Error genérico
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor',
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
      }
    };
  }
}

module.exports = ErrorHandlers;