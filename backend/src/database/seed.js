// Recria o banco e insere dados de demonstração (um usuário de cada perfil, lojas, coleção,
// deck, acervo, consignações e um chamado). As cartas vêm do Scryfall, então precisa de internet.
// Uso: npm run db:seed
const resetar = require('./reset');
const {
  sequelize, Usuario, Loja, Carta, ItemColecao, Deck, DeckCarta, ItemAcervo, Consignacao, Chamado, Desejo,
} = require('../models');

const SENHA = process.env.SEED_PASSWORD || 'manatrade123';

const NOMES_CARTAS = [
  'Lathril, Blade of the Elves', 'Sol Ring', 'Arcane Signet', 'Command Tower', 'Llanowar Elves',
  'Elvish Mystic', 'Elvish Archdruid', 'Priest of Titania', 'Cultivate', "Kodama's Reach",
  'Beast Within', 'Eternal Witness', 'Sheoldred, the Apocalypse', 'The One Ring', 'Birds of Paradise',
  'Lightning Bolt', 'Counterspell', 'Swords to Plowshares', 'Rhystic Study', 'Forest', 'Swamp',
];

async function buscarCartasNoScryfall(nomes) {
  const resposta = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'ManaTrade/1.0' },
    body: JSON.stringify({ identifiers: nomes.map((name) => ({ name })) }),
  });
  if (!resposta.ok) throw new Error(`Scryfall respondeu ${resposta.status}.`);
  const { data, not_found: naoEncontradas } = await resposta.json();
  if (naoEncontradas?.length) console.warn('Cartas não encontradas no Scryfall:', naoEncontradas);
  return data;
}

async function semear() {
  const jsonCartas = await buscarCartasNoScryfall(NOMES_CARTAS);
  await resetar();

  await sequelize.transaction(async (transaction) => {
    const t = { transaction };

    // Cartas (cache do Scryfall), indexadas pelo nome.
    const carta = {};
    for (const json of jsonCartas) carta[json.name] = await Carta.salvarDoScryfall(json, t);

    // Usuários: um de cada perfil (+ um segundo lojista e um segundo jogador).
    const criarUsuario = (nome, email, perfil) => Usuario.create({ nome, email, senha: SENHA, perfil }, t);
    const admin = await criarUsuario('Administrador', 'admin@manatrade.dev', 'admin');
    const lojista = await criarUsuario('Lojista Centro', 'loja@manatrade.dev', 'loja');
    const lojista2 = await criarUsuario('Lojista Bairro', 'loja2@manatrade.dev', 'loja');
    const jogador = await criarUsuario('Jogador Demo', 'jogador@manatrade.dev', 'usuario');
    const jogador2 = await criarUsuario('Segundo Jogador', 'jogador2@manatrade.dev', 'usuario');

    // Lojas (coordenadas em Dois Vizinhos/PR). A segunda ainda aguarda aprovação do admin.
    const loja = await Loja.create({
      usuario_id: lojista.id, nome: 'Loja Demo Centro', endereco: 'Av. Exemplo, 100', cidade: 'Dois Vizinhos', uf: 'PR',
      latitude: -25.7489, longitude: -53.0573, horario: 'Seg–Sáb, 13h–21h', aceita_consignacao: true, aprovada: true,
    }, t);
    await Loja.create({
      usuario_id: lojista2.id, nome: 'Loja Demo Bairro', endereco: 'Rua Exemplo, 200', cidade: 'Dois Vizinhos', uf: 'PR',
      latitude: -25.7350, longitude: -53.0710, horario: 'Ter–Dom, 14h–22h', aceita_consignacao: false, aprovada: false,
    }, t);

    // Coleção do jogador (N:N Usuário ↔ Carta).
    const colecao = {};
    const itens = [
      ['Sheoldred, the Apocalypse', 1, 'NM', false],
      ['The One Ring', 1, 'SP', false],
      ['Lightning Bolt', 4, 'MP', false],
      ['Counterspell', 2, 'NM', true],
      ['Rhystic Study', 1, 'NM', false],
      ['Birds of Paradise', 2, 'SP', false],
    ];
    for (const [nome, quantidade, condicao, foil] of itens) {
      if (!carta[nome]) continue;
      colecao[nome] = await ItemColecao.create({
        usuario_id: jogador.id, carta_id: carta[nome].id, quantidade, condicao, foil,
      }, t);
    }
    if (carta['Sol Ring']) await ItemColecao.create({ usuario_id: jogador2.id, carta_id: carta['Sol Ring'].id }, t);

    // Lista de desejos do jogador (N:N Usuário ↔ Carta).
    const desejos = [
      ['Swords to Plowshares', 'alta', 2.5, null],
      ['Cultivate', 'baixa', null, 'Qualquer edição'],
      ['Eternal Witness', 'media', 3, null],
    ];
    for (const [nome, prioridade, preco, observacao] of desejos) {
      if (carta[nome]) {
        await Desejo.create({ usuario_id: jogador.id, carta_id: carta[nome].id, prioridade, preco_maximo_usd: preco, observacao }, t);
      }
    }

    // Deck Commander (N:N Deck ↔ Carta).
    const deck = await Deck.create({
      usuario_id: jogador.id, nome: 'Elfos de Lathril', descricao: 'Deck de exemplo (incompleto).',
      comandante_id: carta['Lathril, Blade of the Elves']?.id,
    }, t);
    const lista = [
      ['Sol Ring', 1], ['Arcane Signet', 1], ['Command Tower', 1], ['Llanowar Elves', 1], ['Elvish Mystic', 1],
      ['Elvish Archdruid', 1], ['Priest of Titania', 1], ['Cultivate', 1], ["Kodama's Reach", 1],
      ['Beast Within', 1], ['Eternal Witness', 1], ['Forest', 10], ['Swamp', 8],
    ];
    for (const [nome, quantidade] of lista) {
      if (carta[nome]) await DeckCarta.create({ deck_id: deck.id, carta_id: carta[nome].id, quantidade }, t);
    }

    // Acervo da loja (N:N Loja ↔ Carta).
    const acervo = [['Sol Ring', 3, 'NM', 12.9], ['Swords to Plowshares', 2, 'SP', 9.5], ['Cultivate', 5, 'NM', 4.0]];
    for (const [nome, quantidade, condicao, preco] of acervo) {
      if (carta[nome]) await ItemAcervo.create({ loja_id: loja.id, carta_id: carta[nome].id, quantidade, condicao, preco }, t);
    }

    // Consignações em estados diferentes, passando pelo fluxo de status (gera notificações).
    const consignar = (nome, preco, observacao) => Consignacao.create({
      usuario_id: jogador.id, loja_id: loja.id, carta_id: carta[nome].id, item_colecao_id: colecao[nome].id,
      condicao: colecao[nome].condicao, foil: colecao[nome].foil, preco_pedido: preco, observacao,
    }, t);

    await consignar('Rhystic Study', 180, 'Aceito negociar.');

    const aVenda = await consignar('The One Ring', 450);
    await aVenda.update({ status: 'aceita', resposta_loja: 'Pode trazer a carta.' }, t);
    await aVenda.update({ status: 'a_venda' }, t);
    await ItemAcervo.create({
      loja_id: loja.id, carta_id: aVenda.carta_id, condicao: aVenda.condicao, preco: aVenda.preco_pedido, consignacao_id: aVenda.id,
    }, t);

    const recusada = await consignar('Birds of Paradise', 90);
    await recusada.update({ status: 'recusada', resposta_loja: 'Já temos muitas no estoque.' }, t);

    // Chamado de suporte já respondido pelo admin.
    const chamado = await Chamado.create({
      usuario_id: jogador.id, assunto: 'Loja não aparece no mapa', mensagem: 'A Loja Demo Bairro não aparece na lista.',
    }, t);
    await chamado.update({ atendente_id: admin.id, status: 'resolvido', resposta: 'A loja ainda aguarda aprovação.' }, t);
  });
}

if (require.main === module) {
  semear()
    .then(async () => {
      const contagens = await Promise.all(
        Object.values(sequelize.models).map(async (m) => `${m.tableName}: ${await m.count()}`),
      );
      console.log(`Banco populado (${sequelize.getDialect()}).\n  ${contagens.join('\n  ')}`);
      console.log(`\nLogins (senha "${SENHA}"): admin@manatrade.dev · loja@manatrade.dev · jogador@manatrade.dev`);
    })
    .catch((erro) => { console.error(erro); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = semear;
