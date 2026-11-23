// Auxiliares para ler dados de requisições (corpo JSON da API ou formulários das páginas).
const HttpError = require('./HttpError');

// Copia só os campos permitidos (evita que o cliente altere dono, perfil, status...).
// String vazia vira null (campo opcional apagado no formulário).
const escolher = (objeto, campos) => Object.fromEntries(
  campos.filter((c) => objeto?.[c] !== undefined).map((c) => [c, objeto[c] === '' ? null : objeto[c]]),
);

// Formulários HTML mandam checkbox como "on"/"true" (ou nada); a API manda boolean.
const booleano = (valor) => valor === true || valor === 'true' || valor === 'on' || valor === '1' || valor === 1;

// id de rota/corpo; inválido responde 404 (mesma resposta de "não existe").
const idValido = (valor, mensagem = 'Não encontrado.') => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, mensagem);
  return id;
};

// Exige pelo menos um campo para atualizar.
const exigirAlgum = (dados, aceitos) => {
  if (!Object.keys(dados).length) throw new HttpError(400, `Nada para atualizar. Campos aceitos: ${aceitos.join(', ')}.`);
  return dados;
};

module.exports = { escolher, booleano, idValido, exigirAlgum };
