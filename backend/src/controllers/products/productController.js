// backend/src/controllers/products/productController.js
const ProductHandlers = require('./handlers/productHandlers');
const StockHandlers = require('./handlers/stockHandlers');
const ImageHandlers = require('./handlers/imageHandlers');
const ProductQueryService = require('./services/productQueryService');
const ResponseHelper = require('./helpers/responseHelpers');
const ErrorHandlers = require('./helpers/errorHandlers');
const { Op, fn, col, literal } = require('sequelize');
const Product = require('../../models/Product');

module.exports = {
  // Productos principales - usando wrapAsync
  getProducts: ErrorHandlers.wrapAsync(ProductHandlers.handleGetProducts),
  getProductById: ErrorHandlers.wrapAsync(ProductHandlers.handleGetProductById),
  createProduct: ErrorHandlers.wrapAsync(ProductHandlers.handleCreateProduct),
  updateProduct: ErrorHandlers.wrapAsync(ProductHandlers.handleUpdateProduct),
  deleteProduct: ErrorHandlers.wrapAsync(ProductHandlers.handleDeleteProduct),

  // Stock
  updateStock: ErrorHandlers.wrapAsync(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
    }

    const { stock, operation = 'set' } = req.body;
    
    if (stock === undefined || stock < 0) {
      return ResponseHelper.sendBadRequest(res, 'Stock inválido');
    }

    const newStock = StockHandlers.calculateNewStock(product.stock, parseInt(stock), operation);
    await product.update({ stock: newStock });

    ResponseHelper.sendSuccess(res, 'Stock actualizado exitosamente', {
      data: {
        id: product.id,
        name: product.name,
        previousStock: product.stock,
        newStock,
        isLowStock: newStock <= product.min_stock
      }
    });
  }),

  getLowStockProducts: ErrorHandlers.wrapAsync(async (req, res) => {
    const products = await Product.findAll({
      where: {
        is_active: true,
        stock: {
          [Op.lte]: col('min_stock')
        }
      },
      order: [['stock', 'ASC']],
      attributes: ['id', 'name', 'sku', 'stock', 'min_stock', 'price']
    });

    ResponseHelper.sendSuccess(res, { 
      count: products.length, 
      data: products 
    });
  }),

  // Imágenes
  updateProductImages: ErrorHandlers.wrapAsync(async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
    }

    const { images, thumbnail, operation = 'set' } = req.body;
    const newImages = ImageHandlers.processImages(product.images || [], images, operation);
    
    const updates = { images: newImages };
    if (thumbnail) updates.thumbnail = thumbnail;

    await product.update(updates);

    ResponseHelper.sendSuccess(res, 'Imágenes actualizadas exitosamente', {
      data: {
        id: product.id,
        images: newImages,
        thumbnail: product.thumbnail
      }
    });
  }),

  // Consultas especializadas
  getRelatedProducts: ErrorHandlers.wrapAsync(async (req, res) => {
    const product = await ProductQueryService.getProductByIdOrSlug(req.params.id);
    
    if (!product) {
      return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
    }

    const relatedProducts = await ProductQueryService.getRelatedProducts(
      product, 
      req.query.limit || 4
    );

    ResponseHelper.sendSuccess(res, { 
      count: relatedProducts.length, 
      data: relatedProducts 
    });
  }),

  getBestSellers: ErrorHandlers.wrapAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    
    const where = { 
      is_active: true,
      sales_count: { [Op.gt]: 0 }
    };

    if (category) {
      where.category = category;
    }

    const products = await Product.findAll({
      where,
      limit,
      order: [['sales_count', 'DESC']],
      attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'rating_average', 'sales_count']
    });

    ResponseHelper.sendSuccess(res, { 
      count: products.length, 
      data: products 
    });
  }),

  getFeaturedProducts: ErrorHandlers.wrapAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    
    const products = await Product.findAll({
      where: { 
        is_active: true,
        is_featured: true
      },
      limit,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'rating_average']
    });

    ResponseHelper.sendSuccess(res, { 
      count: products.length, 
      data: products 
    });
  }),

  getBrands: ErrorHandlers.wrapAsync(async (req, res) => {
    const brands = await Product.findAll({
      where: { 
        is_active: true,
        brand: { [Op.ne]: null }
      },
      attributes: [
        'brand',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['brand'],
      order: [[literal('count'), 'DESC']]
    });

    ResponseHelper.sendSuccess(res, { 
      count: brands.length, 
      data: brands 
    });
  }),

  getPriceRange: ErrorHandlers.wrapAsync(async (req, res) => {
    const { category } = req.query;
    const where = { is_active: true };
    
    if (category) {
      where.category = category;
    }

    const result = await Product.findOne({
      where,
      attributes: [
        [fn('MIN', col('price')), 'min'],
        [fn('MAX', col('price')), 'max']
      ]
    });

    ResponseHelper.sendSuccess(res, {
      data: {
        min: parseFloat(result?.dataValues?.min) || 0,
        max: parseFloat(result?.dataValues?.max) || 0
      }
    });
  })
};