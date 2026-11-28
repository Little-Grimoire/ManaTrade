// Cotação do dólar em reais. O Scryfall só informa preços em US$; o sistema mostra tudo em R$.
// Fonte: AwesomeAPI (gratuita, sem chave). Fica em memória e é renovada a cada 6 horas.
// Se a API estiver fora, continua com a última cotação obtida (ou COTACAO_USD_BRL do .env,
// ou o valor padrão abaixo) para nunca travar o sistema por causa disso.
const URL_COTACAO = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
const INTERVALO_MS = 6 * 60 * 60 * 1000;
const PADRAO = Number(process.env.COTACAO_USD_BRL) || 5.5;

let taxa = PADRAO;
let atualizadaEm = null;

async function atualizar() {
  try {
    const resposta = await fetch(URL_COTACAO, { signal: AbortSignal.timeout(8000) });
    const valor = Number((await resposta.json())?.USDBRL?.bid);
    if (resposta.ok && valor > 0) {
      taxa = valor;
      atualizadaEm = new Date();
    }
  } catch {
    // Mantém a cotação anterior.
  }
  return taxa;
}

// Busca a cotação agora e agenda a renovação periódica.
async function iniciar() {
  await atualizar();
  setInterval(atualizar, INTERVALO_MS).unref();
  if (!atualizadaEm) console.warn(`Cotação do dólar indisponível; usando R$ ${taxa.toFixed(2)} até conseguir atualizar.`);
}

const arredondar = (v) => Math.round(v * 100) / 100;

// US$ → R$ (null continua null).
function paraReais(usd) {
  if (usd === null || usd === undefined || usd === '') return null;
  return arredondar(Number(usd) * taxa);
}

// R$ → US$, para quando o admin corrige o preço de referência em reais.
function paraDolares(brl) {
  if (brl === null || brl === undefined || brl === '') return null;
  return arredondar(Number(brl) / taxa);
}

const atual = () => ({ usd_brl: taxa, atualizada_em: atualizadaEm });

module.exports = { iniciar, atualizar, paraReais, paraDolares, atual };
