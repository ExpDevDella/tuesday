/**
 * api.js — Cliente da API.
 *
 * Expoe um objeto `api` com listar/obter/criar/atualizar/excluir/config.
 * Todas as funcoes devolvem Promise, nos dois modos:
 *   - modo real: chama a API (Apps Script) por POST;
 *   - modo demo: le e grava nos dados de demo.js (em memoria).
 */
import { MODO_DEMO, API_URL } from './config.js';
import { getToken } from './auth.js';
import { DEMO } from './demo.js';

/* ---- modo real ---------------------------------------------------------- */
async function chamarApi(payload) {
  // POST com corpo de texto simples evita o "preflight" de CORS.
  const resp = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ ...payload, token: getToken() }),
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(json.erro || 'erro_desconhecido');
  return json.dados;
}

/* ---- modo demo ---------------------------------------------------------- */
function novoId() {
  return 'demo-' + Math.random().toString(36).slice(2, 10);
}

function chamarDemo(payload) {
  const { acao, tabela, id, dados, evento_id } = payload;
  if (acao === 'config') return DEMO.Config;

  const lista = DEMO[tabela] || [];
  if (acao === 'listar') {
    return evento_id ? lista.filter((x) => x.evento_id === evento_id) : lista.slice();
  }
  if (acao === 'obter') {
    return lista.find((x) => x.id === id) || null;
  }
  if (acao === 'criar') {
    const reg = Object.assign({}, dados, { id: novoId() });
    lista.push(reg);
    return reg;
  }
  if (acao === 'atualizar') {
    const reg = lista.find((x) => x.id === id);
    if (!reg) throw new Error('Registro nao encontrado');
    Object.assign(reg, dados);
    return reg;
  }
  if (acao === 'excluir') {
    const i = lista.findIndex((x) => x.id === id);
    if (i >= 0) lista.splice(i, 1);
    return { id, excluido: true };
  }
  throw new Error('acao_desconhecida');
}

/* ---- interface unica ---------------------------------------------------- */
function chamar(payload) {
  // return MODO_DEMO ? Promise.resolve(chamarDemo(payload)) : chamarApi(payload);
  return chamarApi(payload);
}

export const api = {
  listar: (tabela, evento_id) => chamar({ acao: 'listar', tabela, evento_id }),
  obter: (tabela, id) => chamar({ acao: 'obter', tabela, id }),
  criar: (tabela, dados) => chamar({ acao: 'criar', tabela, dados }),
  atualizar: (tabela, id, dados) => chamar({ acao: 'atualizar', tabela, id, dados }),
  excluir: (tabela, id) => chamar({ acao: 'excluir', tabela, id }),
  config: () => chamar({ acao: 'config' }),
};
