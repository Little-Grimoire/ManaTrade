// Testes unitários das regras de formato e do leitor de listas (sem banco, sem rede).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarDeck } = require('../src/services/formatos');
const { lerLista } = require('../src/services/listaDeck');

const legal = (extra = {}) => ({ commander: 'legal', pauper: 'legal', vintage: 'legal', ...extra });
const carta = (id, nome, tipo, cor = '', legalidades = legal()) => ({ id, nome, tipo, identidade_cor: cor, legalidades });

const lathril = carta(1, 'Lathril', 'Legendary Creature — Elf Noble', 'BG');
const solRing = carta(2, 'Sol Ring', 'Artifact', '', legal({ pauper: 'not_legal', vintage: 'restricted' }));
const bolt = carta(3, 'Lightning Bolt', 'Instant', 'R');
const forest = carta(4, 'Forest', 'Basic Land — Forest', 'G');
const elfo = carta(5, 'Llanowar Elves', 'Creature — Elf Druid', 'G');

test('commander: tamanho, singleton, identidade de cor e terrenos básicos', () => {
  const v = validarDeck('commander', lathril, [
    { carta: solRing, quantidade: 2 }, { carta: bolt, quantidade: 1 }, { carta: forest, quantidade: 30 },
  ]);
  assert.equal(v.total, 34);
  assert.equal(v.valido, false);
  assert.ok(v.problemas.includes('Faltam 66 cartas (34/100).'));
  assert.deepEqual(v.porCarta[2], ['Só pode ter 1 cópia']);
  assert.deepEqual(v.porCarta[3], ['Fora da identidade de cor do comandante']);
  assert.equal(v.porCarta[4], undefined, '30 Forest é permitido');
});

test('commander: sem comandante e comandante que não é criatura lendária', () => {
  assert.ok(validarDeck('commander', null, []).problemas.includes('Escolha o comandante.'));
  const v = validarDeck('commander', bolt, []);
  assert.match(v.problemas[0], /não é uma criatura lendária/);
});

test('commander com 100 cartas certas é válido', () => {
  const v = validarDeck('commander', lathril, [{ carta: elfo, quantidade: 1 }, { carta: forest, quantidade: 98 }]);
  assert.equal(v.total, 100);
  assert.deepEqual(v.problemas, []);
  assert.equal(v.valido, true);
});

test('pauper: 4 cópias, legalidade e mínimo de 60', () => {
  const v = validarDeck('pauper', null, [{ carta: bolt, quantidade: 5 }, { carta: solRing, quantidade: 1 }, { carta: forest, quantidade: 54 }]);
  assert.equal(v.total, 60);
  assert.deepEqual(v.porCarta[3], ['Máximo de 4 cópias']);
  assert.deepEqual(v.porCarta[2], ['Não é legal no Pauper']);
  assert.ok(!v.problemas.some((p) => p.startsWith('Faltam')));
});

test('vintage: carta restrita só pode ter 1 cópia; livre não tem regras', () => {
  assert.deepEqual(validarDeck('vintage', null, [{ carta: solRing, quantidade: 2 }]).porCarta[2], ['Só pode ter 1 cópia']);
  const livre = validarDeck('casual', null, [{ carta: solRing, quantidade: 9 }]);
  assert.equal(livre.valido, true);
});

test('lerLista: quantidades, edição, marcadores, seções e linhas repetidas', () => {
  const r = lerLista(`Commander
1 Lathril, Blade of the Elves (KHC) 2

Deck
1 Sol Ring (CMM) 410
1x Arcane Signet
Llanowar Elves
4 Lightning Bolt *F*
2 Lightning Bolt
30 Forest

Sideboard
1 Pyroblast`);
  assert.deepEqual(r.comandante, ['Lathril, Blade of the Elves']);
  assert.deepEqual(r.cartas, [
    { nome: 'Sol Ring', quantidade: 1 }, { nome: 'Arcane Signet', quantidade: 1 }, { nome: 'Llanowar Elves', quantidade: 1 },
    { nome: 'Lightning Bolt', quantidade: 6 }, { nome: 'Forest', quantidade: 30 },
  ]);
  assert.deepEqual(lerLista('1 Atraxa, Praetors\' Voice *CMDR*\n1 Sol Ring').comandante, ["Atraxa, Praetors' Voice"]);
});
