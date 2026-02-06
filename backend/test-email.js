// backend/test-email.js
require('dotenv').config();
const { 
  verifyEmailConfig,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail
} = require('./src/services/emailService');

const testEmail = async () => {
  console.log('\n🧪 Iniciando prueba de configuración de email...\n');

  // Verificar configuración
  console.log('📋 Configuración actual:');
  console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST}`);
  console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT}`);
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NO CONFIGURADO'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}\n`);

  // Verificar conexión
  const isConfigured = await verifyEmailConfig();
  
  if (!isConfigured) {
    console.log('\n❌ Error: La configuración de email no es válida.');
    console.log('\n📝 Pasos para solucionar:');
    console.log('   1. Verifica que EMAIL_USER tenga tu email de Gmail');
    console.log('   2. Verifica que EMAIL_PASS tenga la contraseña de aplicación');
    console.log('   3. Verifica que la verificación en 2 pasos esté activada');
    console.log('   4. Genera una nueva contraseña de aplicación si es necesario\n');
    process.exit(1);
  }

  console.log('\n✅ Configuración de email verificada correctamente\n');

  // Preguntar si desea enviar emails de prueba
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('¿Deseas enviar emails de prueba? (s/n): ', async (answer) => {
    if (answer.toLowerCase() === 's') {
      readline.question('Ingresa tu email para las pruebas: ', async (testEmailAddress) => {
        console.log('\n📧 Enviando emails de prueba...\n');

        try {
          // 1. Email de verificación
          console.log('1️⃣ Enviando email de verificación...');
          await sendVerificationEmail(
            testEmailAddress,
            'TEST-TOKEN-123456',
            'Usuario de Prueba'
          );
          console.log('   ✅ Email de verificación enviado\n');

          // 2. Email de recuperación de contraseña
          console.log('2️⃣ Enviando email de recuperación de contraseña...');
          await sendPasswordResetEmail(
            testEmailAddress,
            'TEST-RESET-TOKEN-789',
            'Usuario de Prueba'
          );
          console.log('   ✅ Email de recuperación enviado\n');

          // 3. Email de confirmación de orden
          console.log('3️⃣ Enviando email de confirmación de orden...');
          await sendOrderConfirmationEmail(testEmailAddress, {
            orderNumber: 'ORD-TEST-001',
            userName: 'Usuario de Prueba',
            total: 99.99,
            paymentMethod: 'Efectivo',
            items: [
              {
                product_name: 'Martillo de Carpintero',
                quantity: 2,
                unit_price: 15.99,
                total: 31.98
              },
              {
                product_name: 'Destornillador Set 6 Piezas',
                quantity: 1,
                unit_price: 18.50,
                total: 18.50
              }
            ],
            shippingAddress: {
              street: 'Calle 23 #456, Vedado',
              city: 'Plaza de la Revolución',
              province: 'La Habana',
              references: 'Edificio amarillo, tercer piso'
            }
          });
          console.log('   ✅ Email de confirmación de orden enviado\n');

          console.log('✨ ¡Todos los emails de prueba fueron enviados!\n');
          console.log(`📬 Revisa la bandeja de entrada de: ${testEmailAddress}\n`);
          console.log('💡 Si no ves los emails:');
          console.log('   - Revisa la carpeta de SPAM/Promociones');
          console.log('   - Espera unos minutos (a veces tardan)');
          console.log('   - Verifica que el email esté escrito correctamente\n');

        } catch (error) {
          console.error('\n❌ Error enviando emails de prueba:', error.message);
        }

        readline.close();
        process.exit(0);
      });
    } else {
      console.log('\n✅ Prueba de configuración completada. No se enviaron emails.\n');
      readline.close();
      process.exit(0);
    }
  });
};

testEmail();