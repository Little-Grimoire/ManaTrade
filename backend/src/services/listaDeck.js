// Lê uma lista de deck colada (formato usado por Moxfield, Archidekt, MTGA, EDHREC...).
//
// Aceita linhas como:
//   1 Sol Ring            1x Sol Ring          Sol Ring
//   1 Sol Ring (CMM) 410  4 Lightning Bolt *F*  1 Atraxa, Praetors' Voice *CMDR*
// Cabeçalhos de seção: "Commander"/"Comandante" (próximas cartas viram comandante),
// "Deck"/"Mainboard" (lista principal), "Sideboard"/"Maybeboard"/"Considering"/"Companion" (ignoradas).
const SECOES = {
  commander: 'comandante', comandante: 'comandante', commanders: 'comandante',
  deck: 'principal', mainboard: 'principal', main: 'principal', principal: 'principal',
  sideboard: 'ignorar', maybeboard: 'ignorar', considering: 'ignorar', companion: 'ignorar', tokens: 'ignorar',
};

function lerLista(texto) {
  const comandante = [];
  const quantidades = new Map(); // nome -> quantidade (soma linhas repetidas)
  let secao = 'principal';

  for (const bruta of String(texto || '').split(/\r?\n/)) {
    let linha = bruta.trim();
    if (!linha || linha.startsWith('//') || linha.startsWith('#')) continue;

    const cabecalho = SECOES[linha.replace(/[:\s]+$/, '').replace(/\s*\(\d+\)$/, '').toLowerCase()];
    if (cabecalho) { secao = cabecalho; continue; }
    if (secao === 'ignorar') continue;

    const ehComandante = /\*CMDR\*/i.test(linha);
    linha = linha
      .replace(/\*[A-Z]+\*/gi, '')           // marcadores *F*, *CMDR*, *E*
      .replace(/\s+\([A-Z0-9]{2,6}\)(\s+[\w★-]+)?\s*$/i, '') // (SET) 123
      .trim();

    const m = linha.match(/^(\d+)\s*x?\s+(.+)$/i);
    const quantidade = m ? Number(m[1]) : 1;
    const nome = (m ? m[2] : linha).trim();
    if (!nome || quantidade < 1) continue;

    if (secao === 'comandante' || ehComandante) comandante.push(nome);
    else quantidades.set(nome, (quantidades.get(nome) || 0) + quantidade);
  }

  return { comandante, cartas: [...quantidades].map(([nome, quantidade]) => ({ nome, quantidade })) };
}

module.exports = { lerLista };
