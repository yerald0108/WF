// backend/scripts/init-db.js
const { sequelize } = require('../src/config/database');

// Importar todos los modelos
const User = require('../src/models/User');
const Address = require('../src/models/Address');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Review = require('../src/models/Review');
const { Cart, CartItem } = require('../src/models/Cart');
const { Order, OrderItem, OrderStatusHistory } = require('../src/models/Order');

const initDatabase = async () => {
  try {
    console.log('🔄 Iniciando sincronización de base de datos...\n');

    // Sincronizar modelos (crear tablas)
    // force: true eliminará las tablas existentes y las recreará
    // Cambiar a { alter: true } para actualizar sin perder datos
    await sequelize.sync({ force: true });
    
    console.log('✅ Base de datos sincronizada\n');
    console.log('📊 Tablas creadas:');
    console.log('   • users (Usuarios)');
    console.log('   • addresses (Direcciones)');
    console.log('   • categories (Categorías)');
    console.log('   • products (Productos)');
    console.log('   • reviews (Reseñas)');
    console.log('   • carts (Carritos)');
    console.log('   • cart_items (Items del carrito)');
    console.log('   • orders (Órdenes)');
    console.log('   • order_items (Items de órdenes)');
    console.log('   • order_status_history (Historial de estados)\n');

    // Datos de ejemplo (opcional)
    await seedDatabase();
    
    console.log('✅ Base de datos lista para usar');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
};

// Función para insertar datos de ejemplo
async function seedDatabase() {
  console.log('🌱 Insertando datos de ejemplo...\n');

  try {
    // Crear categorías
    const categories = await Category.bulkCreate([
      {
        name: 'Herramientas Manuales',
        slug: 'herramientas-manuales',
        description: 'Herramientas básicas para todo tipo de trabajo',
        icon: 'wrench',
        order: 1
      },
      {
        name: 'Herramientas Eléctricas',
        slug: 'herramientas-electricas',
        description: 'Taladros, sierras, lijadoras y más',
        icon: 'power',
        order: 2
      },
      {
        name: 'Pinturas',
        slug: 'pinturas',
        description: 'Pinturas, brochas y accesorios',
        icon: 'paint-brush',
        order: 3
      },
      {
        name: 'Plomería',
        slug: 'plomeria',
        description: 'Tuberías, llaves, accesorios',
        icon: 'droplet',
        order: 4
      },
      {
        name: 'Electricidad',
        slug: 'electricidad',
        description: 'Cables, enchufes, interruptores',
        icon: 'zap',
        order: 5
      },
      {
        name: 'Ferretería General',
        slug: 'ferreteria-general',
        description: 'Tornillos, clavos, adhesivos',
        icon: 'package',
        order: 6
      }
    ]);
    console.log(`✅ ${categories.length} categorías creadas`);

    // Crear usuario administrador
    const admin = await User.create({
      email: 'admin@ferreteria.com',
      password_hash: 'admin123',
      first_name: 'Admin',
      last_name: 'Principal',
      phone: '+53-7-832-0000',
      email_verified: true,
      role: 'admin'
    });
    console.log('✅ Usuario administrador creado (admin@ferreteria.com / admin123)');

    // Crear usuario de prueba
    const customer = await User.create({
      email: 'cliente@ejemplo.com',
      password_hash: 'password123',
      first_name: 'Carlos',
      last_name: 'Rodríguez',
      phone: '+53-5-234-5678',
      email_verified: true,
      role: 'customer'
    });
    console.log('✅ Usuario cliente creado (cliente@ejemplo.com / password123)');

    // Crear dirección de ejemplo
    await Address.create({
      user_id: customer.id,
      street: 'Calle 23 #456 entre G y H, Edificio López, Apto 3B, Vedado',
      city: 'Plaza de la Revolución',
      province: 'La Habana',
      references: 'Cerca del Malecón, edificio de color amarillo',
      is_primary: true
    });
    console.log('✅ Dirección de ejemplo creada');

    // Crear productos de ejemplo
    // ⚠️ NOTA: El slug se generará automáticamente en el hook beforeCreate
    const products = await Product.bulkCreate([
      {
        name: 'Martillo de Carpintero 16oz',
        description: 'Martillo profesional con mango de fibra de vidrio, cabeza de acero forjado. Ideal para trabajos de carpintería y construcción.',
        short_description: 'Martillo profesional 16oz con mango ergonómico',
        price: 15.99,
        compare_price: 19.99,
        cost: 8.50,
        sku: 'MART-001',
        stock: 50,
        min_stock: 10,
        category: 'Herramientas Manuales',
        category_id: categories[0].id,
        brand: 'Stanley',
        unit: 'unidad',
        weight: 0.5,
        tags: ['martillo', 'carpinteria', 'construccion'],
        is_featured: true,
        slug: 'martillo-de-carpintero-16oz'
      },
      {
        name: 'Taladro Eléctrico 500W',
        description: 'Taladro percutor de 500W con velocidad variable, reversible, incluye maletín y set de brocas. Perfecto para perforar madera, metal y concreto.',
        short_description: 'Taladro percutor 500W con accesorios',
        price: 89.99,
        compare_price: 119.99,
        cost: 55.00,
        sku: 'TAL-001',
        stock: 25,
        min_stock: 5,
        category: 'Herramientas Eléctricas',
        category_id: categories[1].id,
        brand: 'Bosch',
        unit: 'unidad',
        weight: 1.8,
        tags: ['taladro', 'electrico', 'percutor'],
        is_featured: true,
        slug: 'taladro-electrico-500w'
      },
      {
        name: 'Pintura Latex Interior Blanco 1 Galón',
        description: 'Pintura latex de alta calidad para interiores, acabado mate, excelente cubrimiento. Rendimiento: 35-40 m² por galón.',
        short_description: 'Pintura latex interior blanco mate 1 galón',
        price: 24.99,
        cost: 15.00,
        sku: 'PINT-001',
        stock: 100,
        min_stock: 20,
        category: 'Pinturas',
        category_id: categories[2].id,
        brand: 'Comex',
        unit: 'galón',
        weight: 4.5,
        tags: ['pintura', 'latex', 'interior', 'blanco'],
        slug: 'pintura-latex-interior-blanco-1-galon'
      },
      {
        name: 'Llave Inglesa Ajustable 10"',
        description: 'Llave inglesa de acero cromo vanadio, mandíbula ajustable, mango ergonómico con grip antideslizante.',
        short_description: 'Llave inglesa 10" ajustable',
        price: 12.99,
        cost: 6.50,
        sku: 'LLAV-001',
        stock: 40,
        min_stock: 10,
        category: 'Herramientas Manuales',
        category_id: categories[0].id,
        brand: 'Truper',
        unit: 'unidad',
        weight: 0.3,
        tags: ['llave', 'ajustable', 'plomeria'],
        slug: 'llave-inglesa-ajustable-10'
      },
      {
        name: 'Destornillador Set 6 Piezas',
        description: 'Set de 6 destornilladores con puntas magnéticas, incluye planos y phillips de diferentes medidas. Mangos ergonómicos.',
        short_description: 'Set 6 destornilladores magnéticos',
        price: 18.50,
        cost: 9.00,
        sku: 'DEST-001',
        stock: 60,
        min_stock: 15,
        category: 'Herramientas Manuales',
        category_id: categories[0].id,
        brand: 'Stanley',
        unit: 'set',
        weight: 0.6,
        tags: ['destornillador', 'set', 'magnetico'],
        slug: 'destornillador-set-6-piezas'
      }
    ]);
    console.log(`✅ ${products.length} productos creados`);

    // Actualizar contador de productos en categorías
    await Category.update(
      { products_count: 3 },
      { where: { id: categories[0].id } }
    );
    await Category.update(
      { products_count: 1 },
      { where: { id: categories[1].id } }
    );
    await Category.update(
      { products_count: 1 },
      { where: { id: categories[2].id } }
    );

    // Crear algunas reseñas
    await Review.bulkCreate([
      {
        product_id: products[0].id,
        user_id: customer.id,
        rating: 5,
        title: 'Excelente martillo',
        comment: 'Muy buena calidad, el mango es cómodo y la cabeza está bien balanceada.',
        verified_purchase: true
      },
      {
        product_id: products[1].id,
        user_id: customer.id,
        rating: 4,
        title: 'Buen taladro para el precio',
        comment: 'Funciona bien, tiene buena potencia. Le quito una estrella porque hace un poco de ruido.',
        verified_purchase: true
      }
    ]);
    console.log('✅ Reseñas de ejemplo creadas');

    console.log('\n✨ Datos de ejemplo insertados correctamente\n');

  } catch (error) {
    console.error('❌ Error insertando datos de ejemplo:', error);
    throw error;
  }
}

initDatabase();