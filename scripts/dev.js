// Sobe o ambiente de desenvolvimento com um comando só: `npm run dev`.
// 1. Descobre o IP da máquina na rede e atualiza o .env (o celular precisa dele).
// 2. Inicia o backend (porta 3001) e espera a rota /api/health responder (até 3 tentativas).
// 3. Idem para o backend-ml (porta 8000, venv em backend-ml/.venv, rota /health).
// 4. Inicia o Expo com cache limpo.
// Se um serviço fechar depois disso, é iniciado de novo (sem checagem periódica).
// Ctrl+C encerra tudo.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ARQUIVO_ENV = path.join(RAIZ, '.env');
const PORTA_BACKEND = 3001;
const PORTA_ML = 8000;

function ipDaRede() {
  const candidatos = [];
  for (const [nome, enderecos] of Object.entries(os.networkInterfaces())) {
    // Ignora adaptadores virtuais (VirtualBox, WSL, Hyper-V, VPN...).
    if (/virtual|vbox|vmware|wsl|hyper-v|vethernet|loopback|tailscale|zerotier/i.test(nome)) continue;
    for (const e of enderecos || []) {
      if (e.family === 'IPv4' && !e.internal) candidatos.push({ nome, ip: e.address });
    }
  }
  // Prefere Wi-Fi/Ethernet quando houver mais de um.
  const preferido = candidatos.find((c) => /wi-?fi|wlan|ethernet/i.test(c.nome));
  return (preferido || candidatos[0])?.ip;
}

function atualizarEnv(ip) {
  const valores = {
    EXPO_PUBLIC_API_URL: `http://${ip}:${PORTA_BACKEND}`,
    EXPO_PUBLIC_ML_API_URL: `http://${ip}:${PORTA_ML}`,
  };
  let texto = fs.existsSync(ARQUIVO_ENV) ? fs.readFileSync(ARQUIVO_ENV, 'utf8') : '';
  for (const [chave, valor] of Object.entries(valores)) {
    const linha = `${chave}=${valor}`;
    const regex = new RegExp(`^${chave}=.*$`, 'm');
    texto = regex.test(texto) ? texto.replace(regex, linha) : `${texto.trimEnd()}\n${linha}\n`.trimStart();
  }
  fs.writeFileSync(ARQUIVO_ENV, texto);
}

// ---------- saúde dos serviços ----------

// GET na rota de saúde; true só se responder 200 em até 3 s. Porta aberta não basta:
// o processo pode estar travado, ou o node --watch pode estar parado esperando correção.
function saudavel(porta, caminho) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: porta, path: caminho, timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });
}

function portaAberta(porta) {
  return new Promise((resolve) => {
    const socket = net.connect(porta, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Espera a porta abrir (conexão TCP, não aparece nos logs) e só então faz uma requisição
// à rota de saúde, para não encher o terminal de "GET /health".
async function esperarSaude(servico, limiteMs) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    if (encerrando) return false;
    // O processo morreu de vez: não adianta esperar o limite todo.
    if (servico.filho && servico.filho.exitCode !== null) return false;
    if (await portaAberta(servico.porta)) return saudavel(servico.porta, servico.saude);
    await esperar(500);
  }
  return false;
}

// Mata a árvore do processo (no Windows o filho é um shell que abre o node/python).
function matarArvore(pid) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      try { process.kill(pid, 'SIGTERM'); } catch { /* já morreu */ }
      return resolve();
    }
    const p = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    p.on('exit', () => resolve());
    p.on('error', () => resolve());
  });
}

// Processo antigo travado segurando a porta (ex.: backend de uma sessão anterior que não
// fechou): descobre o PID pelo netstat e encerra, para o novo conseguir abrir a porta.
async function liberarPorta(porta) {
  if (process.platform !== 'win32' || !(await portaAberta(porta))) return;
  const saida = await new Promise((resolve) => {
    let texto = '';
    const p = spawn('netstat', ['-ano', '-p', 'TCP'], { stdio: ['ignore', 'pipe', 'ignore'] });
    p.stdout.on('data', (d) => { texto += d; });
    p.on('exit', () => resolve(texto));
    p.on('error', () => resolve(''));
  });
  const pids = new Set();
  for (const linha of saida.split(/\r?\n/)) {
    const m = linha.match(/^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
    if (m && Number(m[1]) === porta && m[2] !== '0') pids.add(m[2]);
  }
  for (const pid of pids) {
    console.warn(`[dev] Porta ${porta} ocupada por um processo que não responde (PID ${pid}); encerrando-o.`);
    await matarArvore(pid);
  }
  await esperar(500);
}

// ---------- supervisor ----------

const TENTATIVAS_INICIO = 3;

let encerrando = false;
let expo = null;

const pastaMl = path.join(RAIZ, 'backend-ml');
const pythonVenv = path.join(pastaMl, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = fs.existsSync(pythonVenv) ? `"${pythonVenv}"` : 'python';

const SERVICOS = [
  { nome: 'Backend', porta: PORTA_BACKEND, saude: '/api/health', comando: 'npm run dev', cwd: path.join(RAIZ, 'backend'), limiteInicioMs: 60000 },
  { nome: 'backend-ml', porta: PORTA_ML, saude: '/health', comando: `${python} -m uvicorn main:app --host 0.0.0.0 --port ${PORTA_ML}`, cwd: pastaMl, limiteInicioMs: 120000 },
];

// Sobe o serviço e só retorna quando a rota de saúde responder (ou depois de esgotar as tentativas).
async function subir(servico) {
  servico.subindo = true;
  try { return await tentarSubir(servico); } finally { servico.subindo = false; }
}

async function tentarSubir(servico) {
  for (let tentativa = 1; tentativa <= TENTATIVAS_INICIO && !encerrando; tentativa++) {
    if (await portaAberta(servico.porta) && await saudavel(servico.porta, servico.saude)) {
      if (!servico.filho) console.log(`[dev] ${servico.nome} já está rodando na porta ${servico.porta}; usando o existente.`);
      return true;
    }
    await pararFilho(servico);
    await liberarPorta(servico.porta);

    console.log(`[dev] Iniciando ${servico.nome}${tentativa > 1 ? ` (tentativa ${tentativa}/${TENTATIVAS_INICIO})` : ''}...`);
    const filho = spawn(servico.comando, { cwd: servico.cwd, shell: true, stdio: 'inherit' });
    servico.filho = filho;
    filho.on('exit', (codigo) => {
      if (servico.filho !== filho || encerrando) return;
      if (servico.subindo) return; // subir() já está cuidando (vê exitCode e tenta de novo)
      servico.filho = null;
      console.warn(`\n[dev] ${servico.nome} encerrou (código ${codigo}); reiniciando...`);
      reiniciar(servico);
    });

    if (await esperarSaude(servico, servico.limiteInicioMs)) {
      console.log(`[dev] ${servico.nome} pronto em http://localhost:${servico.porta}.`);
      return true;
    }
    const morreu = filho.exitCode !== null;
    console.error(`[dev] ${servico.nome} ${morreu ? `encerrou com erro (código ${filho.exitCode})` : `não respondeu em até ${servico.limiteInicioMs / 1000}s`} (veja o erro acima).`);
  }
  return false;
}

async function pararFilho(servico) {
  const filho = servico.filho;
  servico.filho = null; // antes de matar, para o 'exit' não disparar outro reinício
  if (filho && filho.exitCode === null) await matarArvore(filho.pid);
}

async function reiniciar(servico) {
  if (servico.reiniciando || encerrando) return;
  servico.reiniciando = true;
  await pararFilho(servico);
  const ok = await subir(servico);
  if (!ok && !encerrando) {
    console.error(`[dev] ${servico.nome} continua fora do ar. Corrija o erro acima e rode npm run dev de novo.`);
  }
  servico.reiniciando = false;
}

async function encerrar(codigo) {
  if (encerrando) return;
  encerrando = true;
  const filhos = [...SERVICOS.map((s) => s.filho), expo].filter((p) => p && p.exitCode === null);
  await Promise.all(filhos.map((p) => matarArvore(p.pid)));
  process.exit(codigo);
}
process.on('SIGINT', () => encerrar(0));
process.on('SIGTERM', () => encerrar(0));

async function main() {
  const ip = ipDaRede();
  if (ip) {
    atualizarEnv(ip);
    console.log(`[dev] IP da rede: ${ip} (.env atualizado)`);
  } else {
    console.warn('[dev] Não achei o IP da rede; mantendo o .env como está.');
  }

  for (const servico of SERVICOS) {
    if (!(await subir(servico))) {
      console.error(`[dev] Não consegui subir o ${servico.nome} depois de ${TENTATIVAS_INICIO} tentativas.`);
      return encerrar(1);
    }
  }

  console.log('[dev] Iniciando Expo...');
  expo = spawn('npx expo start -c', { cwd: RAIZ, shell: true, stdio: 'inherit' });
  expo.on('exit', (codigo) => {
    console.log(`\n[dev] Expo encerrou (código ${codigo}).`);
    encerrar(codigo ?? 0);
  });
}

main();
