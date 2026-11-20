// Lojas parceiras (RF06). Usuário com perfil "loja" tem no máximo uma (1:1); o admin aprova (RF09).
const {
  Loja, Usuario, ItemAcervo, Carta,
} = require('../models');
const HttpError = require('../utils/HttpError');
const { escolher, booleano, exigirAlgum } = require('../utils/campos');

const CAMPOS = ['nome', 'descricao', 'endereco', 'cidade', 'uf', 'latitude', 'longitude', 'horario', 'telefone', 'aceita_consignacao'];
const CAMPOS_ADMIN = [...CAMPOS, 'aprovada'];
const incluirDono = { model: Usuario, as: 'dono', attributes: ['id', 'nome', 'email', 'ativo'] };

const normalizar = (campos) => {
  for (const c of ['aceita_consignacao', 'aprovada']) if (campos[c] !== undefined) campos[c] = booleano(campos[c]);
  return campos;
};

// Jogadores e lojas veem só as lojas aprovadas; o admin vê todas (e pode filtrar por aprovada).
async function listar(usuario, { aprovada, cidade } = {}) {
  const where = {};
  if (usuario.perfil !== 'admin') where.aprovada = true;
  else if (aprovada !== undefined && aprovada !== '') where.aprovada = booleano(aprovada);
  if (cidade) where.cidade = cidade;
  return Loja.findAll({ where, include: incluirDono, order: [['nome', 'ASC']] });
}

// Loja pendente só é visível para o dono e para o admin.
const podeVer = (usuario, loja) => loja.aprovada || usuario.perfil === 'admin' || loja.usuario_id === usuario.id;

// Perfil loja cria a própria (nasce não aprovada). Admin cria para um usuário de perfil loja e pode já aprovar.
async function criar(usuario, dados) {
  let donoId = usuario.id;
  let campos = escolher(dados, CAMPOS);

  if (usuario.perfil === 'admin') {
    donoId = Number(dados.usuario_id);
    const dono = await Usuario.findByPk(donoId);
    if (!dono) throw new HttpError(400, 'Informe usuario_id de um usuário existente.');
    if (dono.perfil !== 'loja') throw new HttpError(400, 'O dono da loja precisa ter o perfil "loja".');
    campos = escolher(dados, CAMPOS_ADMIN);
  } else {
    campos.aprovada = false;
  }

  if (await Loja.count({ where: { usuario_id: donoId } })) throw new HttpError(409, 'Este usuário já possui uma loja.');
  const loja = await Loja.create({ ...normalizar(campos), usuario_id: donoId });
  return loja.reload({ include: incluirDono });
}

// Dono edita os dados; só o admin muda "aprovada".
async function atualizar(usuario, loja, dados) {
  const aceitos = usuario.perfil === 'admin' ? CAMPOS_ADMIN : CAMPOS;
  if (usuario.perfil !== 'admin' && dados?.aprovada !== undefined) {
    throw new HttpError(403, 'Só o administrador aprova lojas.');
  }
  await loja.update(normalizar(exigirAlgum(escolher(dados, aceitos), aceitos)));
  return loja.reload({ include: incluirDono });
}

// Apaga também o acervo e as consignações da loja (CASCADE).
const remover = (loja) => loja.destroy();

// Estoque à venda de uma loja (vitrine).
const acervoDaLoja = (lojaId) => ItemAcervo.findAll({
  where: { loja_id: lojaId },
  include: { model: Carta, as: 'carta' },
  order: [[{ model: Carta, as: 'carta' }, 'nome', 'ASC']],
});

module.exports = {
  listar, podeVer, criar, atualizar, remover, acervoDaLoja, incluirDono, CAMPOS, CAMPOS_ADMIN,
};
