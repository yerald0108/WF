// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');

require('./models');

const app = express();

// Middlewares básicos
app.use(helmet()); // Seguridad HTTP
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Demasiadas solicitudes desde esta IP'
});
app.use('/api/', limiter);

// Parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba (health check)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend de Ferretería funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Importar y usar rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const locationsRoutes = require('./routes/locationsRoutes');

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationsRoutes);

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejo de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;