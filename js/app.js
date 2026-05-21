/**
 * app.js — Ponto de entrada do site.
 * Cuida do login, da casca do app (topo + menu lateral), da navegacao
 * entre telas e do estado em memoria que as telas consultam.
 */
import { api } from './api.js';
import * as auth from './auth.js';
import * as painel from './painel.js';
import * as tarefas from './tarefas.js';
import { esc, iniciais } from './util.js';

const raiz = document.getElementById('app');

// Estado em memoria: tudo que as telas precisam.
const estado = {
  eventos: [], equipe: [], itens: [], tarefas: [], config: {},
  eventoAtual: null,
};

// "ctx" e o pacote que cada tela recebe para trabalhar.
const ctx = { estado, api, recarregar, toast, abrirModal, fecharModal };

/* ---- inicio ------------------------------------------------------------- */
function iniciar() {
  if (auth.estaLogado()) abrirApp();
  else mostrarLogin();
}

/* ---- tela de login ------------------------------------------------------ */
function mostrarLogin() {
  raiz.innerHTML = `
    <div class="login">
      <div class="login-cartao">
        <div class="login-marca"><i class="ti ti-stack-2"></i></div>
        <h1>EXP-Backstage</h1>
        <p>Gestão de produção de eventos</p>
        <div class="login-botao" id="slot-login"></div>
        <div class="login-aviso">Acesso restrito à equipe EXP</div>
      </div>
    </div>`;
  auth.montarBotaoEntrada(document.getElementById('slot-login'), abrirApp);
}

/* ---- casca do app ------------------------------------------------------- */
async function abrirApp() {
  raiz.innerHTML = `
    <header class="topo">
      <div class="topo-marca"><i class="ti ti-stack-2"></i> EXP-Backstage</div>
      <div class="topo-evento" id="topo-evento">—</div>
      <div class="topo-dir">
        <span class="topo-pill" id="topo-contagem"></span>
        <div class="menu-usuario">
          <button class="avatar" id="btn-usuario">··</button>
          <div class="menu-usuario-lista oculto" id="menu-usuario"></div>
        </div>
      </div>
    </header>
    <div class="corpo">
      <nav class="lateral">
        <a class="nav-item" data-rota="painel" href="#painel"><i class="ti ti-layout-dashboard"></i> Painel</a>
        <a class="nav-item" data-rota="tarefas" href="#tarefas"><i class="ti ti-checklist"></i> Tarefas</a>
        <div class="nav-divisor"></div>
        <span class="nav-item embreve"><i class="ti ti-list-details"></i> Itens <span class="nav-tag">em breve</span></span>
        <span class="nav-item embreve"><i class="ti ti-cash"></i> Orçamentos <span class="nav-tag">em breve</span></span>
        <span class="nav-item embreve"><i class="ti ti-calendar-event"></i> Cronograma <span class="nav-tag">em breve</span></span>
        <span class="nav-item embreve"><i class="ti ti-truck"></i> Fornecedores <span class="nav-tag">em breve</span></span>
        <span class="nav-item embreve"><i class="ti ti-users"></i> Equipe <span class="nav-tag">em breve</span></span>
      </nav>
      <main class="conteudo" id="conteudo">
        <div class="carregando">Carregando dados...</div>
      </main>
    </div>
    <div class="modal" id="modal"><div class="modal-caixa" id="modal-caixa"></div></div>
    <div class="toasts" id="toasts"></div>`;

  montarMenuUsuario();
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') fecharModal();
  });

  try {
    await carregarDados();
  } catch (e) {
    if (/token|autoriz/i.test(e.message)) { auth.sair(); return; }
    document.getElementById('conteudo').innerHTML =
      `<div class="carregando">Não foi possível carregar os dados:<br>${esc(e.message)}</div>`;
    toast('Erro ao carregar: ' + e.message, 'erro');
    return;
  }

  atualizarTopo();
  window.addEventListener('hashchange', rotear);
  rotear();
}

async function carregarDados() {
  const [eventos, equipe, itens, tfs, config] = await Promise.all([
    api.listar('Eventos'), api.listar('Equipe'), api.listar('Itens'),
    api.listar('Tarefas'), api.config(),
  ]);
  estado.eventos = eventos || [];
  estado.equipe = equipe || [];
  estado.itens = itens || [];
  estado.tarefas = tfs || [];
  estado.config = config || {};
  estado.eventoAtual =
    estado.eventos.find((e) => e.status === 'Ativo') || estado.eventos[0] || null;
}

/* ---- navegacao ---------------------------------------------------------- */
function rotear() {
  const rota = location.hash.replace('#', '') || 'painel';
  document.querySelectorAll('.nav-item[data-rota]').forEach((n) => {
    n.classList.toggle('ativo', n.dataset.rota === rota);
  });
  const alvo = document.getElementById('conteudo');
  if (rota === 'tarefas') tarefas.render(ctx, alvo);
  else painel.render(ctx, alvo);
}

/** Recarrega uma tabela do backend e redesenha a tela atual. */
async function recarregar(tabela) {
  try {
    const dados = await api.listar(tabela);
    if (tabela === 'Tarefas') estado.tarefas = dados;
    else if (tabela === 'Itens') estado.itens = dados;
    else if (tabela === 'Equipe') estado.equipe = dados;
    rotear();
  } catch (e) {
    toast('Erro ao atualizar: ' + e.message, 'erro');
  }
}

/* ---- topo --------------------------------------------------------------- */
function atualizarTopo() {
  const ev = estado.eventoAtual;
  document.getElementById('topo-evento').textContent = ev ? ev.nome : 'Sem evento';
  const pill = document.getElementById('topo-contagem');
  if (ev && ev.data_inicio) {
    const dias = diasAteData(ev.data_inicio);
    pill.textContent = dias >= 0 ? dias + ' dias p/ o evento' : 'evento em andamento';
    pill.classList.toggle('atrasado', dias < 0);
  } else {
    pill.textContent = '';
  }
}

function diasAteData(iso) {
  const p = String(iso).slice(0, 10).split('-');
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return Math.round((d - h) / 86400000);
}

function montarMenuUsuario() {
  const u = auth.getUsuario() || { nome: '—', email: '' };
  const btn = document.getElementById('btn-usuario');
  const menu = document.getElementById('menu-usuario');
  btn.textContent = iniciais(u.nome);
  menu.innerHTML = `
    <div class="nome">${esc(u.nome || '')}</div>
    <div class="email">${esc(u.email || '')}</div>
    <button id="btn-sair"><i class="ti ti-logout"></i> Sair</button>`;
  btn.onclick = () => menu.classList.toggle('oculto');
  menu.querySelector('#btn-sair').onclick = () => auth.sair();
}

/* ---- modal e avisos ----------------------------------------------------- */
function abrirModal(conteudoEl) {
  const caixa = document.getElementById('modal-caixa');
  caixa.innerHTML = '';
  caixa.appendChild(conteudoEl);
  document.getElementById('modal').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal').classList.remove('aberto');
}

function toast(msg, tipo) {
  const t = document.createElement('div');
  t.className = 'toast ' + (tipo || '');
  t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

iniciar();
