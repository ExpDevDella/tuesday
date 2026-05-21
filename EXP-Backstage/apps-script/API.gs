/**
 * API.gs — Ponto de entrada da API web.
 * =====================================
 *  doGet  -> verificacao de saude (sem login). Util para testar a URL.
 *  doPost -> todas as operacoes de dados (exigem login com Google).
 *
 * O frontend chama doPost com o corpo em JSON e Content-Type text/plain.
 * Isso faz a requisicao ser "simples" e evita o preflight do CORS.
 *
 * Corpo esperado no doPost (JSON):
 *   {
 *     "token":     "<ID token do Google>",
 *     "acao":      "listar" | "obter" | "criar" | "atualizar" |
 *                  "excluir" | "config",
 *     "tabela":    "Itens" | "Tarefas" | ...,
 *     "id":        "<uuid>"      (para obter / atualizar / excluir),
 *     "evento_id": "<uuid>"      (opcional, filtra o "listar"),
 *     "dados":     { ... }       (para criar / atualizar)
 *   }
 *
 * Resposta (sempre JSON):
 *   { "ok": true,  "dados": ... }
 *   { "ok": false, "erro": "<motivo>" }
 */

/** Verificacao de saude: abra a URL /exec no navegador para testar. */
function doGet() {
  return _resposta({
    ok: true,
    servico: 'EXP-Backstage API',
    versao: API_VERSAO,
  });
}

/** Recebe todas as operacoes de leitura e escrita. */
function doPost(e) {
  try {
    const corpo = (e && e.postData && e.postData.contents) || '{}';
    const req = JSON.parse(corpo);

    // 1) Autenticacao — todas as operacoes exigem login valido.
    const auth = validarToken(req.token);
    if (!auth.ok) {
      return _resposta({ ok: false, erro: auth.erro });
    }

    // 2) Roteamento por acao.
    const acao = req.acao;
    const tabela = req.tabela;

    if (acao === 'config') {
      return _resposta({ ok: true, dados: lerConfig() });
    }

    if (acao === 'listar') {
      _exigirTabela(tabela, TABELAS_LEITURA);
      let linhas = lerTabela(tabela);
      if (req.evento_id) {
        linhas = linhas.filter(function (x) {
          return x.evento_id === req.evento_id;
        });
      }
      return _resposta({ ok: true, dados: linhas });
    }

    if (acao === 'obter') {
      _exigirTabela(tabela, TABELAS_LEITURA);
      return _resposta({ ok: true, dados: obterPorId(tabela, req.id) });
    }

    if (acao === 'criar') {
      _exigirTabela(tabela, TABELAS_ESCRITA);
      return _resposta({
        ok: true, dados: inserir(tabela, req.dados || {}),
      });
    }

    if (acao === 'atualizar') {
      _exigirTabela(tabela, TABELAS_ESCRITA);
      return _resposta({
        ok: true, dados: atualizar(tabela, req.id, req.dados || {}),
      });
    }

    if (acao === 'excluir') {
      _exigirTabela(tabela, TABELAS_ESCRITA);
      return _resposta({ ok: true, dados: excluir(tabela, req.id) });
    }

    return _resposta({ ok: false, erro: 'acao_desconhecida: ' + acao });
  } catch (erro) {
    return _resposta({
      ok: false, erro: String((erro && erro.message) || erro),
    });
  }
}

/** Lanca erro se a tabela nao estiver na lista permitida. */
function _exigirTabela(tabela, permitidas) {
  if (permitidas.indexOf(tabela) === -1) {
    throw new Error('tabela_nao_permitida: ' + tabela);
  }
}

/** Monta a resposta HTTP em JSON. */
function _resposta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
