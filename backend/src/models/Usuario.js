const bcrypt = require('bcryptjs');
const { DataTypes, Model } = require('sequelize');

// Perfis de acesso (Web 2 exige no mínimo três).
const PERFIS = ['usuario', 'loja', 'admin'];

class Usuario extends Model {
  async verificarSenha(senha) {
    if (!this.senha_hash) throw new Error('Carregue o usuário com o escopo "comSenha" para verificar a senha.');
    return bcrypt.compare(senha, this.senha_hash);
  }

  // Garante que o hash nunca saia em respostas JSON, mesmo se carregado com o escopo "comSenha".
  toJSON() {
    const dados = { ...this.get() };
    delete dados.senha_hash;
    delete dados.senha;
    return dados;
  }
}

module.exports = (sequelize) => {
  Usuario.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o nome.' } },
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: { msg: 'E-mail já cadastrado.' },
      validate: { isEmail: { msg: 'E-mail inválido.' } },
      set(valor) { this.setDataValue('email', String(valor || '').trim().toLowerCase()); },
    },
    // Campo virtual: recebe a senha em texto, não é gravado; o hook gera senha_hash.
    senha: {
      type: DataTypes.VIRTUAL,
      validate: { len: { args: [6, 72], msg: 'A senha deve ter entre 6 e 72 caracteres.' } },
    },
    senha_hash: { type: DataTypes.STRING, allowNull: false, validate: { notNull: { msg: 'Informe a senha.' } } },
    perfil: {
      type: DataTypes.ENUM(...PERFIS),
      allowNull: false,
      defaultValue: 'usuario',
      validate: { isIn: { args: [PERFIS], msg: 'Perfil inválido.' } },
    },
    // Admin pode bloquear o usuário (RF09).
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'Usuario',
    tableName: 'usuarios',
    // Por padrão a consulta não traz o hash da senha.
    defaultScope: { attributes: { exclude: ['senha_hash'] } },
    scopes: { comSenha: { attributes: { include: ['senha_hash'] } } },
    hooks: {
      // beforeValidate: senha_hash é NOT NULL, então o hash precisa existir antes da validação.
      async beforeValidate(usuario) {
        if (usuario.senha) usuario.senha_hash = await bcrypt.hash(usuario.senha, 10);
      },
      // Em update({ senha }) o Sequelize só grava os campos enviados ("senha", que é virtual).
      // Sem isto o novo hash seria descartado e a senha não mudaria.
      beforeSave(usuario, options) {
        if (usuario.changed('senha_hash') && options.fields && !options.fields.includes('senha_hash')) {
          options.fields.push('senha_hash');
        }
      },
    },
  });

  Usuario.PERFIS = PERFIS;
  return Usuario;
};
