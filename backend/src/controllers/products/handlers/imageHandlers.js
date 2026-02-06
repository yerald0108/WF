// backend/src/controllers/products/handlers/imageHandlers.js
const Product = require('../../../models/Product');
const ResponseHelper = require('../helpers/responseHelpers');

class ImageHandlers {
  static async handleUpdateProductImages(req, res) {
    try {
      const { images, thumbnail, operation = 'set' } = req.body;
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
      }

      const newImages = this.processImages(product.images || [], images, operation);
      const updates = { images: newImages };
      
      if (thumbnail) {
        updates.thumbnail = thumbnail;
      }

      await product.update(updates);

      ResponseHelper.sendSuccess(res, 'Imágenes actualizadas exitosamente', {
        data: {
          id: product.id,
          images: newImages,
          thumbnail: product.thumbnail
        }
      });
    } catch (error) {
      ResponseHelper.sendError(res, 'Error actualizando imágenes', error);
    }
  }

  static processImages(currentImages, newImages, operation) {
    if (!Array.isArray(newImages)) return currentImages;

    switch (operation) {
      case 'add':
        return [...currentImages, ...newImages];
      case 'remove':
        return currentImages.filter(img => !newImages.includes(img));
      case 'set':
      default:
        return newImages;
    }
  }
}

module.exports = ImageHandlers;