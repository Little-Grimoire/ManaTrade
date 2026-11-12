const { DataTypes, Model } = require('sequelize');

// Cache local de cartas do Scryfall: guardamos só o que o sistema usa + o scryfall_id.
// Cada linha é uma impressão (edição) específica da carta.
class Carta extends Model {
  // Converte o JSON de /cards do Scryfall nos campos da tabela.
  static camposDoScryfall(c) {
    const imagens = c.image_uris || c.card_faces?.[0]?.image_uris || {};
    return {
      scryfall_id: c.id,
      oracle_id: c.oracle_id || c.card_faces?.[0]?.oracle_id || null,
      nome: c.name,
      edicao: c.set_name,
      codigo_edicao: c.set,
      numero_colecionador: c.collector_number,
      tipo: c.type_line || c.card_faces?.[0]?.type_line || null,
      custo_mana: c.mana_cost ?? c.card_faces?.[0]?.mana_cost ?? null,
      cmc: c.cmc ?? null,
      identidade_cor: (c.color_identity || []).join(''),
      raridade: c.rarity,
      imagem_url: imagens.normal || imagens.small || null,
      preco_usd: c.prices?.usd ?? null,
      legalidades: c.legalities || null,
    };
  }

  // Busca pelo scryfall_id; se não existir, cria. Se já existir, atualiza preço/imagem.
  static async salvarDoScryfall(json, opcoes = {}) {
    const campos = Carta.camposDoScryfall(json);
    const [carta, criada] = await Carta.findOrCreate({
      where: { scryfall_id: campos.scryfall_id },
      defaults: campos,
      ...opcoes,
    });
    if (!criada) await carta.update(campos, opcoes);
    return carta;
  }
}

module.exports = (sequelize) => {
  Carta.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scryfall_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    // Identifica a carta independente da edição; é a chave usada pelo modelo de ML.
    oracle_id: { type: DataTypes.UUID },
    nome: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: { msg: 'Informe o nome da carta.' } },
    },
    edicao: { type: DataTypes.STRING(120) },
    codigo_edicao: { type: DataTypes.STRING(10) },
    numero_colecionador: { type: DataTypes.STRING(20) },
    tipo: { type: DataTypes.STRING(200) },
    custo_mana: { type: DataTypes.STRING(60) },
    // Valor de mana (custo convertido), usado na curva de mana do deck.
    cmc: { type: DataTypes.DECIMAL(5, 1) },
    // Letras WUBRG concatenadas (ex.: "UG"); vazio = incolor.
    identidade_cor: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '',
      validate: { is: { args: /^[WUBRG]*$/, msg: 'Identidade de cor inválida (use WUBRG).' } },
    },
    raridade: { type: DataTypes.STRING(20) },
    imagem_url: { type: DataTypes.STRING(500) },
    // Preço de referência do Scryfall (só exibição; não há precificação automática).
    preco_usd: { type: DataTypes.DECIMAL(10, 2) },
    // Legalidade por formato, como vem do Scryfall: { commander: 'legal', pauper: 'not_legal', ... }
    legalidades: { type: DataTypes.JSON },
  }, {
    sequelize,
    modelName: 'Carta',
    tableName: 'cartas',
    indexes: [{ fields: ['nome'] }, { fields: ['oracle_id'] }],
  });

  return Carta;
};
