import { cards, stores, events, anuncios, consignacoes, propostas, notifications } from '../mocks/dados';
const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getCards() { await wait(); return cards; }
export async function getStores() { await wait(); return stores; }
export async function getEvents() { await wait(); return events; }
export async function getAds() { await wait(); return anuncios; }
export async function getConsignments() { await wait(); return consignacoes; }
export async function getProposals() { await wait(); return propostas; }
export async function getNotifications() { await wait(); return notifications; }
// TODO: trocar cada mock por fetch real e tratar CORS no servidor Express.
