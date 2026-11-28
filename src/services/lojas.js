// Lojas parceiras (/api/lojas). Jogadores veem só as aprovadas (o backend filtra).
import { apiRequest } from './api';

export const listarLojas = () => apiRequest('/lojas');
export const obterLoja = (id) => apiRequest(`/lojas/${id}`);
export const acervoDaLoja = (id) => apiRequest(`/lojas/${id}/acervo`);

// Distância em km entre dois pontos (fórmula de Haversine).
export function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const formatarDistancia = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

export const enderecoDaLoja = (loja) => [loja.endereco, loja.cidade && `${loja.cidade}${loja.uf ? `/${loja.uf}` : ''}`].filter(Boolean).join(' · ');
