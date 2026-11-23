// Documentação da API REST no formato OpenAPI 3 (exibida em /api/docs; JSON em /api/docs.json).
// Helpers no topo evitam repetir as mesmas respostas em todas as rotas.

// ---------- respostas reutilizáveis ----------
const erro = (descricao) => ({ description: descricao, content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } });
const R = {
  400: erro('Dados inválidos (validação). `detalhes` lista os campos com problema.'),
  401: erro('Sem token, token inválido ou expirado.'),
  403: erro('Perfil sem permissão para esta ação, ou conta bloqueada.'),
  404: erro('Não encontrado — ou pertence a outro usuário (a API não revela que o id existe).'),
  409: erro('Conflito: duplicado, transição de status inválida ou registro em uso.'),
  502: erro('Falha ao consultar o Scryfall.'),
};
const ok = (descricao, schema) => ({ description: descricao, content: { 'application/json': { schema } } });
const ref = (nome) => ({ $ref: `#/components/schemas/${nome}` });
const lista = (nome) => ({ type: 'array', items: ref(nome) });
const criado = (nome) => ({
  description: 'Criado. O cabeçalho `Location` aponta para o novo recurso.',
  headers: { Location: { schema: { type: 'string' }, description: 'URL do recurso criado' } },
  content: { 'application/json': { schema: ref(nome) } },
});
const semConteudo = { description: 'Excluído (sem corpo).' };
const corpo = (schema, obrigatorio = true) => ({ required: obrigatorio, content: { 'application/json': { schema } } });
const idPath = (nome = 'id', descricao = 'Identificador') => ({ name: nome, in: 'path', required: true, schema: { type: 'integer' }, description: descricao });
const query = (nome, descricao, schema = { type: 'string' }) => ({ name: nome, in: 'query', required: false, schema, description: descricao });

// Monta a operação: tag, resumo, perfis permitidos e respostas.
const op = (tag, resumo, { perfis, descricao, params, body, respostas, publico } = {}) => ({
  tags: [tag],
  summary: resumo,
  description: [perfis && `**Perfis:** ${perfis}`, descricao].filter(Boolean).join('\n\n') || undefined,
  ...(publico && { security: [] }),
  ...(params && { parameters: params }),
  ...(body && { requestBody: body }),
  responses: respostas,
});

// Carta pode ser indicada de três formas em vários POSTs.
const refCarta = {
  carta_id: { type: 'integer', description: 'Carta já existente no catálogo local' },
  scryfall_id: { type: 'string', format: 'uuid', description: 'Id da impressão no Scryfall' },
  nome: { type: 'string', description: 'Nome em inglês; busca aproximada no Scryfall (aceita erros de digitação)' },
};
const NOTA_CARTA = 'Informe a carta por `carta_id`, `scryfall_id` **ou** `nome`. Cartas novas são buscadas no Scryfall e salvas no catálogo local.';

const CONDICAO = { type: 'string', enum: ['NM', 'SP', 'MP', 'HP', 'D'], description: 'Near Mint, Slightly/Moderately/Heavily Played, Damaged' };
const STATUS_CONSIGNACAO = ['pendente', 'aceita', 'recusada', 'cancelada', 'a_venda', 'vendida', 'devolvida'];
const timestamps = { created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'ManaTrade API',
    version: '1.0.0',
    description: `API REST do ManaTrade — coleção e decks de Magic: The Gathering, lojas parceiras e consignação.

## Autenticação
1. \`POST /api/auth/login\` (ou \`/api/auth/cadastro\`) devolve um **token JWT** (validade padrão: 7 dias).
2. Envie o token em todas as rotas protegidas: \`Authorization: Bearer <token>\`.

O perfil e o status da conta são relidos do banco a cada requisição: bloquear um usuário ou mudar o perfil vale na hora, mesmo para tokens já emitidos.

## Perfis
| Perfil | Pode |
|---|---|
| \`usuario\` (jogador) | coleção, decks, lista de desejos, enviar consignações, abrir chamados |
| \`loja\` | dados da própria loja, acervo (após aprovação), responder consignações recebidas, abrir chamados |
| \`admin\` | usuários, aprovar/gerenciar lojas, catálogo de cartas, ver/excluir consignações, atender chamados, enviar avisos |

Todas as permissões são verificadas por middleware: \`autenticar\` (token), \`autorizar(...perfis)\` (perfil), \`exigirLojaAprovada\` e \`carregar(Model, regra)\` (dono do registro).

## Convenções
- JSON em UTF-8. Datas em ISO 8601. Valores monetários como string decimal (ex.: \`"10.50"\`).
- \`POST\` cria (**201** + \`Location\`), \`PATCH\` altera parcialmente (**200**), \`DELETE\` remove (**204**).
- Erros: \`{ "erro": "mensagem", "detalhes"?: [{ "campo", "mensagem" }] }\`.
- Registro de outra pessoa responde **404** (não **403**), para não revelar que o id existe.`,
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  security: [{ bearer: [] }],
  tags: [
    { name: 'Autenticação', description: 'Cadastro, login e a própria conta' },
    { name: 'Usuários', description: 'Gestão de contas (admin)' },
    { name: 'Lojas', description: 'Lojas parceiras (1:1 com usuário de perfil loja)' },
    { name: 'Cartas', description: 'Catálogo local (cache do Scryfall)' },
    { name: 'Coleção', description: 'itens_colecao — N:N Usuário ↔ Carta' },
    { name: 'Desejos', description: 'desejos — N:N Usuário ↔ Carta' },
    { name: 'Decks', description: 'decks + deck_cartas — N:N Deck ↔ Carta' },
    { name: 'Acervo', description: 'itens_acervo — N:N Loja ↔ Carta' },
    { name: 'Consignações', description: 'Jogador deixa uma carta da coleção para a loja vender' },
    { name: 'Chamados', description: 'Suporte' },
    { name: 'Notificações', description: 'Avisos automáticos e do admin' },
  ],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Erro: {
        type: 'object',
        properties: {
          erro: { type: 'string', example: 'A quantidade deve ser no mínimo 1.' },
          detalhes: { type: 'array', items: { type: 'object', properties: { campo: { type: 'string' }, mensagem: { type: 'string' } } } },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, nome: { type: 'string' }, email: { type: 'string', format: 'email' },
          perfil: { type: 'string', enum: ['usuario', 'loja', 'admin'] }, ativo: { type: 'boolean' },
          loja: { allOf: [ref('Loja')], nullable: true }, ...timestamps,
        },
      },
      UsuarioComResumo: {
        allOf: [ref('Usuario'), {
          type: 'object',
          properties: { resumo: { type: 'object', description: 'Contadores do painel; variam conforme o perfil', additionalProperties: { type: 'integer' } } },
        }],
      },
      Sessao: { type: 'object', properties: { token: { type: 'string' }, usuario: ref('UsuarioComResumo') } },
      Loja: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, usuario_id: { type: 'integer' }, nome: { type: 'string' }, descricao: { type: 'string', nullable: true },
          endereco: { type: 'string' }, cidade: { type: 'string' }, uf: { type: 'string', maxLength: 2 },
          latitude: { type: 'number', nullable: true }, longitude: { type: 'number', nullable: true },
          horario: { type: 'string' }, telefone: { type: 'string' }, aceita_consignacao: { type: 'boolean' }, aprovada: { type: 'boolean' },
          dono: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, email: { type: 'string' }, ativo: { type: 'boolean' } } },
          ...timestamps,
        },
      },
      LojaEntrada: {
        type: 'object',
        properties: {
          nome: { type: 'string' }, endereco: { type: 'string' }, descricao: { type: 'string' }, cidade: { type: 'string' }, uf: { type: 'string' },
          latitude: { type: 'number' }, longitude: { type: 'number' }, horario: { type: 'string' }, telefone: { type: 'string' },
          aceita_consignacao: { type: 'boolean' },
        },
      },
      Carta: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, scryfall_id: { type: 'string', format: 'uuid' }, oracle_id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'Lightning Bolt' }, edicao: { type: 'string' }, codigo_edicao: { type: 'string' }, numero_colecionador: { type: 'string' },
          tipo: { type: 'string' }, custo_mana: { type: 'string', example: '{R}' }, cmc: { type: 'string', example: '1.0' },
          identidade_cor: { type: 'string', example: 'R' }, raridade: { type: 'string' }, imagem_url: { type: 'string' },
          preco_usd: { type: 'string', nullable: true }, legalidades: { type: 'object', additionalProperties: { type: 'string' } },
          ...timestamps,
        },
      },
      ItemColecao: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, usuario_id: { type: 'integer' }, carta_id: { type: 'integer' }, quantidade: { type: 'integer', minimum: 1 },
          condicao: CONDICAO, foil: { type: 'boolean' }, observacao: { type: 'string', nullable: true }, carta: ref('Carta'), ...timestamps,
        },
      },
      Desejo: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, usuario_id: { type: 'integer' }, carta_id: { type: 'integer' },
          prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'] }, preco_maximo_usd: { type: 'string', nullable: true },
          observacao: { type: 'string', nullable: true }, carta: ref('Carta'), ...timestamps,
        },
      },
      DeckResumo: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, nome: { type: 'string' }, formato: { type: 'string' }, formatoNome: { type: 'string' }, descricao: { type: 'string' },
          comandante: { type: 'object', nullable: true }, total: { type: 'integer' }, minimo: { type: 'integer', nullable: true },
          maximo: { type: 'integer', nullable: true }, valido: { type: 'boolean' }, updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Deck: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, nome: { type: 'string' }, formato: { type: 'string' }, formatoNome: { type: 'string' }, descricao: { type: 'string' },
          comandante: { allOf: [ref('Carta')], nullable: true }, comandanteNaColecao: { type: 'integer' },
          cartas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                carta: ref('Carta'), quantidade: { type: 'integer' }, categoria: { type: 'string', example: 'Criaturas' },
                naColecao: { type: 'integer' }, problemas: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          validacao: {
            type: 'object',
            properties: {
              valido: { type: 'boolean' }, total: { type: 'integer' }, minimo: { type: 'integer' }, maximo: { type: 'integer' }, problemas: { type: 'array', items: { type: 'string' } },
            },
          },
          estatisticas: {
            type: 'object',
            properties: {
              porTipo: { type: 'object', additionalProperties: { type: 'integer' } }, curva: { type: 'object', additionalProperties: { type: 'integer' } },
              possuidas: { type: 'integer' }, total: { type: 'integer' },
            },
          },
        },
      },
      Formato: {
        type: 'object',
        properties: {
          chave: { type: 'string', example: 'commander' }, nome: { type: 'string' }, minimo: { type: 'integer', nullable: true },
          maximo: { type: 'integer', nullable: true }, copias: { type: 'integer', nullable: true }, comandante: { type: 'boolean' },
        },
      },
      ItemAcervo: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, loja_id: { type: 'integer' }, carta_id: { type: 'integer' }, quantidade: { type: 'integer' },
          condicao: CONDICAO, foil: { type: 'boolean' }, preco: { type: 'string', example: '7.50' },
          consignacao_id: { type: 'integer', nullable: true, description: 'Preenchido quando o item veio de uma consignação' },
          carta: ref('Carta'), ...timestamps,
        },
      },
      Consignacao: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, usuario_id: { type: 'integer' }, loja_id: { type: 'integer' }, carta_id: { type: 'integer' },
          item_colecao_id: { type: 'integer', nullable: true }, quantidade: { type: 'integer' }, condicao: CONDICAO, foil: { type: 'boolean' },
          preco_pedido: { type: 'string' }, preco_venda: { type: 'string', nullable: true },
          status: { type: 'string', enum: STATUS_CONSIGNACAO }, observacao: { type: 'string', nullable: true }, resposta_loja: { type: 'string', nullable: true },
          respondida_em: { type: 'string', format: 'date-time', nullable: true }, encerrada_em: { type: 'string', format: 'date-time', nullable: true },
          carta: ref('Carta'),
          loja: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, cidade: { type: 'string' }, uf: { type: 'string' } } },
          usuario: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, email: { type: 'string' } } },
          ...timestamps,
        },
      },
      Chamado: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, usuario_id: { type: 'integer' }, atendente_id: { type: 'integer', nullable: true },
          assunto: { type: 'string' }, mensagem: { type: 'string' }, status: { type: 'string', enum: ['aberto', 'em_atendimento', 'resolvido'] },
          resposta: { type: 'string', nullable: true },
          usuario: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, perfil: { type: 'string' } } },
          atendente: { type: 'object', nullable: true, properties: { id: { type: 'integer' }, nome: { type: 'string' } } },
          ...timestamps,
        },
      },
      Notificacao: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, usuario_id: { type: 'integer' }, tipo: { type: 'string', enum: ['consignacao', 'chamado', 'sistema'] },
          titulo: { type: 'string' }, mensagem: { type: 'string', nullable: true },
          referencia_id: { type: 'integer', nullable: true, description: 'Id da consignação ou do chamado, conforme o tipo' },
          lida: { type: 'boolean' }, ...timestamps,
        },
      },
    },
  },
  paths: {
    // ---------- Autenticação ----------
    '/api/auth/cadastro': {
      post: op('Autenticação', 'Criar conta (jogador ou loja)', {
        publico: true,
        descricao: 'Perfil `loja` exige o objeto `loja`; usuário e loja são criados na mesma transação e a loja nasce **não aprovada**. Não é possível se cadastrar como admin.',
        body: corpo({
          type: 'object',
          required: ['nome', 'email', 'senha'],
          properties: {
            nome: { type: 'string' }, email: { type: 'string', format: 'email' }, senha: { type: 'string', minLength: 6, maxLength: 72 },
            perfil: { type: 'string', enum: ['usuario', 'loja'], default: 'usuario' }, loja: ref('LojaEntrada'),
          },
        }),
        respostas: { 201: ok('Conta criada; já devolve o token.', ref('Sessao')), 400: R[400], 409: erro('E-mail já cadastrado.') },
      }),
    },
    '/api/auth/login': {
      post: op('Autenticação', 'Entrar', {
        publico: true,
        body: corpo({ type: 'object', required: ['email', 'senha'], properties: { email: { type: 'string' }, senha: { type: 'string' } } }),
        respostas: { 200: ok('Token e dados do usuário.', ref('Sessao')), 400: R[400], 401: erro('E-mail ou senha incorretos.'), 403: erro('Conta bloqueada.') },
      }),
    },
    '/api/auth/me': {
      get: op('Autenticação', 'Meus dados e resumo do perfil', { perfis: 'todos', respostas: { 200: ok('Usuário logado.', ref('UsuarioComResumo')), 401: R[401] } }),
      patch: op('Autenticação', 'Alterar nome e/ou e-mail', {
        perfis: 'todos',
        descricao: 'Perfil e status `ativo` não podem ser alterados aqui.',
        body: corpo({ type: 'object', properties: { nome: { type: 'string' }, email: { type: 'string' } } }),
        respostas: { 200: ok('Atualizado.', ref('UsuarioComResumo')), 400: R[400], 401: R[401], 409: erro('E-mail já cadastrado.') },
      }),
    },
    '/api/auth/me/senha': {
      patch: op('Autenticação', 'Alterar senha', {
        perfis: 'todos',
        body: corpo({ type: 'object', required: ['senhaAtual', 'novaSenha'], properties: { senhaAtual: { type: 'string' }, novaSenha: { type: 'string', minLength: 6 } } }),
        respostas: { 204: { description: 'Senha alterada.' }, 400: R[400], 401: erro('Senha atual incorreta (ou token inválido).') },
      }),
    },

    // ---------- Usuários ----------
    '/api/usuarios': {
      get: op('Usuários', 'Listar usuários', {
        perfis: 'admin',
        params: [query('perfil', 'Filtra pelo perfil', { type: 'string', enum: ['usuario', 'loja', 'admin'] }), query('ativo', 'true/false', { type: 'boolean' }), query('busca', 'Parte do nome ou do e-mail')],
        respostas: { 200: ok('Lista.', lista('Usuario')), 401: R[401], 403: R[403] },
      }),
      post: op('Usuários', 'Criar usuário (qualquer perfil)', {
        perfis: 'admin',
        body: corpo({
          type: 'object',
          required: ['nome', 'email', 'senha'],
          properties: {
            nome: { type: 'string' }, email: { type: 'string' }, senha: { type: 'string', minLength: 6 },
            perfil: { type: 'string', enum: ['usuario', 'loja', 'admin'] }, ativo: { type: 'boolean' },
          },
        }),
        respostas: { 201: criado('Usuario'), 400: R[400], 401: R[401], 403: R[403], 409: erro('E-mail já cadastrado.') },
      }),
    },
    '/api/usuarios/{id}': {
      parameters: [idPath()],
      get: op('Usuários', 'Ver usuário', { perfis: 'admin', respostas: { 200: ok('Usuário.', ref('Usuario')), 401: R[401], 403: R[403], 404: R[404] } }),
      patch: op('Usuários', 'Alterar usuário (inclui perfil, bloqueio e senha)', {
        perfis: 'admin',
        descricao: 'O admin não pode rebaixar nem bloquear a si mesmo. Usuário com loja só muda de perfil depois que a loja for excluída.',
        body: corpo({
          type: 'object',
          properties: {
            nome: { type: 'string' }, email: { type: 'string' }, senha: { type: 'string' },
            perfil: { type: 'string', enum: ['usuario', 'loja', 'admin'] }, ativo: { type: 'boolean' },
          },
        }),
        respostas: { 200: ok('Atualizado.', ref('Usuario')), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      }),
      delete: op('Usuários', 'Excluir usuário (e tudo que pertence a ele)', {
        perfis: 'admin',
        descricao: 'Apaga em cascata coleção, decks, desejos, loja, consignações, chamados e notificações. O admin não pode excluir a si mesmo.',
        respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      }),
    },

    // ---------- Lojas ----------
    '/api/lojas': {
      get: op('Lojas', 'Listar lojas', {
        perfis: 'todos (jogador e loja veem só as aprovadas; admin vê todas)',
        params: [query('aprovada', 'Só admin: true/false', { type: 'boolean' }), query('cidade', 'Filtra pela cidade')],
        respostas: { 200: ok('Lista.', lista('Loja')), 401: R[401] },
      }),
      post: op('Lojas', 'Cadastrar loja', {
        perfis: 'loja (a própria, nasce não aprovada), admin (para um usuário de perfil loja; pode já aprovar)',
        body: corpo({
          allOf: [ref('LojaEntrada'), {
            type: 'object',
            required: ['nome', 'endereco'],
            properties: { usuario_id: { type: 'integer', description: 'Só admin: dono da loja' }, aprovada: { type: 'boolean', description: 'Só admin' } },
          }],
        }),
        respostas: { 201: criado('Loja'), 400: R[400], 401: R[401], 403: R[403], 409: erro('O usuário já possui uma loja.') },
      }),
    },
    '/api/lojas/minha': {
      get: op('Lojas', 'A loja do usuário logado', { perfis: 'loja', respostas: { 200: ok('Loja.', ref('Loja')), 401: R[401], 403: R[403], 404: erro('Loja ainda não cadastrada.') } }),
    },
    '/api/lojas/{id}': {
      parameters: [idPath()],
      get: op('Lojas', 'Ver loja', { perfis: 'todos (loja não aprovada: só o dono e o admin)', respostas: { 200: ok('Loja.', ref('Loja')), 401: R[401], 404: R[404] } }),
      patch: op('Lojas', 'Alterar loja', {
        perfis: 'dono da loja ou admin; `aprovada` só o admin',
        body: corpo({ allOf: [ref('LojaEntrada'), { type: 'object', properties: { aprovada: { type: 'boolean' } } }] }),
        respostas: { 200: ok('Atualizada.', ref('Loja')), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
      delete: op('Lojas', 'Excluir loja (com acervo e consignações)', { perfis: 'dono da loja ou admin', respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404] } }),
    },
    '/api/lojas/{id}/acervo': {
      parameters: [idPath()],
      get: op('Lojas', 'Vitrine: cartas à venda na loja', { perfis: 'todos (mesma visibilidade da loja)', respostas: { 200: ok('Itens.', lista('ItemAcervo')), 401: R[401], 404: R[404] } }),
    },

    // ---------- Cartas ----------
    '/api/cartas': {
      get: op('Cartas', 'Buscar no catálogo local', {
        perfis: 'todos',
        params: [query('busca', 'Parte do nome'), query('pagina', 'Página (1, 2, ...)', { type: 'integer', default: 1 }), query('limite', 'Itens por página (máx. 200)', { type: 'integer', default: 50 })],
        respostas: { 200: ok('Página de resultados.', { type: 'object', properties: { total: { type: 'integer' }, pagina: { type: 'integer' }, cartas: lista('Carta') } }), 401: R[401] },
      }),
      post: op('Cartas', 'Importar carta do Scryfall para o catálogo', {
        perfis: 'admin',
        body: corpo({ type: 'object', properties: { scryfall_id: refCarta.scryfall_id, nome: refCarta.nome } }),
        respostas: { 201: criado('Carta'), 400: R[400], 401: R[401], 403: R[403], 404: erro('Carta não encontrada no Scryfall.'), 502: R[502] },
      }),
    },
    '/api/cartas/{id}': {
      parameters: [idPath()],
      get: op('Cartas', 'Ver carta', { perfis: 'todos', respostas: { 200: ok('Carta.', ref('Carta')), 401: R[401], 404: R[404] } }),
      patch: op('Cartas', 'Corrigir dados da carta', {
        perfis: 'admin',
        descricao: '`scryfall_id` e `oracle_id` não são editáveis.',
        body: corpo({
          type: 'object',
          properties: Object.fromEntries(['nome', 'edicao', 'codigo_edicao', 'numero_colecionador', 'tipo', 'custo_mana', 'cmc', 'identidade_cor', 'raridade', 'imagem_url', 'preco_usd'].map((c) => [c, { type: 'string' }])),
        }),
        respostas: { 200: ok('Atualizada.', ref('Carta')), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
      delete: op('Cartas', 'Excluir carta do catálogo', { perfis: 'admin', respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404], 409: erro('Carta em uso (coleção, deck, desejo, acervo ou consignação).') } }),
    },
    '/api/cartas/{id}/sincronizar': {
      parameters: [idPath()],
      post: op('Cartas', 'Atualizar preço, imagem e legalidades com o Scryfall', { perfis: 'admin', respostas: { 200: ok('Carta atualizada.', ref('Carta')), 401: R[401], 403: R[403], 404: R[404], 502: R[502] } }),
    },

    // ---------- Coleção ----------
    '/api/colecao': {
      get: op('Coleção', 'Listar minha coleção', { perfis: 'usuario', respostas: { 200: ok('Itens.', lista('ItemColecao')), 401: R[401], 403: R[403] } }),
      post: op('Coleção', 'Adicionar carta à coleção', {
        perfis: 'usuario',
        descricao: `${NOTA_CARTA} Se já existir item da mesma carta com a mesma condição e foil, a quantidade é somada (200).`,
        body: corpo({ type: 'object', properties: { ...refCarta, quantidade: { type: 'integer', default: 1 }, condicao: CONDICAO, foil: { type: 'boolean' }, observacao: { type: 'string' } } }),
        respostas: { 201: criado('ItemColecao'), 200: ok('Quantidade somada a um item igual.', ref('ItemColecao')), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 502: R[502] },
      }),
    },
    '/api/colecao/{id}': {
      parameters: [idPath()],
      get: op('Coleção', 'Ver item (inclui em quais decks a carta está)', { perfis: 'usuario (dono)', respostas: { 200: ok('Item + `decks`.', ref('ItemColecao')), 401: R[401], 403: R[403], 404: R[404] } }),
      patch: op('Coleção', 'Alterar item', {
        perfis: 'usuario (dono)',
        body: corpo({ type: 'object', properties: { quantidade: { type: 'integer' }, condicao: CONDICAO, foil: { type: 'boolean' }, observacao: { type: 'string' } } }),
        respostas: { 200: ok('Atualizado.', ref('ItemColecao')), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: erro('Já existe item igual (mesma carta, condição e foil).') },
      }),
      delete: op('Coleção', 'Remover item', { perfis: 'usuario (dono)', respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404] } }),
    },

    // ---------- Desejos ----------
    '/api/desejos': {
      get: op('Desejos', 'Listar minha lista de desejos', { perfis: 'usuario', respostas: { 200: ok('Desejos.', lista('Desejo')), 401: R[401], 403: R[403] } }),
      post: op('Desejos', 'Adicionar carta à lista', {
        perfis: 'usuario',
        descricao: NOTA_CARTA,
        body: corpo({ type: 'object', properties: { ...refCarta, prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'] }, preco_maximo_usd: { type: 'number' }, observacao: { type: 'string' } } }),
        respostas: { 201: criado('Desejo'), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: erro('A carta já está na lista.'), 502: R[502] },
      }),
    },
    '/api/desejos/{id}': {
      parameters: [idPath()],
      get: op('Desejos', 'Ver desejo', { perfis: 'usuario (dono)', respostas: { 200: ok('Desejo.', ref('Desejo')), 401: R[401], 403: R[403], 404: R[404] } }),
      patch: op('Desejos', 'Alterar desejo', {
        perfis: 'usuario (dono)',
        body: corpo({ type: 'object', properties: { prioridade: { type: 'string', enum: ['baixa', 'media', 'alta'] }, preco_maximo_usd: { type: 'number' }, observacao: { type: 'string' } } }),
        respostas: { 200: ok('Atualizado.', ref('Desejo')), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
      delete: op('Desejos', 'Remover desejo', { perfis: 'usuario (dono)', respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404] } }),
    },

    // ---------- Decks ----------
    '/api/decks/formatos': {
      get: op('Decks', 'Regras de cada formato', { perfis: 'usuario', respostas: { 200: ok('Formatos.', lista('Formato')), 401: R[401], 403: R[403] } }),
    },
    '/api/decks': {
      get: op('Decks', 'Listar meus decks (resumo)', { perfis: 'usuario', respostas: { 200: ok('Decks.', lista('DeckResumo')), 401: R[401], 403: R[403] } }),
      post: op('Decks', 'Criar deck', {
        perfis: 'usuario',
        body: corpo({
          type: 'object',
          required: ['nome'],
          properties: {
            nome: { type: 'string' }, formato: { type: 'string', default: 'commander', enum: ['commander', 'pauper', 'standard', 'pioneer', 'modern', 'legacy', 'vintage', 'casual'] },
            descricao: { type: 'string' }, comandante: { description: 'Nome da carta ou { carta_id | scryfall_id | nome }; só em Commander', oneOf: [{ type: 'string' }, { type: 'object', properties: refCarta }] },
          },
        }),
        respostas: { 201: criado('Deck'), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
    },
    '/api/decks/{id}': {
      parameters: [idPath()],
      get: op('Decks', 'Ver deck completo (validação e estatísticas)', { perfis: 'usuario (dono)', respostas: { 200: ok('Deck.', ref('Deck')), 401: R[401], 403: R[403], 404: R[404] } }),
      patch: op('Decks', 'Alterar deck', {
        perfis: 'usuario (dono)',
        descricao: '`comandante: null` remove o comandante. Mudar para um formato sem comandante também o remove.',
        body: corpo({ type: 'object', properties: { nome: { type: 'string' }, formato: { type: 'string' }, descricao: { type: 'string' }, comandante: { nullable: true, oneOf: [{ type: 'string' }, { type: 'object' }] } } }),
        respostas: { 200: ok('Deck atualizado.', ref('Deck')), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
      delete: op('Decks', 'Excluir deck', { perfis: 'usuario (dono)', respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404] } }),
    },
    '/api/decks/{id}/cartas': {
      parameters: [idPath()],
      post: op('Decks', 'Adicionar carta ao deck (soma se já existir)', {
        perfis: 'usuario (dono)',
        descricao: NOTA_CARTA,
        body: corpo({ type: 'object', properties: { ...refCarta, quantidade: { type: 'integer', default: 1 } } }),
        respostas: { 201: ok('Deck atualizado.', ref('Deck')), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 502: R[502] },
      }),
    },
    '/api/decks/{id}/cartas/{cartaId}': {
      parameters: [idPath(), idPath('cartaId', 'Id da carta (tabela cartas)')],
      patch: op('Decks', 'Alterar quantidade da carta no deck', {
        perfis: 'usuario (dono)',
        body: corpo({ type: 'object', required: ['quantidade'], properties: { quantidade: { type: 'integer', minimum: 1 } } }),
        respostas: { 200: ok('Deck atualizado.', ref('Deck')), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
      delete: op('Decks', 'Remover carta do deck', { perfis: 'usuario (dono)', respostas: { 200: ok('Deck atualizado.', ref('Deck')), 401: R[401], 403: R[403], 404: R[404] } }),
    },
    '/api/decks/{id}/importar': {
      parameters: [idPath()],
      post: op('Decks', 'Importar lista colada (Moxfield/Archidekt/Arena)', {
        perfis: 'usuario (dono)',
        body: corpo({ type: 'object', required: ['lista'], properties: { lista: { type: 'string', example: '4 Lightning Bolt\n20 Mountain' }, substituir: { type: 'boolean', default: false } } }),
        respostas: { 200: ok('Deck e nomes não encontrados.', { type: 'object', properties: { deck: ref('Deck'), naoEncontradas: { type: 'array', items: { type: 'string' } } } }), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 502: R[502] },
      }),
    },

    // ---------- Acervo ----------
    '/api/acervo': {
      get: op('Acervo', 'Listar o acervo da minha loja', { perfis: 'loja (aprovada)', respostas: { 200: ok('Itens.', lista('ItemAcervo')), 401: R[401], 403: erro('Não é loja, ou a loja ainda não foi aprovada.') } }),
      post: op('Acervo', 'Adicionar carta ao acervo', {
        perfis: 'loja (aprovada)',
        descricao: NOTA_CARTA,
        body: corpo({ type: 'object', required: ['preco'], properties: { ...refCarta, quantidade: { type: 'integer', default: 1 }, condicao: CONDICAO, foil: { type: 'boolean' }, preco: { type: 'number', minimum: 0 } } }),
        respostas: { 201: criado('ItemAcervo'), 400: R[400], 401: R[401], 403: R[403], 404: R[404], 502: R[502] },
      }),
    },
    '/api/acervo/{id}': {
      parameters: [idPath()],
      get: op('Acervo', 'Ver item do acervo', { perfis: 'loja (dona do item)', respostas: { 200: ok('Item.', ref('ItemAcervo')), 401: R[401], 403: R[403], 404: R[404] } }),
      patch: op('Acervo', 'Alterar item do acervo', {
        perfis: 'loja (dona do item)',
        body: corpo({ type: 'object', properties: { quantidade: { type: 'integer' }, condicao: CONDICAO, foil: { type: 'boolean' }, preco: { type: 'number' } } }),
        respostas: { 200: ok('Atualizado.', ref('ItemAcervo')), 400: R[400], 401: R[401], 403: R[403], 404: R[404] },
      }),
      delete: op('Acervo', 'Remover item do acervo', { perfis: 'loja (dona do item)', respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404] } }),
    },

    // ---------- Consignações ----------
    '/api/consignacoes': {
      get: op('Consignações', 'Listar consignações', {
        perfis: 'usuario (as que enviou), loja (as que recebeu), admin (todas)',
        params: [query('status', 'Filtra pelo status', { type: 'string', enum: STATUS_CONSIGNACAO })],
        respostas: { 200: ok('Lista.', lista('Consignacao')), 401: R[401] },
      }),
      post: op('Consignações', 'Enviar carta da coleção para uma loja', {
        perfis: 'usuario',
        descricao: 'Carta, condição e foil vêm do item da coleção. A loja precisa estar aprovada e aceitando consignação. Nasce `pendente` e o dono da loja é notificado.',
        body: corpo({
          type: 'object',
          required: ['loja_id', 'item_colecao_id', 'preco_pedido'],
          properties: { loja_id: { type: 'integer' }, item_colecao_id: { type: 'integer' }, quantidade: { type: 'integer', default: 1 }, preco_pedido: { type: 'number', minimum: 0.01 }, observacao: { type: 'string' } },
        }),
        respostas: { 201: criado('Consignacao'), 400: R[400], 401: R[401], 403: R[403], 404: erro('Loja ou item da coleção não encontrado.'), 409: erro('A loja não aceita consignação.') },
      }),
    },
    '/api/consignacoes/{id}': {
      parameters: [idPath()],
      get: op('Consignações', 'Ver consignação', { perfis: 'participantes (jogador que enviou, loja que recebeu) e admin', respostas: { 200: ok('Consignação.', ref('Consignacao')), 401: R[401], 404: R[404] } }),
      patch: op('Consignações', 'Alterar consignação / mudar status', {
        perfis: 'usuario (quem enviou) e loja (quem recebeu)',
        descricao: `Fluxo: \`pendente → aceita | recusada | cancelada\`, \`aceita → a_venda | devolvida\`, \`a_venda → vendida | devolvida\`.

- **Jogador**: enquanto \`pendente\`, altera \`quantidade\`, \`preco_pedido\`, \`observacao\` ou envia \`status: "cancelada"\`.
- **Loja**: \`status\` (aceita, recusada, a_venda, vendida, devolvida), \`resposta_loja\`, \`preco_venda\`.
- \`a_venda\` coloca a carta no acervo da loja; \`vendida\`/\`devolvida\` a retiram; \`vendida\` também baixa a quantidade na coleção do jogador.
- Cada mudança de status notifica o jogador.`,
        body: corpo({
          type: 'object',
          properties: {
            status: { type: 'string', enum: STATUS_CONSIGNACAO }, quantidade: { type: 'integer' }, preco_pedido: { type: 'number' },
            observacao: { type: 'string' }, resposta_loja: { type: 'string' }, preco_venda: { type: 'number' },
          },
        }),
        respostas: { 200: ok('Atualizada.', ref('Consignacao')), 400: R[400], 401: R[401], 403: erro('Campo ou status não permitido para o seu papel (admin não altera).'), 404: R[404], 409: erro('Transição inválida ou consignação já respondida.') },
      }),
      delete: op('Consignações', 'Excluir consignação', {
        perfis: 'admin (qualquer uma); usuario (a própria, se pendente ou encerrada)',
        respostas: { 204: semConteudo, 401: R[401], 403: R[403], 404: R[404], 409: erro('Consignação em andamento.') },
      }),
    },

    // ---------- Chamados ----------
    '/api/chamados': {
      get: op('Chamados', 'Listar chamados', {
        perfis: 'usuario e loja (os próprios), admin (todos)',
        params: [query('status', 'Filtra pelo status', { type: 'string', enum: ['aberto', 'em_atendimento', 'resolvido'] })],
        respostas: { 200: ok('Lista.', lista('Chamado')), 401: R[401] },
      }),
      post: op('Chamados', 'Abrir chamado', {
        perfis: 'usuario, loja',
        body: corpo({ type: 'object', required: ['assunto', 'mensagem'], properties: { assunto: { type: 'string', maxLength: 150 }, mensagem: { type: 'string' } } }),
        respostas: { 201: criado('Chamado'), 400: R[400], 401: R[401], 403: R[403] },
      }),
    },
    '/api/chamados/{id}': {
      parameters: [idPath()],
      get: op('Chamados', 'Ver chamado', { perfis: 'autor ou admin', respostas: { 200: ok('Chamado.', ref('Chamado')), 401: R[401], 404: R[404] } }),
      patch: op('Chamados', 'Alterar / responder chamado', {
        perfis: 'autor (assunto e mensagem, só enquanto aberto) ou admin (status e resposta; vira o atendente)',
        descricao: 'Resposta ou mudança de status pelo admin notifica o autor.',
        body: corpo({
          type: 'object',
          properties: { assunto: { type: 'string' }, mensagem: { type: 'string' }, status: { type: 'string', enum: ['aberto', 'em_atendimento', 'resolvido'] }, resposta: { type: 'string' } },
        }),
        respostas: { 200: ok('Atualizado.', ref('Chamado')), 400: R[400], 401: R[401], 404: R[404], 409: erro('Chamado já em atendimento.') },
      }),
      delete: op('Chamados', 'Excluir chamado', { perfis: 'admin; autor enquanto aberto', respostas: { 204: semConteudo, 401: R[401], 404: R[404], 409: erro('Chamado já atendido.') } }),
    },

    // ---------- Notificações ----------
    '/api/notificacoes': {
      get: op('Notificações', 'Listar minhas notificações', {
        perfis: 'todos',
        params: [query('lida', 'true/false', { type: 'boolean' })],
        respostas: { 200: ok('Lista.', lista('Notificacao')), 401: R[401] },
      }),
      post: op('Notificações', 'Enviar aviso a um usuário', {
        perfis: 'admin',
        body: corpo({ type: 'object', required: ['usuario_id', 'titulo'], properties: { usuario_id: { type: 'integer' }, titulo: { type: 'string' }, mensagem: { type: 'string' } } }),
        respostas: { 201: criado('Notificacao'), 400: R[400], 401: R[401], 403: R[403], 404: erro('Destinatário não encontrado.') },
      }),
    },
    '/api/notificacoes/lidas': {
      patch: op('Notificações', 'Marcar todas como lidas', {
        perfis: 'todos',
        respostas: { 200: ok('Quantas mudaram.', { type: 'object', properties: { alteradas: { type: 'integer' } } }), 401: R[401] },
      }),
    },
    '/api/notificacoes/{id}': {
      parameters: [idPath()],
      get: op('Notificações', 'Ver notificação', { perfis: 'destinatário', respostas: { 200: ok('Notificação.', ref('Notificacao')), 401: R[401], 404: R[404] } }),
      patch: op('Notificações', 'Marcar como lida / não lida', {
        perfis: 'destinatário',
        body: corpo({ type: 'object', required: ['lida'], properties: { lida: { type: 'boolean' } } }),
        respostas: { 200: ok('Atualizada.', ref('Notificacao')), 400: R[400], 401: R[401], 404: R[404] },
      }),
      delete: op('Notificações', 'Excluir notificação', { perfis: 'destinatário', respostas: { 204: semConteudo, 401: R[401], 404: R[404] } }),
    },

    '/api/saude': {
      get: op('Autenticação', 'Verificar se a API está no ar', { publico: true, respostas: { 200: ok('OK.', { type: 'object', properties: { status: { type: 'string', example: 'ok' } } }) } }),
    },
  },
};
