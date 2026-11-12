// Regras dos formatos de deck e validação. Módulo puro (não acessa o banco).
//
// Campos de cada formato:
//   minimo/maximo   tamanho do deck (o comandante conta como 1)
//   copias          máximo de cópias da mesma carta (terrenos básicos são livres)
//   comandante      exige comandante e identidade de cor
//   legalidade      chave em carta.legalidades (dados do Scryfall); null = não verifica
const FORMATOS = {
  commander: { nome: 'Commander', minimo: 100, maximo: 100, copias: 1, comandante: true, legalidade: 'commander' },
  pauper: { nome: 'Pauper', minimo: 60, copias: 4, legalidade: 'pauper' },
  standard: { nome: 'Standard', minimo: 60, copias: 4, legalidade: 'standard' },
  pioneer: { nome: 'Pioneer', minimo: 60, copias: 4, legalidade: 'pioneer' },
  modern: { nome: 'Modern', minimo: 60, copias: 4, legalidade: 'modern' },
  legacy: { nome: 'Legacy', minimo: 60, copias: 4, legalidade: 'legacy' },
  vintage: { nome: 'Vintage', minimo: 60, copias: 4, legalidade: 'vintage' },
  casual: { nome: 'Livre', copias: null, legalidade: null },
};

const ehTerrenoBasico = (carta) => /\bBasic\b/.test(carta?.tipo || '') && /\bLand\b/.test(carta?.tipo || '');
const ehComandanteValido = (carta) => /\bLegendary\b/.test(carta?.tipo || '') && /\bCreature\b/.test(carta?.tipo || '');
const dentroDaIdentidade = (carta, identidade) => [...(carta?.identidade_cor || '')].every((cor) => identidade.includes(cor));

// Status de legalidade do Scryfall -> mensagem (undefined = ok ou desconhecido).
function problemaDeLegalidade(carta, regra) {
  if (!regra.legalidade || !carta?.legalidades) return undefined;
  const status = carta.legalidades[regra.legalidade];
  if (status === 'banned') return `Banida no ${regra.nome}`;
  if (status === 'not_legal') return `Não é legal no ${regra.nome}`;
  return undefined;
}

// Limite de cópias da carta neste formato (cartas "restricted" no Vintage: 1).
function limiteDeCopias(carta, regra) {
  if (!regra.copias || ehTerrenoBasico(carta)) return null;
  if (regra.legalidade && carta?.legalidades?.[regra.legalidade] === 'restricted') return 1;
  return regra.copias;
}

/**
 * Valida um deck.
 * @param {string} formato     chave de FORMATOS
 * @param {object|null} comandante  carta (objeto com tipo, identidade_cor, legalidades)
 * @param {Array<{carta, quantidade}>} itens
 * @returns {{ valido, total, minimo, maximo, problemas: string[], porCarta: Record<number, string[]> }}
 */
function validarDeck(formato, comandante, itens) {
  const regra = FORMATOS[formato] || FORMATOS.casual;
  const problemas = [];
  const porCarta = {};
  const marcar = (cartaId, msg) => { (porCarta[cartaId] ||= []).push(msg); };

  const total = itens.reduce((soma, i) => soma + i.quantidade, 0) + (regra.comandante && comandante ? 1 : 0);

  if (regra.comandante) {
    if (!comandante) {
      problemas.push('Escolha o comandante.');
    } else {
      if (!ehComandanteValido(comandante)) problemas.push(`${comandante.nome} não é uma criatura lendária; confira se pode ser comandante.`);
      const legal = problemaDeLegalidade(comandante, regra);
      if (legal) problemas.push(`Comandante: ${legal.toLowerCase()}.`);
    }
  }

  if (regra.minimo && total < regra.minimo) problemas.push(`Faltam ${regra.minimo - total} cartas (${total}/${regra.minimo}).`);
  if (regra.maximo && total > regra.maximo) problemas.push(`Sobram ${total - regra.maximo} cartas (${total}/${regra.maximo}).`);

  const identidade = comandante?.identidade_cor || '';
  for (const { carta, quantidade } of itens) {
    const limite = limiteDeCopias(carta, regra);
    if (limite && quantidade > limite) marcar(carta.id, limite === 1 ? 'Só pode ter 1 cópia' : `Máximo de ${limite} cópias`);

    const legal = problemaDeLegalidade(carta, regra);
    if (legal) marcar(carta.id, legal);

    if (regra.comandante && comandante) {
      if (carta.id === comandante.id) marcar(carta.id, 'Já é o comandante');
      else if (!dentroDaIdentidade(carta, identidade)) marcar(carta.id, 'Fora da identidade de cor do comandante');
    }
  }

  const comProblema = Object.keys(porCarta).length;
  if (comProblema) problemas.push(`${comProblema} ${comProblema === 1 ? 'carta com problema' : 'cartas com problema'} na lista.`);

  return {
    valido: problemas.length === 0,
    total,
    minimo: regra.minimo ?? null,
    maximo: regra.maximo ?? null,
    problemas,
    porCarta,
  };
}

// Lista para o app montar o seletor de formato.
const listaDeFormatos = () => Object.entries(FORMATOS).map(([chave, r]) => ({
  chave, nome: r.nome, minimo: r.minimo ?? null, maximo: r.maximo ?? null, copias: r.copias, comandante: !!r.comandante,
}));

module.exports = { FORMATOS, validarDeck, listaDeFormatos, ehTerrenoBasico };
