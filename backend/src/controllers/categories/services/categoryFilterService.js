// backend/src/controllers/categories/services/categoryFilterService.js
const { Op } = require('sequelize');

class CategoryFilterService {
  /**
   * Construye el where clause para consultas de categorías
   */
  static buildWhereClause(queryParams) {
    const where = {};

    // Filtrar por estado activo/inactivo
    if (queryParams.includeInactive !== 'true') {
      where.is_active = true;
    }

    // Filtrar por categoría padre
    if (queryParams.parentId) {
      where.parent_id = queryParams.parentId;
    } else if (queryParams.onlyMain === 'true') {
      where.parent_id = null;
    } else if (queryParams.onlySubcategories === 'true') {
      where.parent_id = { [Op.ne]: null };
    }

    // Filtrar por búsqueda
    if (queryParams.search) {
      where[Op.or] = this.buildSearchConditions(queryParams.search);
    }

    // Filtrar por rango de productos
    if (queryParams.minProducts || queryParams.maxProducts) {
      where.products_count = {};
      if (queryParams.minProducts) {
        where.products_count[Op.gte] = parseInt(queryParams.minProducts);
      }
      if (queryParams.maxProducts) {
        where.products_count[Op.lte] = parseInt(queryParams.maxProducts);
      }
    }

    // Filtrar por fecha de creación
    if (queryParams.createdAfter || queryParams.createdBefore) {
      where.createdAt = {};
      if (queryParams.createdAfter) {
        where.createdAt[Op.gte] = new Date(queryParams.createdAfter);
      }
      if (queryParams.createdBefore) {
        where.createdAt[Op.lte] = new Date(queryParams.createdBefore);
      }
    }

    // Filtrar por ID específico (para múltiples IDs)
    if (queryParams.ids) {
      const idArray = queryParams.ids.split(',').map(id => parseInt(id.trim()));
      where.id = { [Op.in]: idArray };
    }

    // Filtrar por slugs específicos
    if (queryParams.slugs) {
      const slugArray = queryParams.slugs.split(',').map(s => s.trim());
      where.slug = { [Op.in]: slugArray };
    }

    return where;
  }

  /**
   * Construye condiciones de búsqueda
   */
  static buildSearchConditions(searchTerm) {
    return [
      { name: { [Op.iLike]: `%${searchTerm}%` } },
      { description: { [Op.iLike]: `%${searchTerm}%` } },
      { slug: { [Op.iLike]: `%${searchTerm}%` } },
      { meta_title: { [Op.iLike]: `%${searchTerm}%` } },
      { meta_description: { [Op.iLike]: `%${searchTerm}%` } }
    ];
  }

  /**
   * Construye opciones de ordenamiento para categorías
   */
  static buildOrderOptions(queryParams) {
    const validSortFields = ['name', 'order', 'products_count', 'createdAt', 'updatedAt'];
    const defaultSortField = 'order';
    
    let sortBy = queryParams.sortBy || defaultSortField;
    if (!validSortFields.includes(sortBy)) {
      sortBy = defaultSortField;
    }

    const order = queryParams.order || 'ASC';
    const validOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    // Ordenamiento especial para jerarquía
    if (queryParams.sortBy === 'hierarchy') {
      return [
        ['parent_id', 'ASC NULLS FIRST'],
        ['order', 'ASC'],
        ['name', 'ASC']
      ];
    }

    return [[sortBy, validOrder]];
  }

  /**
   * Construye opciones de inclusión (includes) para Sequelize
   */
  static buildIncludeOptions(queryParams) {
    const include = [];

    // Incluir subcategorías
    if (queryParams.includeSubcategories !== 'false') {
      const subcategoryWhere = {};
      
      if (queryParams.includeInactive !== 'true') {
        subcategoryWhere.is_active = true;
      }

      include.push({
        model: require('../../../models/Category'),
        as: 'subcategories',
        where: subcategoryWhere,
        required: false,
        separate: queryParams.separateSubcategories === 'true',
        ...(queryParams.limitSubcategories && {
          limit: parseInt(queryParams.limitSubcategories)
        })
      });
    }

    // Incluir categoría padre
    if (queryParams.includeParent === 'true') {
      include.push({
        model: require('../../../models/Category'),
        as: 'parent',
        required: false
      });
    }

    // Incluir estadísticas de productos
    if (queryParams.includeProductStats === 'true') {
      include.push({
        model: require('../../../models/Product'),
        as: 'products',
        where: { is_active: true },
        required: false,
        attributes: [], // Solo para contar
        duplicating: false
      });
    }

    return include;
  }

  /**
   * Parsea y valida parámetros de paginación para categorías
   */
  static parsePaginationParams(queryParams, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    let limit = Math.max(1, parseInt(queryParams.limit) || defaultLimit);
    limit = Math.min(limit, maxLimit);
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Genera metadata de paginación para respuesta
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
   * Filtra categorías que tienen productos (para menús, etc.)
   */
  static async filterCategoriesWithProducts(categoryIds, minProducts = 1) {
    const Category = require('../../../models/Category');
    
    return await Category.findAll({
      where: {
        id: { [Op.in]: categoryIds },
        is_active: true,
        products_count: { [Op.gte]: minProducts }
      },
      attributes: ['id', 'name', 'slug', 'products_count']
    });
  }

  /**
   * Genera un árbol de categorías a partir de una lista plana
   */
  static buildCategoryTree(categories) {
    const categoryMap = {};
    const tree = [];

    // Primero, mapear todas las categorías por ID
    categories.forEach(category => {
      categoryMap[category.id] = {
        ...category.toJSON(),
        subcategories: []
      };
    });

    // Luego, construir el árbol
    categories.forEach(category => {
      if (category.parent_id) {
        // Es una subcategoría
        if (categoryMap[category.parent_id]) {
          categoryMap[category.parent_id].subcategories.push(categoryMap[category.id]);
        }
      } else {
        // Es una categoría principal
        tree.push(categoryMap[category.id]);
      }
    });

    // Ordenar subcategorías
    tree.forEach(category => {
      if (category.subcategories.length > 0) {
        category.subcategories.sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.name.localeCompare(b.name);
        });
      }
    });

    // Ordenar árbol principal
    tree.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });

    return tree;
  }

  /**
   * Obtiene el breadcrumb (ruta de navegación) para una categoría
   */
  static async getCategoryBreadcrumb(categoryId) {
    const Category = require('../../../models/Category');
    const breadcrumb = [];
    
    let currentCategory = await Category.findByPk(categoryId);
    
    while (currentCategory) {
      breadcrumb.unshift({
        id: currentCategory.id,
        name: currentCategory.name,
        slug: currentCategory.slug
      });
      
      if (currentCategory.parent_id) {
        currentCategory = await Category.findByPk(currentCategory.parent_id);
      } else {
        currentCategory = null;
      }
    }
    
    return breadcrumb;
  }
}

module.exports = CategoryFilterService;