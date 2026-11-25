// Sobe o ambiente de desenvolvimento com um comando só: `npm run dev`.
// 1. Descobre o IP da máquina na rede e atualiza o .env (o celular precisa dele).
// 2. Inicia o backend (porta 3001) e espera ele responder.
// 3. Inicia o backend-ml (porta 8000, venv em backend-ml/.venv) e espera ele responder.
// 4. Inicia o Expo com cache limpo.
// Ctrl+C encerra tudo.
const { spawn } = require('child_process');
const fs = require('fs');
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

function portaAberta(porta) {
  return new Promise((resolve) => {
    const socket = net.connect(porta, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

async function esperarPorta(porta, limiteMs = 60000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    if (await portaAberta(porta)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const processos = [];

function iniciar(nome, comando, cwd) {
  const filho = spawn(comando, { cwd, shell: true, stdio: 'inherit' });
  filho.on('exit', (codigo) => {
    console.log(`\n[dev] ${nome} encerrou (código ${codigo}).`);
    encerrar(codigo ?? 0);
  });
  processos.push(filho);
  return filho;
}

let encerrando = false;
function encerrar(codigo) {
  if (encerrando) return;
  encerrando = true;
  for (const p of processos) {
    if (p.exitCode !== null) continue;
    // No Windows, mata a árvore inteira (shell + node).
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
    else p.kill('SIGTERM');
  }
  setTimeout(() => process.exit(codigo), 500);
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

  if (await portaAberta(PORTA_BACKEND)) {
    console.log(`[dev] Backend já está rodando na porta ${PORTA_BACKEND}; usando o existente.`);
  } else {
    console.log('[dev] Iniciando backend...');
    iniciar('Backend', 'npm run dev', path.join(RAIZ, 'backend'));
    if (!(await esperarPorta(PORTA_BACKEND))) {
      console.error('[dev] Backend não respondeu em 60s.');
      return encerrar(1);
    }
  }

  if (await portaAberta(PORTA_ML)) {
    console.log(`[dev] backend-ml já está rodando na porta ${PORTA_ML}; usando o existente.`);
  } else {
    const pastaMl = path.join(RAIZ, 'backend-ml');
    const pythonVenv = path.join(pastaMl, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const python = fs.existsSync(pythonVenv) ? `"${pythonVenv}"` : 'python';
    console.log('[dev] Iniciando backend-ml...');
    iniciar('backend-ml', `${python} -m uvicorn main:app --host 0.0.0.0 --port ${PORTA_ML}`, pastaMl);
    if (!(await esperarPorta(PORTA_ML, 120000))) {
      console.error('[dev] backend-ml não respondeu em 120s.');
      return encerrar(1);
    }
  }

  console.log('[dev] Iniciando Expo...');
  iniciar('Expo', 'npx expo start -c', RAIZ);
}

main();
