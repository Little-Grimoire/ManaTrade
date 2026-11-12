# PRD — ManaTrade

## Problema
Ver `definicao_tema.md`.

## Perfis
| Perfil | Pode |
|---|---|
| Usuário | gerenciar a própria coleção, os próprios decks e as próprias consignações; ver lojas |
| Loja | gerenciar os dados da própria loja e o acervo; aceitar, recusar e encerrar consignações recebidas |
| Administrador/suporte | aprovar ou bloquear lojas e usuários; ver tudo; atender chamados |

## Requisitos funcionais
- **RF01** Cadastro, login e logout com sessão persistente; telas privadas exigem login.
- **RF02** Escanear carta pela câmera ou galeria: o backend faz o OCR do nome e a busca aproximada no Scryfall identifica a carta. Se a leitura falhar, o usuário digita o nome.
- **RF03** Coleção: adicionar, editar (quantidade, condição) e remover cartas, sem precisar montar um deck.
- **RF04** Decks: criar, editar e excluir decks Commander (comandante + lista); importar lista colada.
- **RF05** Avaliar carta no deck: o classificador de ML (TP) devolve a adequação da carta e sugere qual carta remover (regra com margem δ).
- **RF06** Lojas: listar lojas aprovadas com localização (mapa/distância) e ver o acervo de cada uma. Só dados reais vindos da API.
- **RF07** Consignação: o usuário oferece uma carta da coleção a uma loja, com preço pedido e condição; a loja aceita ou recusa; o status é acompanhado até a venda ou devolução.
- **RF08** Painel da loja (web): editar dados e localização, gerenciar acervo e consignações.
- **RF09** Painel administrativo (web): aprovar lojas, bloquear usuários, ver chamados.
- **RF10** Notificações sobre mudança de status de consignação.

## Fora do escopo
- Outros jogos além de Magic.
- Pagamento dentro do app (a venda acontece na loja).
- Precificação automática por IA. O app só mostra o preço de referência do Scryfall.
- Chat entre usuários.
