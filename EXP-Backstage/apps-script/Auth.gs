/**
 * Auth.gs — Validacao do login com Google.
 * ========================================
 * O frontend faz login com Google e recebe um "ID token" (um JWT).
 * Esse token chega na API e e validado aqui. Conferimos, nesta ordem:
 *   1. se o Google reconhece o token (endpoint tokeninfo);
 *   2. se ele foi emitido para o nosso aplicativo (aud == CLIENT_ID);
 *   3. se ainda esta dentro da validade;
 *   4. se o e-mail foi verificado pelo Google;
 *   5. se o e-mail esta na lista de autorizados.
 */

/**
 * Valida um ID token do Google.
 * @param {string} token  o ID token recebido do frontend.
 * @return {{ok: boolean, email: string, erro: string}}
 */
function validarToken(token) {
  if (!token) {
    return { ok: false, email: '', erro: 'token_ausente' };
  }

  // Cache: evita reconsultar o Google a cada requisicao do mesmo usuario.
  const cache = CacheService.getScriptCache();
  const chaveCache = 'tok_' + _hashCurto(token);
  const emCache = cache.get(chaveCache);
  if (emCache) {
    return { ok: true, email: emCache, erro: '' };
  }

  // Pergunta ao Google se o token e valido.
  let info;
  try {
    const resp = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' +
        encodeURIComponent(token),
      { muteHttpExceptions: true }
    );
    if (resp.getResponseCode() !== 200) {
      return { ok: false, email: '', erro: 'token_invalido' };
    }
    info = JSON.parse(resp.getContentText());
  } catch (e) {
    return { ok: false, email: '', erro: 'falha_na_validacao' };
  }

  // O token foi emitido para o nosso aplicativo?
  if (info.aud !== CLIENT_ID) {
    return { ok: false, email: '', erro: 'destinatario_invalido' };
  }
  // O token ainda esta dentro da validade?
  if (Number(info.exp) * 1000 < Date.now()) {
    return { ok: false, email: '', erro: 'token_expirado' };
  }
  // O Google confirmou esse e-mail?
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    return { ok: false, email: '', erro: 'email_nao_verificado' };
  }
  // O e-mail esta na lista de autorizados?
  const email = String(info.email || '').toLowerCase();
  const autorizados = EMAILS_AUTORIZADOS.map(function (e) {
    return String(e).toLowerCase();
  });
  if (autorizados.indexOf(email) === -1) {
    return { ok: false, email: email, erro: 'email_nao_autorizado' };
  }

  // Tudo certo: guarda em cache e devolve.
  cache.put(chaveCache, email, CACHE_TOKEN_SEG);
  return { ok: true, email: email, erro: '' };
}

/** Gera um hash curto de um texto, para usar como chave de cache. */
function _hashCurto(texto) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, texto);
  return bytes.map(function (b) {
    return (b & 0xff).toString(16).padStart(2, '0');
  }).join('');
}
