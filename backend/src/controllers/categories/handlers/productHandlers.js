// backend/src/controllers/categories/handlers/productHandlers.js
const { Op } = require('sequelize');
const Product = require('../../../models/Product');
const Category = require('../../../models/Category');
const ResponseHelper = require('../../products/helpers/responseHelpers');
const QueryHelpers = require('../../products/helpers/queryHelpers');

class ProductHandlers {
  /**
   * Maneja la obtención de productos de una categoría específica
   */
  static async handleGetCategoryProducts(req, res) {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      sortBy = 'createdAt', 
      order = 'DESC',
      minPrice,
      maxPrice,
      inStock,
      featured,
      minRating,
      brands,
      tags
    } = req.query;

    // Buscar categoría
    const where = isNaN(id) 
      ? { slug: id, is_active: true } 
      : { id: parseInt(id), is_active: true };

    const category = await Category.findOne({ where });

    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    // Construir filtros para productos
    const productWhere = { 
      category_id: category.id,
      is_active: true 
    };

    // Aplicar filtros adicionales si existen
    if (minPrice || maxPrice) {
      productWhere.price = {};
      if (minPrice) productWhere.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) productWhere.price[Op.lte] = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      productWhere.stock = { [Op.gt]: 0 };
    } else if (inStock === 'false') {
      productWhere.stock = 0;
    }

    if (featured === 'true') {
      productWhere.is_featured = true;
    }

    if (minRating) {
      productWhere.rating_average = { [Op.gte]: parseFloat(minRating) };
    }

    if (brands) {
      const brandArray = brands.split(',').map(b => b.trim());
      productWhere.brand = { [Op.in]: brandArray };
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim().toLowerCase());
      productWhere.tags = { [Op.overlap]: tagArray };
    }

    // Validar y aplicar ordenamiento
    const validSortFields = ['price', 'createdAt', 'name', 'sales_count', 'rating_average'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener productos
    const { count, rows: products } = await Product.findAndCountAll({
      where: productWhere,
      limit: parseInt(limit),
      offset,
      order: [[sortField, sortOrder]],
      attributes: [
        'id', 'name', 'slug', 'price', 'compare_price', 
        'thumbnail', 'rating_average', 'stock', 'brand', 
        'createdAt', 'sales_count'
      ]
    });

    // Calcular estadísticas de la categoría
    const stats = await this.calculateCategoryStats(category.id);

    const totalPages = Math.ceil(count / parseInt(limit));

    ResponseHelper.sendSuccess(res, {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        ...stats
      },
      pagination: {
        count: products.length,
        total: count,
        page: parseInt(page),
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        sortBy: sortField,
        order: sortOrder,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        inStock: inStock || null,
        featured: featured || null,
        minRating: minRating || null,
        brands: brands || null,
        tags: tags || null
      },
      data: products
    });
  }

  /**
   * Obtiene productos de subcategorías también
   */
  static async handleGetCategoryProductsWithSubcategories(req, res) {
    const { id } = req.params;
    const { includeSubcategories = 'true' } = req.query;

    // Buscar categoría
    const where = isNaN(id) 
      ? { slug: id, is_active: true } 
      : { id: parseInt(id), is_active: true };

    const category = await Category.findOne({ where });

    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    // Obtener todas las categorías a incluir (categoría principal + subcategorías)
    let categoryIds = [category.id];
    
    if (includeSubcategories === 'true') {
      const subcategories = await Category.findAll({
        where: { 
          parent_id: category.id,
          is_active: true 
        },
        attributes: ['id']
      });
      
      categoryIds = [...categoryIds, ...subcategories.map(sc => sc.id)];
    }

    // Aplicar filtros de query
    const { page, limit, offset } = QueryHelpers.parsePagination(req.query);
    
    const productWhere = { 
      category_id: { [Op.in]: categoryIds },
      is_active: true 
    };

    // Aplicar filtros adicionales
    this.applyProductFilters(productWhere, req.query);

    // Obtener productos
    const { count, rows: products } = await Product.findAndCountAll({
      where: productWhere,
      limit,
      offset,
      order: QueryHelpers.parseSorting(req.query, ['price', 'createdAt', 'name', 'sales_count', 'rating_average']),
      attributes: [
        'id', 'name', 'slug', 'price', 'compare_price', 
        'thumbnail', 'rating_average', 'stock', 'brand', 
        'category_id', 'category'
      ]
    });

    const paginationMetadata = QueryHelpers.buildPaginationMetadata(count, page, limit);

    ResponseHelper.sendSuccess(res, {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        includeSubcategories: includeSubcategories === 'true'
      },
      ...paginationMetadata,
      data: products
    });
  }

  /**
   * Calcula estadísticas de productos en una categoría
   */
  static async calculateCategoryStats(categoryId) {
    // Contar productos totales
    const totalProducts = await Product.count({
      where: { 
        category_id: categoryId,
        is_active: true 
      }
    });

    // Productos en stock
    const inStockProducts = await Product.count({
      where: { 
        category_id: categoryId,
        is_active: true,
        stock: { [Op.gt]: 0 }
      }
    });

    // Productos destacados
    const featuredProducts = await Product.count({
      where: { 
        category_id: categoryId,
        is_active: true,
        is_featured: true 
      }
    });

    // Rango de precios
    const priceRange = await Product.findOne({
      where: { 
        category_id: categoryId,
        is_active: true 
      },
      attributes: [
        [require('sequelize').fn('MIN', require('sequelize').col('price')), 'min'],
        [require('sequelize').fn('MAX', require('sequelize').col('price')), 'max'],
        [require('sequelize').fn('AVG', require('sequelize').col('price')), 'avg']
      ]
    });

    // Marcas disponibles
    const brands = await Product.findAll({
      where: { 
        category_id: categoryId,
        is_active: true,
        brand: { [Op.ne]: null }
      },
      attributes: [
        'brand',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['brand'],
      order: [[require('sequelize').literal('count'), 'DESC']],
      limit: 10
    });

    return {
      totalProducts,
      inStockProducts,
      outOfStockProducts: totalProducts - inStockProducts,
      featuredProducts,
      priceRange: {
        min: parseFloat(priceRange?.dataValues?.min) || 0,
        max: parseFloat(priceRange?.dataValues?.max) || 0,
        avg: parseFloat(priceRange?.dataValues?.avg) || 0
      },
      brands: brands.map(b => ({
        brand: b.brand,
        count: parseInt(b.dataValues.count)
      }))
    };
  }

  /**
   * Aplica filtros a la consulta de productos
   */
  static applyProductFilters(whereClause, queryParams) {
    const { Op } = require('sequelize');

    // Filtro por rango de precio
    if (queryParams.minPrice || queryParams.maxPrice) {
      whereClause.price = {};
      if (queryParams.minPrice) whereClause.price[Op.gte] = parseFloat(queryParams.minPrice);
      if (queryParams.maxPrice) whereClause.price[Op.lte] = parseFloat(queryParams.maxPrice);
    }

    // Filtro por stock
    if (queryParams.inStock === 'true') {
      whereClause.stock = { [Op.gt]: 0 };
    } else if (queryParams.inStock === 'false') {
      whereClause.stock = 0;
    }

    // Filtro por productos destacados
    if (queryParams.featured === 'true') {
      whereClause.is_featured = true;
    }

    // Filtro por rating mínimo
    if (queryParams.minRating) {
      whereClause.rating_average = { [Op.gte]: parseFloat(queryParams.minRating) };
    }

    // Filtro por marcas
    if (queryParams.brands) {
      const brandArray = queryParams.brands.split(',').map(b => b.trim());
      whereClause.brand = { [Op.in]: brandArray };
    }

    // Filtro por tags
    if (queryParams.tags) {
      const tagArray = queryParams.tags.split(',').map(t => t.trim().toLowerCase());
      whereClause.tags = { [Op.overlap]: tagArray };
    }

    // Filtro por búsqueda
    if (queryParams.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${queryParams.search}%` } },
        { description: { [Op.iLike]: `%${queryParams.search}%` } },
        { brand: { [Op.iLike]: `%${queryParams.search}%` } },
        { tags: { [Op.contains]: [queryParams.search.toLowerCase()] } }
      ];
    }
  }

  /**
   * Obtiene productos populares de una categoría
   */
  static async handleGetPopularCategoryProducts(req, res) {
    const { id } = req.params;
    const { limit = 8 } = req.query;

    const where = isNaN(id) 
      ? { slug: id, is_active: true } 
      : { id: parseInt(id), is_active: true };

    const category = await Category.findOne({ where });

    if (!category) {
      return ResponseHelper.sendNotFound(res, 'Categoría no encontrada');
    }

    const products = await Product.findAll({
      where: { 
        category_id: category.id,
        is_active: true,
        sales_count: { [Op.gt]: 0 }
      },
      limit: parseInt(limit),
      order: [['sales_count', 'DESC']],
      attributes: [
        'id', 'name', 'slug', 'price', 'compare_price', 
        'thumbnail', 'rating_average', 'sales_count'
      ]
    });

    ResponseHelper.sendSuccess(res, {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug
      },
      count: products.length,
      data: products
    });
  }
}

module.exports = ProductHandlers;