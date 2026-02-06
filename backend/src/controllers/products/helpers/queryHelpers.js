// backend/src/controllers/products/helpers/queryHelpers.js
class QueryHelpers {
  /**
   * Parsea y valida parámetros de paginación
   * @param {Object} query - Objeto query de Express
   * @returns {Object} - Parámetros de paginación normalizados
   */
  static parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 12));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Parsea y valida parámetros de ordenamiento
   * @param {Object} query - Objeto query de Express
   * @param {Array} validFields - Campos válidos para ordenar
   * @returns {Array} - Array para usar en order de Sequelize
   */
  static parseSorting(query, validFields = []) {
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'DESC';
    
    const sortField = validFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return [[sortField, sortOrder]];
  }

  /**
   * Parsea filtros de rango numérico
   * @param {Object} query - Objeto query de Express
   * @param {String} field - Nombre del campo
   * @returns {Object} - Condición Sequelize para rango
   */
  static parseRangeFilter(query, field) {
    const min = query[`min${this.capitalize(field)}`];
    const max = query[`max${this.capitalize(field)}`];
    
    if (!min && !max) return null;

    const condition = {};
    if (min) condition[Op.gte] = parseFloat(min);
    if (max) condition[Op.lte] = parseFloat(max);

    return condition;
  }

  /**
   * Parsea filtros de lista (separados por coma)
   * @param {String} listString - String con valores separados por coma
   * @returns {Array} - Array de valores
   */
  static parseListFilter(listString) {
    if (!listString) return null;
    
    return listString.split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * Parsea filtros booleanos
   * @param {String} boolString - String booleano
   * @returns {Boolean|null} - Valor booleano o null
   */
  static parseBooleanFilter(boolString) {
    if (boolString === 'true') return true;
    if (boolString === 'false') return false;
    return null;
  }

  /**
   * Construye metadata de paginación
   * @param {Number} count - Total de registros
   * @param {Number} page - Página actual
   * @param {Number} limit - Límite por página
   * @returns {Object} - Objeto con metadata de paginación
   */
  static buildPaginationMetadata(count, page, limit) {
    const totalPages = Math.ceil(count / limit);

    return {
      total: count,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  }

  /**
   * Sanitiza y valida parámetros de búsqueda
   * @param {String} searchTerm - Término de búsqueda
   * @returns {String|null} - Término sanitizado o null
   */
  static sanitizeSearchTerm(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') return null;
    
    // Limitar longitud y sanitizar
    const sanitized = searchTerm
      .trim()
      .substring(0, 100) // Limitar longitud
      .replace(/[<>]/g, ''); // Remover caracteres potencialmente peligrosos
    
    return sanitized.length > 0 ? sanitized : null;
  }

  /**
   * Capitaliza la primera letra de un string
   * @param {String} string - String a capitalizar
   * @returns {String} - String capitalizado
   */
  static capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Extrae filtros aplicados del query
   * @param {Object} query - Objeto query de Express
   * @param {Array} filterKeys - Claves a considerar como filtros
   * @returns {Object} - Filtros aplicados
   */
  static extractAppliedFilters(query, filterKeys) {
    const appliedFilters = {};
    
    filterKeys.forEach(key => {
      if (query[key] !== undefined) {
        appliedFilters[key] = query[key];
      }
    });

    return appliedFilters;
  }
}

module.exports = QueryHelpers;