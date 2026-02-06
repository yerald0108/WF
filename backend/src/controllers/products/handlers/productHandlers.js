// backend/src/controllers/products/handlers/productHandlers.js
const { validationResult } = require('express-validator');
const Product = require('../../../models/Product');
const Category = require('../../../models/Category');
const ProductQueryService = require('../services/productQueryService');
const ProductFilterService = require('../services/productFilterService');
const ResponseHelper = require('../helpers/responseHelpers');

class ProductHandlers {
  static async handleGetProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const offset = (page - 1) * limit;

      const whereClause = ProductFilterService.buildWhereClause(req.query);
      const { count, products } = await ProductQueryService.getProductsWithFilters(
        whereClause, 
        { ...req.query, limit, offset }
      );

      const totalPages = Math.ceil(count / limit);

      ResponseHelper.sendSuccess(res, {
        count: products.length,
        total: count,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        filters: req.query,
        data: products
      });
    } catch (error) {
      ResponseHelper.sendError(res, 'Error obteniendo productos', error);
    }
  }

  static async handleGetProductById(req, res) {
    try {
      const product = await ProductQueryService.getProductByIdOrSlug(req.params.id);

      if (!product) {
        return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
      }

      // Incrementar contador de vistas
      await product.increment('views');

      ResponseHelper.sendSuccess(res, { data: product });
    } catch (error) {
      ResponseHelper.sendError(res, 'Error obteniendo producto', error);
    }
  }

  static async handleCreateProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.sendValidationError(res, errors.array());
      }

      const productData = this.prepareProductData(req.body);

      // Verificar SKU único
      const existingSku = await ProductQueryService.checkSkuExists(productData.sku);
      if (existingSku) {
        return ResponseHelper.sendBadRequest(res, 'El SKU ya existe');
      }

      // Crear producto
      const product = await Product.create(productData);

      // Actualizar contador de categoría
      if (productData.category_id) {
        await Category.increment('products_count', { where: { id: productData.category_id } });
      }

      ResponseHelper.sendCreated(res, 'Producto creado exitosamente', { data: product });
    } catch (error) {
      ResponseHelper.sendError(res, 'Error creando producto', error);
    }
  }

  static async handleUpdateProduct(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
      }

      // Verificar SKU único si se está cambiando
      if (req.body.sku && req.body.sku !== product.sku) {
        const existingSku = await ProductQueryService.checkSkuExists(req.body.sku, product.id);
        if (existingSku) {
          return ResponseHelper.sendBadRequest(res, 'El SKU ya existe');
        }
      }

      // Actualizar producto
      await product.update(req.body);

      ResponseHelper.sendSuccess(res, 'Producto actualizado exitosamente', { data: product });
    } catch (error) {
      ResponseHelper.sendError(res, 'Error actualizando producto', error);
    }
  }

  static async handleDeleteProduct(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return ResponseHelper.sendNotFound(res, 'Producto no encontrado');
      }

      // Soft delete
      await product.update({ is_active: false });

      // Actualizar contador de categoría
      if (product.category_id) {
        await Category.decrement('products_count', { where: { id: product.category_id } });
      }

      ResponseHelper.sendSuccess(res, 'Producto eliminado exitosamente');
    } catch (error) {
      ResponseHelper.sendError(res, 'Error eliminando producto', error);
    }
  }

  static prepareProductData(body) {
    return {
      name: body.name,
      description: body.description,
      short_description: body.short_description,
      price: body.price,
      compare_price: body.compare_price,
      cost: body.cost,
      sku: body.sku,
      barcode: body.barcode,
      stock: body.stock || 0,
      min_stock: body.min_stock || 5,
      category: body.category,
      category_id: body.category_id,
      subcategory: body.subcategory,
      brand: body.brand,
      unit: body.unit || 'unidad',
      weight: body.weight,
      dimensions: body.dimensions,
      images: body.images || [],
      thumbnail: body.thumbnail,
      tags: body.tags || [],
      features: body.features || {},
      is_featured: body.is_featured || false,
      requires_shipping: body.requires_shipping !== false,
      tax_rate: body.tax_rate || 0,
      meta_title: body.meta_title,
      meta_description: body.meta_description
    };
  }
}

module.exports = ProductHandlers;