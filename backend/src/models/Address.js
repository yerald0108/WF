// backend/src/models/Address.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const { isValidProvince, isValidMunicipality } = require('../utils/cubaDivisions');

const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  street: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Dirección completa: calle, avenida, número, apartamento, reparto'
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Municipio',
    validate: {
      isValidMunicipalityForProvince(value) {
        if (this.province && !isValidMunicipality(this.province, value)) {
          throw new Error(`El municipio "${value}" no pertenece a la provincia "${this.province}"`);
        }
      }
    }
  },
  province: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Provincia',
    validate: {
      isValidCubanProvince(value) {
        if (!isValidProvince(value)) {
          throw new Error(`"${value}" no es una provincia válida de Cuba`);
        }
      }
    }
  },
  references: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Referencias para encontrar la dirección'
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Dirección principal del usuario'
  }
}, {
  tableName: 'addresses',
  timestamps: true
});

// Relaciones
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'user_id' });

// Hook: Solo una dirección puede ser principal por usuario
Address.beforeSave(async (address) => {
  if (address.is_primary) {
    // Desmarcar otras direcciones principales del mismo usuario
    await Address.update(
      { is_primary: false },
      { 
        where: { 
          user_id: address.user_id,
          id: { [require('sequelize').Op.ne]: address.id }
        }
      }
    );
  }
});

// Método de instancia
Address.prototype.getFullAddress = function() {
  return `${this.street}, ${this.city}, ${this.province}`;
};

module.exports = Address;