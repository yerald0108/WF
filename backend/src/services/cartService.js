// backend/src/services/cartService.js
const { Cart, CartItem } = require('../models/Cart');
const Product = require('../models/Product');
const { Op } = require('sequelize');

class CartService {
  /**
   * Obtener o crear carrito para un usuario
   * @param {number} userId - ID del usuario
   * @param {string} sessionId - ID de sesión para invitados
   * @returns {Object} - Carrito
   */
  static async getOrCreateCart(userId, sessionId = null) {
    try {
      let cart;

      if (userId) {
        // Usuario autenticado
        cart = await Cart.findOne({
          where: { 
            user_id: userId,
            status: 'active'
          },
          include: [{
            model: CartItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'stock', 'is_active']
            }]
          }]
        });

        if (!cart) {
          cart = await Cart.create({ user_id: userId });
        }
      } else if (sessionId) {
        // Usuario invitado
        cart = await Cart.findOne({
          where: { 
            session_id: sessionId,
            status: 'active'
          },
          include: [{
            model: CartItem,
            as: 'items',
            include: [{
              model: Product,
              attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'stock', 'is_active']
            }]
          }]
        });

        if (!cart) {
          cart = await Cart.create({ 
            session_id: sessionId,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
          });
        }
      }

      return cart;
    } catch (error) {
      console.error('Error obteniendo/creando carrito:', error);
      throw error;
    }
  }

  /**
   * Agregar producto al carrito
   * @param {number} cartId - ID del carrito
   * @param {number} productId - ID del producto
   * @param {number} quantity - Cantidad a agregar
   * @returns {Object} - Item del carrito
   */
  static async addItem(cartId, productId, quantity = 1) {
    try {
      // Verificar que el producto existe y está activo
      const product = await Product.findByPk(productId);
      
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      if (!product.is_active) {
        throw new Error('Producto no disponible');
      }

      // Verificar stock
      if (product.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${product.stock}`);
      }

      // Verificar si el producto ya está en el carrito
      let cartItem = await CartItem.findOne({
        where: {
          cart_id: cartId,
          product_id: productId
        }
      });

      if (cartItem) {
        // Actualizar cantidad
        const newQuantity = cartItem.quantity + quantity;
        
        if (product.stock < newQuantity) {
          throw new Error(`Stock insuficiente. Disponible: ${product.stock}, en carrito: ${cartItem.quantity}`);
        }

        cartItem.quantity = newQuantity;
        await cartItem.save();
      } else {
        // Crear nuevo item
        cartItem = await CartItem.create({
          cart_id: cartId,
          product_id: productId,
          quantity,
          price: product.price,
          discount: product.compare_price ? product.compare_price - product.price : 0
        });
      }

      // Retornar item con información del producto
      return await CartItem.findByPk(cartItem.id, {
        include: [{
          model: Product,
          attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'stock']
        }]
      });
    } catch (error) {
      console.error('Error agregando item al carrito:', error);
      throw error;
    }
  }

  /**
   * Actualizar cantidad de un item
   * @param {number} cartItemId - ID del item del carrito
   * @param {number} quantity - Nueva cantidad
   * @returns {Object} - Item actualizado
   */
  static async updateItemQuantity(cartItemId, quantity) {
    try {
      if (quantity < 1) {
        throw new Error('La cantidad debe ser al menos 1');
      }

      const cartItem = await CartItem.findByPk(cartItemId, {
        include: [{ model: Product }]
      });

      if (!cartItem) {
        throw new Error('Item no encontrado en el carrito');
      }

      // Verificar stock
      if (cartItem.Product.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${cartItem.Product.stock}`);
      }

      cartItem.quantity = quantity;
      await cartItem.save();

      return await CartItem.findByPk(cartItemId, {
        include: [{
          model: Product,
          attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'stock']
        }]
      });
    } catch (error) {
      console.error('Error actualizando cantidad:', error);
      throw error;
    }
  }

  /**
   * Eliminar item del carrito
   * @param {number} cartItemId - ID del item a eliminar
   */
  static async removeItem(cartItemId) {
    try {
      const cartItem = await CartItem.findByPk(cartItemId);
      
      if (!cartItem) {
        throw new Error('Item no encontrado en el carrito');
      }

      await cartItem.destroy();
      return { success: true };
    } catch (error) {
      console.error('Error eliminando item:', error);
      throw error;
    }
  }

  /**
   * Vaciar carrito
   * @param {number} cartId - ID del carrito
   */
  static async clearCart(cartId) {
    try {
      await CartItem.destroy({
        where: { cart_id: cartId }
      });
      return { success: true };
    } catch (error) {
      console.error('Error vaciando carrito:', error);
      throw error;
    }
  }

  /**
   * Calcular totales del carrito
   * @param {number} cartId - ID del carrito
   * @returns {Object} - Totales
   */
  static async calculateTotals(cartId) {
    try {
      const items = await CartItem.findAll({
        where: { cart_id: cartId },
        include: [{ model: Product }]
      });

      let subtotal = 0;
      let discount = 0;
      let itemCount = 0;

      items.forEach(item => {
        const itemSubtotal = parseFloat(item.price) * item.quantity;
        const itemDiscount = parseFloat(item.discount) * item.quantity;
        
        subtotal += itemSubtotal;
        discount += itemDiscount;
        itemCount += item.quantity;
      });

      const total = subtotal;

      return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        itemCount,
        savings: parseFloat(discount.toFixed(2))
      };
    } catch (error) {
      console.error('Error calculando totales:', error);
      throw error;
    }
  }

  /**
   * Validar disponibilidad de todos los items del carrito
   * @param {number} cartId - ID del carrito
   * @returns {Object} - Resultado de validación
   */
  static async validateCart(cartId) {
    try {
      const items = await CartItem.findAll({
        where: { cart_id: cartId },
        include: [{ model: Product }]
      });

      const errors = [];
      const warnings = [];

      for (const item of items) {
        const product = item.Product;

        // Producto inactivo
        if (!product.is_active) {
          errors.push({
            itemId: item.id,
            productId: product.id,
            productName: product.name,
            type: 'inactive',
            message: `${product.name} ya no está disponible`
          });
        }

        // Stock insuficiente
        if (product.stock < item.quantity) {
          if (product.stock === 0) {
            errors.push({
              itemId: item.id,
              productId: product.id,
              productName: product.name,
              type: 'out_of_stock',
              message: `${product.name} está agotado`,
              requestedQuantity: item.quantity,
              availableStock: 0
            });
          } else {
            warnings.push({
              itemId: item.id,
              productId: product.id,
              productName: product.name,
              type: 'insufficient_stock',
              message: `${product.name}: Solo quedan ${product.stock} unidades`,
              requestedQuantity: item.quantity,
              availableStock: product.stock
            });
          }
        }

        // Cambio de precio
        if (parseFloat(product.price) !== parseFloat(item.price)) {
          warnings.push({
            itemId: item.id,
            productId: product.id,
            productName: product.name,
            type: 'price_changed',
            message: `El precio de ${product.name} ha cambiado`,
            oldPrice: parseFloat(item.price),
            newPrice: parseFloat(product.price)
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        itemsCount: items.length
      };
    } catch (error) {
      console.error('Error validando carrito:', error);
      throw error;
    }
  }

  /**
   * Sincronizar precios del carrito con precios actuales
   * @param {number} cartId - ID del carrito
   */
  static async syncPrices(cartId) {
    try {
      const items = await CartItem.findAll({
        where: { cart_id: cartId },
        include: [{ model: Product }]
      });

      const updates = [];

      for (const item of items) {
        const product = item.Product;
        const currentPrice = parseFloat(product.price);
        const currentDiscount = product.compare_price ? product.compare_price - product.price : 0;

        if (parseFloat(item.price) !== currentPrice || parseFloat(item.discount) !== currentDiscount) {
          item.price = currentPrice;
          item.discount = currentDiscount;
          await item.save();
          
          updates.push({
            productId: product.id,
            productName: product.name,
            oldPrice: parseFloat(item.price),
            newPrice: currentPrice
          });
        }
      }

      return {
        updated: updates.length > 0,
        updates
      };
    } catch (error) {
      console.error('Error sincronizando precios:', error);
      throw error;
    }
  }

  /**
   * Mergear carrito de invitado con carrito de usuario autenticado
   * @param {string} sessionId - ID de sesión del invitado
   * @param {number} userId - ID del usuario
   */
  static async mergeGuestCart(sessionId, userId) {
    try {
      // Carrito de invitado
      const guestCart = await Cart.findOne({
        where: { 
          session_id: sessionId,
          status: 'active'
        },
        include: [{
          model: CartItem,
          as: 'items'
        }]
      });

      if (!guestCart || !guestCart.items || guestCart.items.length === 0) {
        return { merged: false, message: 'No hay items en el carrito de invitado' };
      }

      // Carrito del usuario
      const userCart = await this.getOrCreateCart(userId);

      // Mergear items
      for (const guestItem of guestCart.items) {
        try {
          await this.addItem(userCart.id, guestItem.product_id, guestItem.quantity);
        } catch (error) {
          console.warn(`No se pudo agregar item ${guestItem.product_id}:`, error.message);
        }
      }

      // Marcar carrito de invitado como completado
      guestCart.status = 'completed';
      await guestCart.save();

      return {
        merged: true,
        message: 'Carrito de invitado fusionado exitosamente'
      };
    } catch (error) {
      console.error('Error mergeando carritos:', error);
      throw error;
    }
  }

  /**
   * Limpiar carritos expirados (ejecutar en cron job)
   */
  static async cleanExpiredCarts() {
    try {
      const result = await Cart.destroy({
        where: {
          session_id: { [Op.ne]: null },
          expires_at: { [Op.lt]: new Date() },
          status: 'active'
        }
      });

      return {
        deleted: result,
        message: `${result} carritos expirados eliminados`
      };
    } catch (error) {
      console.error('Error limpiando carritos expirados:', error);
      throw error;
    }
  }

  /**
   * Obtener resumen del carrito
   * @param {number} cartId - ID del carrito
   * @returns {Object} - Resumen completo
   */
  static async getCartSummary(cartId) {
    try {
      const cart = await Cart.findByPk(cartId, {
        include: [{
          model: CartItem,
          as: 'items',
          include: [{
            model: Product,
            attributes: ['id', 'name', 'slug', 'price', 'compare_price', 'thumbnail', 'stock', 'is_active']
          }]
        }]
      });

      if (!cart) {
        throw new Error('Carrito no encontrado');
      }

      const totals = await this.calculateTotals(cartId);
      const validation = await this.validateCart(cartId);

      return {
        cart: {
          id: cart.id,
          status: cart.status,
          createdAt: cart.createdAt,
          itemsCount: cart.items.length
        },
        items: cart.items.map(item => ({
          id: item.id,
          product: {
            id: item.Product.id,
            name: item.Product.name,
            slug: item.Product.slug,
            thumbnail: item.Product.thumbnail,
            stock: item.Product.stock,
            isActive: item.Product.is_active
          },
          quantity: item.quantity,
          price: parseFloat(item.price),
          discount: parseFloat(item.discount),
          subtotal: parseFloat((item.price * item.quantity).toFixed(2)),
          total: parseFloat(((item.price - item.discount) * item.quantity).toFixed(2))
        })),
        totals,
        validation
      };
    } catch (error) {
      console.error('Error obteniendo resumen del carrito:', error);
      throw error;
    }
  }
}

module.exports = CartService;