// backend/src/controllers/products/services/productFilterService.js
const { Op } = require('sequelize');

class ProductFilterService {
  static buildWhereClause(queryParams) {
    const where = { is_active: true };

    // Búsqueda por texto
    if (queryParams.search) {
      where[Op.or] = this.buildSearchConditions(queryParams.search);
    }

    // Filtro por categorías
    if (queryParams.categories) {
      where.category = { [Op.in]: queryParams.categories.split(',').map(c => c.trim()) };
    } else if (queryParams.category) {
      where.category = queryParams.category;
    }

    // Filtro por marcas
    if (queryParams.brands) {
      where.brand = { [Op.in]: queryParams.brands.split(',').map(b => b.trim()) };
    } else if (queryParams.brand) {
      where.brand = queryParams.brand;
    }

    // Filtro por precio
    if (queryParams.minPrice || queryParams.maxPrice) {
      where.price = {};
      if (queryParams.minPrice) where.price[Op.gte] = parseFloat(queryParams.minPrice);
      if (queryParams.maxPrice) where.price[Op.lte] = parseFloat(queryParams.maxPrice);
    }

    // Otros filtros
    if (queryParams.minRating) {
      where.rating_average = { [Op.gte]: parseFloat(queryParams.minRating) };
    }

    if (queryParams.inStock === 'true') {
      where.stock = { [Op.gt]: 0 };
    }

    if (queryParams.featured === 'true') {
      where.is_featured = true;
    }

    if (queryParams.tags) {
      const tagArray = queryParams.tags.split(',').map(t => t.trim().toLowerCase());
      where.tags = { [Op.overlap]: tagArray };
    }

    return where;
  }

  static buildSearchConditions(searchTerm) {
    return [
      { name: { [Op.iLike]: `%${searchTerm}%` } },
      { description: { [Op.iLike]: `%${searchTerm}%` } },
      { short_description: { [Op.iLike]: `%${searchTerm}%` } },
      { brand: { [Op.iLike]: `%${searchTerm}%` } },
      { sku: { [Op.iLike]: `%${searchTerm}%` } },
      { tags: { [Op.contains]: [searchTerm.toLowerCase()] } }
    ];
  }

  static getValidSortOptions() {
    return ['price', 'createdAt', 'name', 'stock', 'sales_count', 'rating_average', 'views'];
  }
}

module.exports = ProductFilterService;