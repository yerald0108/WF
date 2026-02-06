// backend/src/controllers/cartController.js
const CartService = require('../services/cartService');
const crypto = require('crypto');

/**
 * Obtener o generar session ID para invitados
 */
const getSessionId = (req) => {
  // Si hay session ID en cookies, usarlo
  if (req.cookies && req.cookies.session_id) {
    return req.cookies.session_id;
  }
  
  // Si hay session ID en headers, usarlo
  if (req.headers['x-session-id']) {
    return req.headers['x-session-id'];
  }

  // Generar nuevo session ID usando crypto nativo de Node.js
  return crypto.randomUUID();
};

/**
 * @desc    Obtener carrito actual del usuario
 * @route   GET /api/cart
 * @access  Public (con session ID) / Private (autenticado)
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);

    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const summary = await CartService.getCartSummary(cart.id);

    // Enviar session ID en la respuesta para invitados
    if (!userId && sessionId) {
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        sameSite: 'lax'
      });
    }

    res.json({
      success: true,
      sessionId: !userId ? sessionId : undefined,
      ...summary
    });
  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el carrito'
    });
  }
};

/**
 * @desc    Agregar producto al carrito
 * @route   POST /api/cart/items
 * @access  Public (con session ID) / Private (autenticado)
 */
const addItem = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'El ID del producto es requerido'
      });
    }

    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe estar entre 1 y 100'
      });
    }

    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);

    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const item = await CartService.addItem(cart.id, productId, parseInt(quantity));
    const summary = await CartService.getCartSummary(cart.id);

    // Enviar session ID en la respuesta para invitados
    if (!userId && sessionId) {
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Producto agregado al carrito',
      item,
      ...summary
    });
  } catch (error) {
    console.error('Error agregando item:', error);
    
    // Manejar errores específicos
    if (error.message.includes('Stock insuficiente') || 
        error.message.includes('no encontrado') ||
        error.message.includes('no disponible')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al agregar producto al carrito'
    });
  }
};

/**
 * @desc    Actualizar cantidad de un item
 * @route   PUT /api/cart/items/:itemId
 * @access  Public (con session ID) / Private (autenticado)
 */
const updateItemQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe ser al menos 1'
      });
    }

    const item = await CartService.updateItemQuantity(parseInt(itemId), parseInt(quantity));
    
    // Obtener resumen actualizado
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);
    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const summary = await CartService.getCartSummary(cart.id);

    res.json({
      success: true,
      message: 'Cantidad actualizada',
      item,
      ...summary
    });
  } catch (error) {
    console.error('Error actualizando cantidad:', error);
    
    if (error.message.includes('Stock insuficiente') || 
        error.message.includes('no encontrado')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al actualizar cantidad'
    });
  }
};

/**
 * @desc    Eliminar item del carrito
 * @route   DELETE /api/cart/items/:itemId
 * @access  Public (con session ID) / Private (autenticado)
 */
const removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    await CartService.removeItem(parseInt(itemId));
    
    // Obtener resumen actualizado
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);
    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const summary = await CartService.getCartSummary(cart.id);

    res.json({
      success: true,
      message: 'Producto eliminado del carrito',
      ...summary
    });
  } catch (error) {
    console.error('Error eliminando item:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto del carrito'
    });
  }
};

/**
 * @desc    Vaciar carrito
 * @route   DELETE /api/cart
 * @access  Public (con session ID) / Private (autenticado)
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);

    const cart = await CartService.getOrCreateCart(userId, sessionId);
    await CartService.clearCart(cart.id);

    res.json({
      success: true,
      message: 'Carrito vaciado',
      cart: {
        id: cart.id,
        itemsCount: 0
      },
      items: [],
      totals: {
        subtotal: 0,
        discount: 0,
        total: 0,
        itemCount: 0,
        savings: 0
      }
    });
  } catch (error) {
    console.error('Error vaciando carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al vaciar el carrito'
    });
  }
};

/**
 * @desc    Validar carrito (stock, precios, disponibilidad)
 * @route   GET /api/cart/validate
 * @access  Public (con session ID) / Private (autenticado)
 */
const validateCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);

    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const validation = await CartService.validateCart(cart.id);

    res.json({
      success: true,
      ...validation
    });
  } catch (error) {
    console.error('Error validando carrito:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar el carrito'
    });
  }
};

/**
 * @desc    Sincronizar precios del carrito
 * @route   POST /api/cart/sync-prices
 * @access  Public (con session ID) / Private (autenticado)
 */
const syncPrices = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);

    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const result = await CartService.syncPrices(cart.id);
    const summary = await CartService.getCartSummary(cart.id);

    res.json({
      success: true,
      message: result.updated ? 'Precios actualizados' : 'No hay cambios de precio',
      ...result,
      ...summary
    });
  } catch (error) {
    console.error('Error sincronizando precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar precios'
    });
  }
};

/**
 * @desc    Mergear carrito de invitado al autenticarse
 * @route   POST /api/cart/merge
 * @access  Private
 */
const mergeCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Debes estar autenticado'
      });
    }

    const sessionId = req.body.sessionId || req.cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'No hay carrito de invitado para fusionar'
      });
    }

    const result = await CartService.mergeGuestCart(sessionId, req.user.id);
    const summary = await CartService.getCartSummary(
      (await CartService.getOrCreateCart(req.user.id)).id
    );

    // Limpiar session ID cookie
    res.clearCookie('session_id');

    res.json({
      success: true,
      ...result,
      ...summary
    });
  } catch (error) {
    console.error('Error mergeando carritos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al fusionar carritos'
    });
  }
};

/**
 * @desc    Obtener conteo de items en el carrito
 * @route   GET /api/cart/count
 * @access  Public (con session ID) / Private (autenticado)
 */
const getCartCount = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = userId ? null : getSessionId(req);

    const cart = await CartService.getOrCreateCart(userId, sessionId);
    const totals = await CartService.calculateTotals(cart.id);

    res.json({
      success: true,
      count: totals.itemCount
    });
  } catch (error) {
    console.error('Error obteniendo conteo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener conteo del carrito'
    });
  }
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  validateCart,
  syncPrices,
  mergeCart,
  getCartCount
};