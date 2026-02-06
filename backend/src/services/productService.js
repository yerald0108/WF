// backend/src/services/productService.js
const Product = require('../models/Product');
const { Op } = require('sequelize');

/**
 * Verificar disponibilidad de stock
 * @param {number} productId - ID del producto
 * @param {number} quantity - Cantidad solicitada
 * @returns {Object} - { available: boolean, currentStock: number }
 */
const checkStockAvailability = async (productId, quantity) => {
  try {
    const product = await Product.findByPk(productId);
    
    if (!product) {
      return { available: false, error: 'Producto no encontrado' };
    }

    if (!product.is_active) {
      return { available: false, error: 'Producto no disponible' };
    }

    const available = product.stock >= quantity;
    
    return {
      available,
      currentStock: product.stock,
      requested: quantity,
      isLowStock: product.isLowStock()
    };
  } catch (error) {
    console.error('Error verificando stock:', error);
    return { available: false, error: 'Error al verificar stock' };
  }
};

/**
 * Reducir stock después de una venta
 * @param {number} productId - ID del producto
 * @param {number} quantity - Cantidad vendida
 */
const reduceStock = async (productId, quantity) => {
  try {
    const product = await Product.findByPk(productId);
    
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    if (product.stock < quantity) {
      throw new Error('Stock insuficiente');
    }

    const newStock = product.stock - quantity;
    const newSalesCount = product.sales_count + quantity;

    await product.update({
      stock: newStock,
      sales_count: newSalesCount
    });

    return {
      success: true,
      newStock,
      newSalesCount,
      isLowStock: newStock <= product.min_stock
    };
  } catch (error) {
    console.error('Error reduciendo stock:', error);
    throw error;
  }
};

/**
 * Restaurar stock (en caso de cancelación)
 * @param {number} productId - ID del producto
 * @param {number} quantity - Cantidad a restaurar
 */
const restoreStock = async (productId, quantity) => {
  try {
    const product = await Product.findByPk(productId);
    
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const newStock = product.stock + quantity;
    const newSalesCount = Math.max(0, product.sales_count - quantity);

    await product.update({
      stock: newStock,
      sales_count: newSalesCount
    });

    return {
      success: true,
      newStock,
      newSalesCount
    };
  } catch (error) {
    console.error('Error restaurando stock:', error);
    throw error;
  }
};

/**
 * Validar múltiples productos y sus cantidades
 * @param {Array} items - Array de { productId, quantity }
 * @returns {Object} - { valid: boolean, errors: [], products: [] }
 */
const validateProductsStock = async (items) => {
  const errors = [];
  const validProducts = [];

  for (const item of items) {
    const { productId, quantity } = item;
    
    const result = await checkStockAvailability(productId, quantity);
    
    if (!result.available) {
      errors.push({
        productId,
        message: result.error || `Stock insuficiente. Disponible: ${result.currentStock}`
      });
    } else {
      const product = await Product.findByPk(productId);
      validProducts.push({
        ...item,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          sku: product.sku
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    products: validProducts
  };
};

/**
 * Calcular precio total con descuentos
 * @param {number} price - Precio base
 * @param {number} comparePrice - Precio de comparación
 * @param {number} quantity - Cantidad
 * @returns {Object} - { subtotal, discount, total, discountPercentage }
 */
const calculatePricing = (price, comparePrice, quantity) => {
  const subtotal = parseFloat(price) * quantity;
  let discount = 0;
  let discountPercentage = 0;

  if (comparePrice && comparePrice > price) {
    const unitDiscount = comparePrice - price;
    discount = unitDiscount * quantity;
    discountPercentage = Math.round(((comparePrice - price) / comparePrice) * 100);
  }

  const total = subtotal;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    discountPercentage
  };
};

/**
 * Obtener estadísticas de productos
 */
const getProductStats = async () => {
  try {
    const totalProducts = await Product.count({ where: { is_active: true } });
    const outOfStock = await Product.count({ 
      where: { 
        is_active: true,
        stock: 0 
      } 
    });
    const lowStock = await Product.count({
      where: {
        is_active: true,
        stock: {
          [Op.gt]: 0,
          [Op.lte]: require('sequelize').col('min_stock')
        }
      }
    });

    const totalValue = await Product.sum('stock', {
      where: { is_active: true }
    });

    return {
      totalProducts,
      outOfStock,
      lowStock,
      inStock: totalProducts - outOfStock,
      totalValue: totalValue || 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
};

/**
 * Generar SKU único automáticamente
 * @param {string} prefix - Prefijo del SKU
 */
const generateSKU = async (prefix = 'PRD') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  let sku = `${prefix}-${timestamp}-${random}`;
  
  // Verificar que no exista
  let exists = await Product.findOne({ where: { sku } });
  let attempts = 0;
  
  while (exists && attempts < 5) {
    const newRandom = Math.random().toString(36).substring(2, 5).toUpperCase();
    sku = `${prefix}-${timestamp}-${newRandom}`;
    exists = await Product.findOne({ where: { sku } });
    attempts++;
  }
  
  return sku;
};

/**
 * Buscar productos por múltiples criterios
 * @param {Object} criteria - Criterios de búsqueda
 */
const advancedSearch = async (criteria) => {
  const {
    query,
    categories = [],
    brands = [],
    minPrice,
    maxPrice,
    minRating,
    tags = [],
    inStock = true
  } = criteria;

  const where = { is_active: true };

  // Búsqueda de texto
  if (query) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query}%` } },
      { description: { [Op.iLike]: `%${query}%` } },
      { sku: { [Op.iLike]: `%${query}%` } }
    ];
  }

  // Filtros de categorías
  if (categories.length > 0) {
    where.category = { [Op.in]: categories };
  }

  // Filtros de marcas
  if (brands.length > 0) {
    where.brand = { [Op.in]: brands };
  }

  // Rango de precios
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = minPrice;
    if (maxPrice) where.price[Op.lte] = maxPrice;
  }

  // Rating mínimo
  if (minRating) {
    where.rating_average = { [Op.gte]: minRating };
  }

  // Tags
  if (tags.length > 0) {
    where.tags = { [Op.overlap]: tags };
  }

  // Stock
  if (inStock) {
    where.stock = { [Op.gt]: 0 };
  }

  const products = await Product.findAll({ where });
  return products;
};

module.exports = {
  checkStockAvailability,
  reduceStock,
  restoreStock,
  validateProductsStock,
  calculatePricing,
  getProductStats,
  generateSKU,
  advancedSearch
};