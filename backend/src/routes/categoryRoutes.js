// backend/src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const categoryController = require('../controllers/categories');
const { protect, admin } = require('../middleware/auth');

// Validaciones
const categoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
];

// ============================================
// RUTAS PÚBLICAS
// ============================================

// @route   GET /api/categories/tree
// @desc    Obtener árbol jerárquico de categorías
router.get('/tree', categoryController.getCategoryTree);

// @route   GET /api/categories
// @desc    Listar todas las categorías
router.get('/', categoryController.getCategories);

// @route   GET /api/categories/:id
// @desc    Obtener una categoría por ID o slug
router.get('/:id', categoryController.getCategoryById);

// @route   GET /api/categories/:id/products
// @desc    Obtener productos de una categoría
router.get('/:id/products', categoryController.getCategoryProducts);

// ============================================
// RUTAS PROTEGIDAS (ADMIN)
// ============================================

// @route   GET /api/categories/admin/stats
// @desc    Obtener estadísticas de categorías
router.get('/admin/stats', protect, admin, categoryController.getCategoryStats);

// @route   POST /api/categories
// @desc    Crear una nueva categoría
router.post('/', protect, admin, categoryValidation, categoryController.createCategory);

// @route   PUT /api/categories/:id
// @desc    Actualizar una categoría
router.put('/:id', protect, admin, categoryController.updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Eliminar una categoría (soft delete)
router.delete('/:id', protect, admin, categoryController.deleteCategory);

module.exports = router;