// backend/src/utils/logger.js

/**
 * Logger simple para la aplicación
 * En producción podrías usar Winston, Pino u otra librería
 */

const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
  },

  error: (message, meta = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
  },

  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  }
};

module.exports = logger;