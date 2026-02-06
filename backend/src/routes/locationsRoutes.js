// backend/src/routes/locationsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProvincesController,
  getMunicipalitiesController,
  getAllDivisions,
  getDivisionsSimple,
  validateLocation,
  searchMunicipalities
} = require('../controllers/locationsController');

// Rutas públicas (no requieren autenticación)

// @route   GET /api/locations/provinces
// @desc    Obtener lista de todas las provincias
router.get('/provinces', getProvincesController);

// @route   GET /api/locations/municipalities/:province
// @desc    Obtener municipios de una provincia específica
router.get('/municipalities/:province', getMunicipalitiesController);

// @route   GET /api/locations/all
// @desc    Obtener todas las divisiones (provincias con municipios)
router.get('/all', getAllDivisions);

// @route   GET /api/locations/divisions-simple
// @desc    Obtener divisiones en formato objeto simple
router.get('/divisions-simple', getDivisionsSimple);

// @route   GET /api/locations/search
// @desc    Buscar municipios por término
router.get('/search', searchMunicipalities);

// @route   POST /api/locations/validate
// @desc    Validar provincia y municipio
router.post('/validate', validateLocation);

module.exports = router;