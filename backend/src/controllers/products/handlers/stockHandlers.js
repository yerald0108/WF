// backend/src/controllers/products/handlers/stockHandlers.js
const Product = require('../../../models/Product');
const ResponseHelper = require('../helpers/responseHelpers');

class StockHandlers {
  static async handleUpdateStock(req, res) {
    try {
      const { stock, operation = 'set' } = req.body;
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
      }

      if (stock === undefined || stock < 0) {
        return ResponseHelper.sendBadRequest(res, 'Stock inválido');
      }

      const newStock = this.calculateNewStock(product.stock, parseInt(stock), operation);
      
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
    } catch (error) {
      ResponseHelper.sendError(res, 'Error actualizando stock', error);
    }
  }

  static async handleGetLowStockProducts(req, res) {
    try {
      const products = await Product.findAll({
        where: {
          is_active: true,
          stock: {
            [Op.lte]: require('sequelize').col('min_stock')
          }
        },
        order: [['stock', 'ASC']],
        attributes: ['id', 'name', 'sku', 'stock', 'min_stock', 'price']
      });

      ResponseHelper.sendSuccess(res, { count: products.length, data: products });
    } catch (error) {
      ResponseHelper.sendError(res, 'Error obteniendo productos con bajo stock', error);
    }
  }

  static calculateNewStock(currentStock, stockChange, operation) {
    switch (operation) {
      case 'add':
        return currentStock + stockChange;
      case 'subtract':
        return Math.max(0, currentStock - stockChange);
      case 'set':
      default:
        return stockChange;
    }
  }
}

module.exports = StockHandlers;