// Carrega os models e define os relacionamentos.
//
// Relacionamentos exigidos em Web 2:
//   N:N  Deck ↔ Carta (deck_cartas) · Usuário ↔ Carta (itens_colecao e desejos) · Loja ↔ Carta (itens_acervo)
//   1:N  Usuário → Deck, ItemColecao, Desejo, Consignação, Chamado, Notificação · Loja → ItemAcervo, Consignação
//   1:1  Usuário (perfil loja) → Loja
//
// Política de exclusão (onDelete):
//   CASCADE  – dados que pertencem ao dono somem com ele (decks do usuário, acervo da loja...)
//   RESTRICT – uma carta em uso (coleção, acervo, consignação, deck) não pode ser apagada
//   SET NULL – referências opcionais (comandante, atendente do chamado, item de origem)
const sequelize = require('../config/database');

const Usuario = require('./Usuario')(sequelize);
const Loja = require('./Loja')(sequelize);
const Carta = require('./Carta')(sequelize);
const ItemColecao = require('./ItemColecao')(sequelize);
const Deck = require('./Deck')(sequelize);
const DeckCarta = require('./DeckCarta')(sequelize);
const ItemAcervo = require('./ItemAcervo')(sequelize);
const Consignacao = require('./Consignacao')(sequelize);
const Chamado = require('./Chamado')(sequelize);
const Notificacao = require('./Notificacao')(sequelize);
const Desejo = require('./Desejo')(sequelize);

const CASCADE = { onDelete: 'CASCADE', onUpdate: 'CASCADE' };
const RESTRICT = { onDelete: 'RESTRICT', onUpdate: 'CASCADE' };
const SET_NULL = { onDelete: 'SET NULL', onUpdate: 'CASCADE' };

// Relação dupla: declarar belongsTo e hasMany/hasOne nos dois lados permite include nos dois sentidos.
function umParaMuitos(pai, filho, foreignKey, asPai, asFilho, politica) {
  pai.hasMany(filho, { foreignKey, as: asFilho, ...politica });
  filho.belongsTo(pai, { foreignKey, as: asPai, ...politica });
}

// ---------- 1:1 ----------
Usuario.hasOne(Loja, { foreignKey: 'usuario_id', as: 'loja', ...CASCADE });
Loja.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'dono', ...CASCADE });

// ---------- 1:N ----------
umParaMuitos(Usuario, Deck, 'usuario_id', 'usuario', 'decks', CASCADE);
umParaMuitos(Usuario, ItemColecao, 'usuario_id', 'usuario', 'itensColecao', CASCADE);
umParaMuitos(Usuario, Desejo, 'usuario_id', 'usuario', 'desejos', CASCADE);
umParaMuitos(Usuario, Consignacao, 'usuario_id', 'usuario', 'consignacoes', CASCADE);
umParaMuitos(Usuario, Chamado, 'usuario_id', 'usuario', 'chamados', CASCADE);
umParaMuitos(Usuario, Chamado, 'atendente_id', 'atendente', 'chamadosAtendidos', SET_NULL);
umParaMuitos(Usuario, Notificacao, 'usuario_id', 'usuario', 'notificacoes', CASCADE);

umParaMuitos(Loja, ItemAcervo, 'loja_id', 'loja', 'itensAcervo', CASCADE);
umParaMuitos(Loja, Consignacao, 'loja_id', 'loja', 'consignacoes', CASCADE);

umParaMuitos(Carta, ItemColecao, 'carta_id', 'carta', 'itensColecao', RESTRICT);
umParaMuitos(Carta, Desejo, 'carta_id', 'carta', 'desejos', RESTRICT);
umParaMuitos(Carta, ItemAcervo, 'carta_id', 'carta', 'itensAcervo', RESTRICT);
umParaMuitos(Carta, Consignacao, 'carta_id', 'carta', 'consignacoes', RESTRICT);
umParaMuitos(Carta, Deck, 'comandante_id', 'comandante', 'decksComoComandante', SET_NULL);

umParaMuitos(ItemColecao, Consignacao, 'item_colecao_id', 'itemColecao', 'consignacoes', SET_NULL);
umParaMuitos(Consignacao, ItemAcervo, 'consignacao_id', 'consignacao', 'itensAcervo', SET_NULL);

umParaMuitos(Deck, DeckCarta, 'deck_id', 'deck', 'itens', CASCADE);
umParaMuitos(Carta, DeckCarta, 'carta_id', 'carta', 'itensDeck', RESTRICT);

// ---------- N:N ----------
// onDelete explícito: sem ele o belongsToMany usaria CASCADE nos dois lados.
// unique: false porque a tabela associativa pode repetir o par com condição/foil diferentes.
Usuario.belongsToMany(Carta, { through: { model: ItemColecao, unique: false }, foreignKey: 'usuario_id', otherKey: 'carta_id', as: 'colecao', ...CASCADE });
Carta.belongsToMany(Usuario, { through: { model: ItemColecao, unique: false }, foreignKey: 'carta_id', otherKey: 'usuario_id', as: 'colecionadores', ...RESTRICT });

Usuario.belongsToMany(Carta, { through: Desejo, foreignKey: 'usuario_id', otherKey: 'carta_id', as: 'cartasDesejadas', ...CASCADE });
Carta.belongsToMany(Usuario, { through: Desejo, foreignKey: 'carta_id', otherKey: 'usuario_id', as: 'interessados', ...RESTRICT });

Loja.belongsToMany(Carta, { through: { model: ItemAcervo, unique: false }, foreignKey: 'loja_id', otherKey: 'carta_id', as: 'acervo', ...CASCADE });
Carta.belongsToMany(Loja, { through: { model: ItemAcervo, unique: false }, foreignKey: 'carta_id', otherKey: 'loja_id', as: 'lojas', ...RESTRICT });

Deck.belongsToMany(Carta, { through: DeckCarta, foreignKey: 'deck_id', otherKey: 'carta_id', as: 'cartas', ...CASCADE });
Carta.belongsToMany(Deck, { through: DeckCarta, foreignKey: 'carta_id', otherKey: 'deck_id', as: 'decks', ...RESTRICT });

module.exports = {
  sequelize,
  Usuario,
  Loja,
  Carta,
  ItemColecao,
  Deck,
  DeckCarta,
  ItemAcervo,
  Consignacao,
  Chamado,
  Notificacao,
  Desejo,
};
