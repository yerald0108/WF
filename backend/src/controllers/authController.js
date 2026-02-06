// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} = require('../services/emailService');

// Generar JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Registro de usuario
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Validar inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, phone } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ 
        error: 'Este email ya está registrado' 
      });
    }

    // Crear token de verificación
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Crear usuario
    const user = await User.create({
      email,
      password_hash: password,
      first_name,
      last_name,
      phone,
      verification_token,
      verification_expires
    });

    // Enviar email de verificación
    try {
      await sendVerificationEmail(
        user.email, 
        verification_token, 
        `${user.first_name} ${user.last_name}`
      );
      console.log('✅ Email de verificación enviado a:', user.email);
    } catch (emailError) {
      console.error('❌ Error enviando email de verificación:', emailError);
      // No fallar el registro si el email falla
    }

    // Generar token JWT
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado. Por favor verifica tu email.',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        email_verified: user.email_verified,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      error: 'Error al registrar usuario' 
    });
  }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar token
    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        email_verified: user.email_verified,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error al iniciar sesión' 
    });
  }
};

// @desc    Verificar email
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      where: {
        verification_token: token
      }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Token de verificación inválido' 
      });
    }

    if (user.verification_expires < new Date()) {
      return res.status(400).json({ 
        error: 'Token de verificación expirado' 
      });
    }

    // Verificar usuario
    user.email_verified = true;
    user.verification_token = null;
    user.verification_expires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email verificado exitosamente'
    });
  } catch (error) {
    console.error('Error verificando email:', error);
    res.status(500).json({ 
      error: 'Error al verificar email' 
    });
  }
};

// @desc    Solicitar recuperación de contraseña
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Por seguridad, no revelamos si el email existe
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
      });
    }

    // Generar token de reset
    const reset_token = crypto.randomBytes(32).toString('hex');
    const reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    user.reset_token = reset_token;
    user.reset_expires = reset_expires;
    await user.save();

    // Enviar email con link de reset
    try {
      await sendPasswordResetEmail(
        user.email, 
        reset_token, 
        `${user.first_name} ${user.last_name}`
      );
      console.log('✅ Email de recuperación enviado a:', user.email);
    } catch (emailError) {
      console.error('❌ Error enviando email de recuperación:', emailError);
    }

    res.json({
      success: true,
      message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
    });
  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({ 
      error: 'Error al procesar solicitud' 
    });
  }
};

// @desc    Resetear contraseña
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    const user = await User.findOne({
      where: {
        reset_token: token
      }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Token de recuperación inválido' 
      });
    }

    if (user.reset_expires < new Date()) {
      return res.status(400).json({ 
        error: 'Token de recuperación expirado' 
      });
    }

    // Actualizar contraseña
    user.password_hash = password;
    user.reset_token = null;
    user.reset_expires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error reseteando password:', error);
    res.status(500).json({ 
      error: 'Error al resetear contraseña' 
    });
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'verification_token', 'reset_token'] }
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ 
      error: 'Error al obtener información del usuario' 
    });
  }
};

// @desc    Actualizar perfil
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;

    const user = await User.findByPk(req.user.id);

    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ 
      error: 'Error al actualizar perfil' 
    });
  }
};

// @desc    Reenviar email de verificación
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user.email_verified) {
      return res.status(400).json({
        error: 'Tu email ya está verificado'
      });
    }

    // Generar nuevo token
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verification_token = verification_token;
    user.verification_expires = verification_expires;
    await user.save();

    // Enviar email
    await sendVerificationEmail(
      user.email,
      verification_token,
      `${user.first_name} ${user.last_name}`
    );

    res.json({
      success: true,
      message: 'Email de verificación enviado'
    });
  } catch (error) {
    console.error('Error reenviando verificación:', error);
    res.status(500).json({
      error: 'Error al reenviar email de verificación'
    });
  }
};

// Middleware de protección
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash'] }
      });
      
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'No autorizado, token fallido' });
    }
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No autorizado, no hay token' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  resendVerification,
  protect
};