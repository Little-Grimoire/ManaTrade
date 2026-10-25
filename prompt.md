Você vai criar APENAS AS TELAS (interface) de um aplicativo chamado ManaTrade, uma "Steam para colecionadores de TCG" (Magic: The Gathering, Pokémon, Yu-Gi-Oh!, Lorcana). O MESMO código deve rodar em celular (Expo Go, dispositivo real) e no navegador (`npx expo start --web`). Não crie projetos separados.

No momento sem back-end, sem autenticação real e sem chamadas de API. O objetivo é ter o app navegável, bonito, consistente e responsivo, pronto para ligar a lógica depois.

## 1. Stack
- React Native com Expo (Expo Go no celular + web)
- JavaScript (não use TypeScript)
- Expo Router para navegação (abas + pilhas); no desktop, o Expo Router gera as rotas web
- Para a web, instale react-dom, react-native-web e @expo/metro-runtime, e configure "web": { "bundler": "metro" } no app.json
- Ícones: @expo/vector-icons
- Sem bibliotecas pesadas de UI; estilos com StyleSheet e um arquivo de tema central
- Nenhuma chave de API no código

## 2. Identidade visual (inspirada na Steam, sem copiar logo ou marca)
- Tema escuro: fundo azul-petróleo quase preto (#0f1923), superfícies #1b2838 e #223447, texto claro, destaque em azul-ciano (#66c0f4) e botões de ação em verde (gradiente #5ba32b → #a4d007)
- Cartas aparecem como "capas" verticais com cantos arredondados; preços em destaque; selos de condição (NM, SP, MP, HP)
- Cards, listas e barras de progresso limpos, com muito respiro
- Defina cores, espaçamentos, tipografia e raios em src/theme.js e use SOMENTE esses tokens

## 3. Estrutura de pastas
app/ (rotas do Expo Router)
src/components/
src/hooks/
src/services/
src/mocks/
src/theme.js
src/config.js

## 4. Responsividade (mobile e web)
- Crie src/hooks/useBreakpoint.js (mobile < 768px, tablet 768-1199px, desktop >= 1200px) usando useWindowDimensions
- Mobile: barra de abas inferior
- Tablet/desktop: troque a barra inferior por uma barra lateral fixa à esquerda (ícone + rótulo), mantendo o ManaScan em destaque
- Conteúdo centralizado com largura máxima (~1200px); grades usam mais colunas em telas largas (2 no mobile, 4 a 6 no desktop)
- Telas de formulário (login, cadastro, criar anúncio) ficam em um cartão central de largura máxima ~480px na web
- Nada pode estourar horizontalmente em nenhuma largura de tela

## 5. Telas (todas obrigatórias)

### Pilha de autenticação
1. Login: e-mail, senha, "Entrar", link para cadastro, validação visual de campos
2. Cadastro: nome, e-mail, senha, confirmação, perfil (Colecionador ou Loja) e TCGs de interesse (chips)

### Abas principais
3. Descobrir (início): barra de busca, chips de filtro por jogo, carrossel "Em alta", "Cartas que subiram de preço", "Anúncios perto de você", "Eventos nas lojas parceiras"
4. Biblioteca: coleção do usuário com valor total estimado no topo, abas por jogo, grade/lista alternável, barra de progresso por edição ("Alpha 42/295") e ordenação (preço, nome, edição)
5. ManaScan (botão central destacado): tela de câmera com moldura de carta; ao capturar, tela de resultado com sugestão de nome, edição, condição e preço justo (editáveis) e botões "Anunciar", "Adicionar à biblioteca" e "Consignar". Estados obrigatórios: carregando (esqueleto/animação), erro da IA (com preenchimento manual) e permissão de câmera negada (explicação + botão para abrir configurações). Em dispositivos sem câmera ou sem permissão (comum no desktop), ofereça também "Enviar foto da galeria/arquivo" (expo-image-picker); o fluxo de resultado é idêntico
6. Lista de desejos: cartas desejadas com preço atual, preço-alvo, indicador de queda de preço e botão para ativar/desativar alerta
7. Perfil: avatar, nível, vitrine de cartas favoritas, conquistas (selos como "Set completo", "Primeira rara"), estatísticas (cartas, valor, vendas), avaliações recebidas, botão de configurações

### Telas secundárias (empilhadas)
8. Detalhe da carta: imagem grande, nome, edição, raridade, histórico de preço (gráfico simples de linha), preço médio, condições disponíveis, anúncios à venda, botões "Comprar/Fazer proposta", "Desejar", "Consignar"
9. Meus anúncios: lista com status (ativo, vendido, pausado) e botão "Novo anúncio"
10. Criar/Editar anúncio: formulário (carta, edição, condição, preço, quantidade, fotos, descrição), com opção de excluir na edição (modal de confirmação)
11. Lojas próximas: alternância Mapa/Lista, cards com distância, horário, jogos aceitos e selo "aceita consignação". Inclua o estado de permissão de localização negada (no navegador, com instrução de como liberar nas configurações)
12. Detalhe da loja: informações, avaliações, eventos, botão "Consignar cartas aqui"
13. Consignações: acompanhamento por etapas (Enviada → Em análise → À venda → Vendida → Repasse pago) com linha do tempo e valor do repasse
14. Propostas: recebidas e enviadas, com aceitar, recusar e contraproposta
15. Notificações: lista agrupada por tipo (propostas, vendas, repasses, alertas de preço), com marcação de lidas
16. Comunidade e eventos: feed de eventos (torneios, noites de jogo) com data, loja, jogo e botão "Vou participar"
17. Configurações: perfil, jogos favoritos, notificações, privacidade, sair

## 6. Abstrações por plataforma (use o sufixo .web.js quando necessário)
- src/services/storage.js (nativo: expo-secure-store) e storage.web.js (web: localStorage), com a mesma interface: getItem, setItem, removeItem. Todo o app usa SOMENTE essa interface. // TODO: na web, migrar o refresh token para cookie httpOnly quando o back-end estiver pronto
- src/components/Mapa.js (nativo: placeholder ou react-native-maps) e Mapa.web.js (web: placeholder visual ou iframe). Nenhuma tela importa react-native-maps diretamente
- src/components/ModalConfirmacao.js: use no lugar de Alert.alert em TODAS as confirmações (excluir anúncio, sair, recusar proposta), pois Alert.alert não funciona direito na web
- src/services/notificacoes.js: o nativo usa expo-notifications; na web, retorne um stub sem quebrar (a tela de notificações funciona como lista in-app nas duas plataformas)
- Não use APIs exclusivas do nativo sem verificar Platform.OS

## 7. Interação para desktop
- Hover nos botões, cards e itens de lista (cursor pointer)
- Navegação por teclado: foco visível, Tab na ordem correta, Enter ativa botões e Esc fecha modais
- Título da aba do navegador por tela (Head do expo-router) e URLs legíveis (ex.: /carta/123, /loja/5)
- Recarregar a página numa rota privada deve respeitar o estado de autenticação (simulado)

## 8. Requisitos de qualidade
- Cada lista deve ter estado de carregamento (skeleton), vazio (ícone + texto + ação) e erro (mensagem clara + botão "Tentar de novo"). Simule o carregamento com um setTimeout curto
- Navegação funcionando entre todas as telas; o login leva ao app principal (apenas simulado, com estado global simples via Context)
- Componentes reutilizáveis: CardCapa, SeloCondicao, PrecoTag, ChipFiltro, BotaoPrimario, BotaoSecundario, Cabecalho, EstadoVazio, EstadoErro, Skeleton, ListaItem, ModalConfirmacao, Mapa
- Mocks realistas em src/mocks/ (pelo menos 20 cartas de Magic e algumas de Pokémon, Yu-Gi-Oh! e Lorcana, 5 lojas, 6 eventos, anúncios, consignações, propostas e notificações). Use URLs de imagem placeholder
- Acessibilidade básica: alvos de toque de no mínimo 44px, contraste adequado, labels nos botões de ícone
- Código limpo e comentado nos pontos em que a lógica real será ligada depois (// TODO: integrar API)

## 9. Preparação para o back-end
- src/config.js lê a URL da API de process.env.EXPO_PUBLIC_API_URL; crie .env.example e coloque .env no .gitignore
- Centralize as chamadas em src/services/api.js (hoje devolvendo os mocks). // TODO: trocar por fetch real e tratar CORS no servidor Express
- Nenhuma chave de API no código. Chaves de IA (Gemini) ficam SOMENTE no servidor: o app enviará a foto ao back-end, que chama a IA

## 10. Entrega e verificação
1. Crie o projeto, instale as dependências e confirme que `npx expo start` e `npx expo start --web` rodam sem erros
2. Implemente na ordem: tema e componentes, abstrações por plataforma, telas de autenticação, abas principais, telas secundárias. Mostre um resumo curto a cada bloco concluído
3. Verifique e informe o resultado em: celular real (Expo Go), navegador a 375px de largura e navegador a 1440px de largura
4. Ao final, liste as rotas criadas e os pontos de TODO para a integração futura