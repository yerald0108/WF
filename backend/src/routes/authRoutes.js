// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// Validaciones
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('phone').notEmpty().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// ============================================
// RUTAS PÚBLICAS
// ============================================

// @route   POST /api/auth/register
// @desc    Registrar nuevo usuario y enviar email de verificación
router.post('/register', registerValidation, authController.register);

// @route   POST /api/auth/login
// @desc    Iniciar sesión
router.post('/login', loginValidation, authController.login);

// @route   GET /api/auth/verify/:token
// @desc    Verificar email con token
router.get('/verify/:token', authController.verifyEmail);

// @route   POST /api/auth/forgot-password
// @desc    Solicitar recuperación de contraseña (envía email)
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Resetear contraseña con token
router.post('/reset-password/:token', authController.resetPassword);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

// @route   GET /api/auth/me
// @desc    Obtener usuario actual
router.get('/me', authController.protect, authController.getMe);

// @route   PUT /api/auth/profile
// @desc    Actualizar perfil
router.put('/profile', authController.protect, authController.updateProfile);

// @route   POST /api/auth/resend-verification
// @desc    Reenviar email de verificación
router.post('/resend-verification', authController.protect, authController.resendVerification);

module.exports = router;