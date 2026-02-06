require('dotenv').config();
const { sequelize, testConnection } = require('./src/config/database');

testConnection().then(async (connected) => {
  if (connected) {
    console.log('✅ ¡Conexión exitosa a PostgreSQL!');
    console.log('📊 Base de datos:', process.env.DB_NAME);
    console.log('🏠 Host:', process.env.DB_HOST);
    console.log('🔌 Puerto:', process.env.DB_PORT);
  } else {
    console.log('❌ No se pudo conectar a PostgreSQL');
    console.log('Verifica tu archivo .env y que PostgreSQL esté corriendo');
  }
  await sequelize.close();
  process.exit();
});