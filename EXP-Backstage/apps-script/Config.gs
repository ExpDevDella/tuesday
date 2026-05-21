/**
 * Config.gs — Constantes de configuracao da API EXP-Backstage.
 * ============================================================
 * Antes de publicar, preencha:
 *   - CLIENT_ID            (depois de criar o ID de cliente OAuth)
 *   - EMAILS_AUTORIZADOS   (os e-mails Google da equipe)
 *
 * Os outros valores ja estao prontos.
 */

// ID da Planilha Google que serve de backend (a aba ?d/<ID>/edit da URL).
const SHEET_ID = '1Ee4GdLwoelkxW1XW7VRijCiHpBZfBYowY22i1BTP1jE';

// ID de cliente OAuth (tipo "Aplicativo da Web"), criado no Google Cloud.
// Serve para validar o login com Google. Veja o guia de instalacao.
const CLIENT_ID = 'COLE_AQUI_O_ID_DE_CLIENTE_OAUTH';

// E-mails autorizados a usar o sistema. Adicione a equipe (tudo minusculo).
const EMAILS_AUTORIZADOS = [
  'thiago@exp.rec.br',
];

// Abas que a API pode LER pela acao "listar"/"obter".
const TABELAS_LEITURA = [
  'Eventos', 'Equipe', 'Fornecedores', 'Itens',
  'Orcamentos', 'Tarefas', 'Cronograma',
];

// Abas que a API pode GRAVAR. (Config e _INSTRUCOES ficam de fora de proposito.)
const TABELAS_ESCRITA = [
  'Eventos', 'Equipe', 'Fornecedores', 'Itens',
  'Orcamentos', 'Tarefas', 'Cronograma',
];

// Versao da API (aparece na verificacao de saude).
const API_VERSAO = '1.0';

// Tempo (segundos) que a validacao de um token fica guardada em cache,
// para nao reconsultar o Google a cada requisicao.
const CACHE_TOKEN_SEG = 300;
