/**
 * tarefas.js — Tela "Tarefas": kanban com filtros, criacao e edicao.
 * Exporta render(ctx, alvo): desenha o kanban dentro do elemento `alvo`.
 */
import { fmtDataCurta, diasAte, esc, iniciais } from './util.js';

const COLUNAS = ['Não iniciado', 'Em andamento', 'Concluído'];
const CORES = { 'Não iniciado': '#cbc6d1', 'Em andamento': '#f0b84a', 'Concluído': '#86bd5a' };

// Os filtros ficam no modulo para sobreviver aos redesenhos da tela.
const filtros = { responsavel: '', busca: '' };

export function render(ctx, alvo) {
  const { estado } = ctx;
  const eId = estado.eventoAtual ? estado.eventoAtual.id : null;

  let lista = estado.tarefas.filter((x) => !eId || x.evento_id === eId);
  if (filtros.responsavel) {
    lista = lista.filter((t) => t.responsavel_id === filtros.responsavel);
  }
  if (filtros.busca) {
    const b = filtros.busca.toLowerCase();
    lista = lista.filter((t) => String(t.titulo || '').toLowerCase().includes(b));
  }

  alvo.innerHTML = `
    <div class="pagina-titulo">Tarefas</div>
    <div class="barra-ferramentas">
      <input class="campo-filtro" id="f-busca" placeholder="Buscar tarefa..." value="${esc(filtros.busca)}">
      <select class="campo-filtro" id="f-resp">
        <option value="">Todos os responsáveis</option>
        ${estado.equipe.map((p) => `<option value="${esc(p.id)}"${
          p.id === filtros.responsavel ? ' selected' : ''
        }>${esc(p.nome_cracha || p.nome_completo)}</option>`).join('')}
      </select>
      <button class="botao esticar" id="b-nova"><i class="ti ti-plus"></i> Nova tarefa</button>
    </div>
    <div class="kanban">
      ${COLUNAS.map((c) => coluna(c, lista, estado)).join('')}
    </div>`;

  // Filtros.
  const busca = alvo.querySelector('#f-busca');
  busca.oninput = () => { filtros.busca = busca.value; };
  busca.onchange = () => render(ctx, alvo);
  alvo.querySelector('#f-resp').onchange = (e) => {
    filtros.responsavel = e.target.value;
    render(ctx, alvo);
  };
  alvo.querySelector('#b-nova').onclick = () => abrirFormulario(ctx, alvo, null);

  // Clique e arraste dos cartoes.
  alvo.querySelectorAll('.tarefa-cartao').forEach((card) => {
    card.onclick = () => {
      const t = estado.tarefas.find((x) => x.id === card.dataset.id);
      if (t) abrirFormulario(ctx, alvo, t);
    };
    card.ondragstart = (e) => e.dataTransfer.setData('text/plain', card.dataset.id);
  });

  // Soltar um cartao em outra coluna muda o status.
  alvo.querySelectorAll('.coluna').forEach((col) => {
    col.ondragover = (e) => { e.preventDefault(); col.classList.add('sobre'); };
    col.ondragleave = () => col.classList.remove('sobre');
    col.ondrop = async (e) => {
      e.preventDefault();
      col.classList.remove('sobre');
      const id = e.dataTransfer.getData('text/plain');
      const t = estado.tarefas.find((x) => x.id === id);
      if (!t || t.status === col.dataset.status) return;
      try {
        await ctx.api.atualizar('Tarefas', id, { status: col.dataset.status });
        ctx.toast('Tarefa movida para "' + col.dataset.status + '".', 'ok');
        await ctx.recarregar('Tarefas');
      } catch (err) {
        ctx.toast('Erro ao mover: ' + err.message, 'erro');
      }
    };
  });
}

function coluna(nome, lista, estado) {
  const daColuna = lista.filter((t) => (t.status || 'Não iniciado') === nome);
  return `<div class="coluna" data-status="${esc(nome)}">
    <div class="coluna-topo">
      <span class="ponto" style="background:${CORES[nome]}"></span>${nome}
      <span class="coluna-contador">${daColuna.length}</span>
    </div>
    ${daColuna.length
      ? daColuna.map((t) => cartao(t, estado)).join('')
      : '<div class="coluna-vazia">Nenhuma tarefa</div>'}
  </div>`;
}

function cartao(t, estado) {
  const resp = estado.equipe.find((p) => p.id === t.responsavel_id);
  const nome = resp ? (resp.nome_cracha || resp.nome_completo) : '—';
  const dias = diasAte(t.prazo);
  const atrasada = dias != null && dias < 0 && t.status !== 'Concluído';
  return `<div class="tarefa-cartao" draggable="true" data-id="${esc(t.id)}">
    <div class="titulo">${esc(t.titulo)}</div>
    <div class="rodape">
      ${t.categoria ? `<span class="tag roxo">${esc(t.categoria)}</span>` : ''}
      <span class="data${atrasada ? ' atrasada' : ''}" style="margin-left:auto">
        ${t.prazo ? '<i class="ti ti-clock"></i> ' + fmtDataCurta(t.prazo) : ''}
      </span>
      <span class="av" title="${esc(nome)}">${esc(iniciais(nome))}</span>
    </div>
  </div>`;
}

/* ---- formulario de nova / editar tarefa --------------------------------- */
function abrirFormulario(ctx, alvo, tarefa) {
  const { estado } = ctx;
  const editando = !!tarefa;
  const t = tarefa || {};
  const cats = estado.config.categoria_tarefa || [];
  const stats = estado.config.status_tarefa || COLUNAS;

  const cx = document.createElement('div');
  cx.innerHTML = `
    <div class="modal-topo">
      <h2>${editando ? 'Editar tarefa' : 'Nova tarefa'}</h2>
      <button class="modal-fechar" data-fechar aria-label="Fechar">&times;</button>
    </div>
    <div class="modal-corpo">
      <div class="campo">
        <label>Título</label>
        <input id="c-titulo" value="${esc(t.titulo || '')}">
      </div>
      <div class="campo">
        <label>Descrição</label>
        <textarea id="c-desc">${esc(t.descricao || '')}</textarea>
      </div>
      <div class="campo">
        <label>Categoria</label>
        <select id="c-cat">
          <option value="">—</option>
          ${cats.map((c) => `<option${c === t.categoria ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label>Responsável</label>
        <select id="c-resp">
          <option value="">—</option>
          ${estado.equipe.map((p) => `<option value="${esc(p.id)}"${
            p.id === t.responsavel_id ? ' selected' : ''
          }>${esc(p.nome_cracha || p.nome_completo)}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label>Prazo</label>
        <input type="date" id="c-prazo" value="${esc(String(t.prazo || '').slice(0, 10))}">
      </div>
      <div class="campo">
        <label>Status</label>
        <select id="c-status">
          ${stats.map((s) => `<option${
            s === (t.status || 'Não iniciado') ? ' selected' : ''
          }>${esc(s)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-rodape">
      ${editando ? '<button class="botao perigo" data-excluir><i class="ti ti-trash"></i> Excluir</button>' : ''}
      <button class="botao secundario esticar" data-fechar>Cancelar</button>
      <button class="botao" data-salvar><i class="ti ti-check"></i> Salvar</button>
    </div>`;

  cx.querySelectorAll('[data-fechar]').forEach((b) => { b.onclick = ctx.fecharModal; });

  cx.querySelector('[data-salvar]').onclick = async () => {
    const dados = {
      evento_id: estado.eventoAtual ? estado.eventoAtual.id : '',
      titulo: cx.querySelector('#c-titulo').value.trim(),
      descricao: cx.querySelector('#c-desc').value.trim(),
      categoria: cx.querySelector('#c-cat').value,
      responsavel_id: cx.querySelector('#c-resp').value,
      prazo: cx.querySelector('#c-prazo').value,
      status: cx.querySelector('#c-status').value,
    };
    if (!dados.titulo) { ctx.toast('Dê um título à tarefa.', 'erro'); return; }
    try {
      if (editando) {
        await ctx.api.atualizar('Tarefas', t.id, dados);
      } else {
        dados.origem = 'Manual';
        await ctx.api.criar('Tarefas', dados);
      }
      ctx.fecharModal();
      ctx.toast(editando ? 'Tarefa atualizada.' : 'Tarefa criada.', 'ok');
      await ctx.recarregar('Tarefas');
    } catch (e) {
      ctx.toast('Erro ao salvar: ' + e.message, 'erro');
    }
  };

  const btnExcluir = cx.querySelector('[data-excluir]');
  if (btnExcluir) {
    btnExcluir.onclick = async () => {
      if (!window.confirm('Excluir esta tarefa? Esta ação não pode ser desfeita.')) return;
      try {
        await ctx.api.excluir('Tarefas', t.id);
        ctx.fecharModal();
        ctx.toast('Tarefa excluída.', 'ok');
        await ctx.recarregar('Tarefas');
      } catch (e) {
        ctx.toast('Erro ao excluir: ' + e.message, 'erro');
      }
    };
  }

  ctx.abrirModal(cx);
}
