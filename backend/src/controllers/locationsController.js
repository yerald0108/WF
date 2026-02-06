// backend/src/controllers/locationsController.js
const { 
  CUBA_DIVISIONS,
  getProvinces, 
  getMunicipalities, 
  isValidProvince,
  isValidMunicipality 
} = require('../utils/cubaDivisions');

// @desc    Obtener todas las provincias de Cuba
// @route   GET /api/locations/provinces
// @access  Public
const getProvincesController = (req, res) => {
  try {
    const provinces = getProvinces();
    
    res.json({
      success: true,
      count: provinces.length,
      data: provinces
    });
  } catch (error) {
    console.error('Error obteniendo provincias:', error);
    res.status(500).json({ 
      error: 'Error al obtener provincias' 
    });
  }
};

// @desc    Obtener municipios de una provincia
// @route   GET /api/locations/municipalities/:province
// @access  Public
const getMunicipalitiesController = (req, res) => {
  try {
    const { province } = req.params;
    
    // Validar que la provincia exista
    if (!isValidProvince(province)) {
      return res.status(404).json({
        success: false,
        error: `La provincia "${province}" no existe`
      });
    }
    
    const municipalities = getMunicipalities(province);
    
    res.json({
      success: true,
      province: province,
      count: municipalities.length,
      data: municipalities
    });
  } catch (error) {
    console.error('Error obteniendo municipios:', error);
    res.status(500).json({ 
      error: 'Error al obtener municipios' 
    });
  }
};

// @desc    Obtener todas las divisiones (provincias con sus municipios)
// @route   GET /api/locations/all
// @access  Public
const getAllDivisions = (req, res) => {
  try {
    // Transformar a un formato más amigable para el frontend
    const divisions = Object.keys(CUBA_DIVISIONS).map(province => ({
      province: province,
      municipalities: CUBA_DIVISIONS[province]
    }));
    
    res.json({
      success: true,
      count: divisions.length,
      data: divisions
    });
  } catch (error) {
    console.error('Error obteniendo divisiones:', error);
    res.status(500).json({ 
      error: 'Error al obtener divisiones' 
    });
  }
};

// @desc    Obtener divisiones en formato simple (para selects)
// @route   GET /api/locations/divisions-simple
// @access  Public
const getDivisionsSimple = (req, res) => {
  try {
    res.json({
      success: true,
      data: CUBA_DIVISIONS
    });
  } catch (error) {
    console.error('Error obteniendo divisiones:', error);
    res.status(500).json({ 
      error: 'Error al obtener divisiones' 
    });
  }
};

// @desc    Validar una dirección
// @route   POST /api/locations/validate
// @access  Public
const validateLocation = (req, res) => {
  try {
    const { province, city } = req.body;
    
    if (!province || !city) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar provincia y municipio'
      });
    }
    
    // Validar provincia
    if (!isValidProvince(province)) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `"${province}" no es una provincia válida de Cuba`,
        validProvinces: getProvinces()
      });
    }
    
    // Validar municipio
    if (!isValidMunicipality(province, city)) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `"${city}" no pertenece a la provincia "${province}"`,
        validMunicipalities: getMunicipalities(province)
      });
    }
    
    res.json({
      success: true,
      valid: true,
      message: 'Ubicación válida',
      data: {
        province,
        municipality: city
      }
    });
  } catch (error) {
    console.error('Error validando ubicación:', error);
    res.status(500).json({ 
      error: 'Error al validar ubicación' 
    });
  }
};

// @desc    Buscar municipios por término
// @route   GET /api/locations/search?q=term
// @access  Public
const searchMunicipalities = (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }
    
    const searchTerm = q.toLowerCase().trim();
    const results = [];
    
    // Buscar en todas las provincias
    Object.keys(CUBA_DIVISIONS).forEach(province => {
      CUBA_DIVISIONS[province].forEach(municipality => {
        if (municipality.toLowerCase().includes(searchTerm)) {
          results.push({
            municipality,
            province
          });
        }
      });
    });
    
    res.json({
      success: true,
      query: q,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error buscando municipios:', error);
    res.status(500).json({ 
      error: 'Error al buscar municipios' 
    });
  }
};

module.exports = {
  getProvincesController,
  getMunicipalitiesController,
  getAllDivisions,
  getDivisionsSimple,
  validateLocation,
  searchMunicipalities
};