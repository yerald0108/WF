// backend/src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  updateProductImages,
  getLowStockProducts,
  getRelatedProducts,
  getBestSellers,
  getFeaturedProducts,
  getBrands,
  getPriceRange
} = require('../controllers/products/productController');
const { protect, admin } = require('../middleware/auth');

// Validaciones para crear/actualizar producto
const productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 200 }).withMessage('El nombre debe tener entre 3 y 200 caracteres'),
  body('description')
    .trim()
    .notEmpty().withMessage('La descripción es requerida'),
  body('price')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('sku')
    .trim()
    .notEmpty().withMessage('El SKU es requerido'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo'),
  body('category')
    .trim()
    .notEmpty().withMessage('La categoría es requerida')
];

// ============================================
// RUTAS PÚBLICAS
// ============================================

// @route   GET /api/products/featured
// @desc    Obtener productos destacados
router.get('/featured', getFeaturedProducts);

// @route   GET /api/products/best-sellers
// @desc    Obtener productos más vendidos
router.get('/best-sellers', getBestSellers);

// @route   GET /api/products/brands
// @desc    Obtener todas las marcas disponibles
router.get('/brands', getBrands);

// @route   GET /api/products/price-range
// @desc    Obtener rango de precios min/max
router.get('/price-range', getPriceRange);

// @route   GET /api/products
// @desc    Listar todos los productos con filtros y paginación
router.get('/', getProducts);

// @route   GET /api/products/:id
// @desc    Obtener un producto por ID o slug
router.get('/:id', getProductById);

// @route   GET /api/products/:id/related
// @desc    Obtener productos relacionados
router.get('/:id/related', getRelatedProducts);

// ============================================
// RUTAS PROTEGIDAS (ADMIN)
// ============================================

// @route   GET /api/products/admin/low-stock
// @desc    Obtener productos con bajo stock
router.get('/admin/low-stock', protect, admin, getLowStockProducts);

// @route   POST /api/products
// @desc    Crear un nuevo producto
router.post('/', protect, admin, productValidation, createProduct);

// @route   PUT /api/products/:id
// @desc    Actualizar un producto
router.put('/:id', protect, admin, updateProduct);

// @route   PATCH /api/products/:id/stock
// @desc    Actualizar stock de un producto
router.patch('/:id/stock', protect, admin, updateStock);

// @route   PATCH /api/products/:id/images
// @desc    Actualizar imágenes de un producto
router.patch('/:id/images', protect, admin, updateProductImages);

// @route   DELETE /api/products/:id
// @desc    Eliminar un producto (soft delete)
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;