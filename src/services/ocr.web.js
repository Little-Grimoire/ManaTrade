// OCR no navegador com Tesseract.js (carregado sob demanda do CDN; só na versão web).
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let loading;

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  loading = loading || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TESSERACT_URL; s.async = true;
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error('Falha ao carregar o OCR.'));
    document.head.appendChild(s);
  });
  return loading;
}

/** Retorna linhas candidatas a nome (o nome fica no topo da carta). */
export async function ocrCandidateLines(imageUri) {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(imageUri, 'eng');
  return data.text.split('\n').map((l) => l.replace(/[^A-Za-z0-9',\- ]/g, '').trim())
    .filter((l) => l.replace(/[^A-Za-z]/g, '').length >= 3).slice(0, 4);
}
export const ocrAvailable = true;
