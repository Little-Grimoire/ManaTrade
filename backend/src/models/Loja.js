const { DataTypes, Model } = require('sequelize');

class Loja extends Model {}

module.exports = (sequelize) => {
  Loja.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // Dono da loja (usuário com perfil "loja"). unique => relação 1:1.
    usuario_id: { type: DataTypes.INTEGER, allowNull: false, unique: { msg: 'Este usuário já possui uma loja.' } },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o nome da loja.' } },
    },
    descricao: { type: DataTypes.TEXT },
    endereco: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o endereço.' } },
    },
    cidade: { type: DataTypes.STRING(100) },
    uf: { type: DataTypes.STRING(2) },
    // Usadas no mapa e no cálculo de distância (RF06).
    latitude: { type: DataTypes.DOUBLE, validate: { min: -90, max: 90 } },
    longitude: { type: DataTypes.DOUBLE, validate: { min: -180, max: 180 } },
    horario: { type: DataTypes.STRING(120) }, // ex.: "Seg–Sáb, 12h–22h"
    telefone: { type: DataTypes.STRING(30) },
    aceita_consignacao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Só lojas aprovadas pelo admin aparecem no app (RF06/RF09).
    aprovada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'Loja',
    tableName: 'lojas',
    scopes: { aprovadas: { where: { aprovada: true } } },
  });

  return Loja;
};
