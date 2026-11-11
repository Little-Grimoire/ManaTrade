# Definição do tema — ManaTrade

**Tema:** plataforma para jogadores de **Magic: The Gathering** organizarem suas cartas e decks, avaliarem se uma carta melhora um deck Commander e consignarem cartas em lojas parceiras.

**Problema:** o jogador tem cartas espalhadas (coleção, decks, cartas para trocar) e não sabe com facilidade (1) se uma carta nova serve no deck que está montando nem (2) onde deixá-la à venda. As lojas, por sua vez, não têm um canal simples para receber consignações e mostrar o que têm em estoque.

**Público:**
- **Jogador** (usuário): organiza coleção e decks, escaneia cartas, consigna cartas em lojas.
- **Loja**: cadastra seu local, publica seu acervo e aceita ou recusa consignações.
- **Administrador/suporte**: aprova lojas, modera cadastros e atende problemas.

**Escopo de jogo:** apenas Magic: The Gathering. Outros TCGs ficam fora.

**Disciplinas atendidas:**

| Disciplina | Entrega |
|---|---|
| Programação para Dispositivos Móveis | app Expo funcional (`app/`, `src/`) |
| Programação para Web 2 | sistema web Node.js em MVC + API REST publicada (`backend/`) |
| Fundamentos de Sistemas Inteligentes | classificador carta × deck (`ml/`, `backend-ml/`), que é a IA usada no app (acordado com o professor) |
