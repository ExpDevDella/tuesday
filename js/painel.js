/**
 * painel.js — Tela "Painel": os numeros e prazos do evento atual.
 * Exporta render(ctx, alvo): desenha o painel dentro do elemento `alvo`.
 */
import { fmtMoedaCurta, fmtData, diasAte, esc, iniciais } from './util.js';

export function render(ctx, alvo) {
  const { estado } = ctx;
  const ev = estado.eventoAtual;
  const eId = ev ? ev.id : null;
  const itens = estado.itens.filter((x) => !eId || x.evento_id === eId);
  const tarefas = estado.tarefas.filter((x) => !eId || x.evento_id === eId);

  // Indicadores principais.
  const dias = ev && ev.data_inicio ? diasAte(ev.data_inicio) : null;
  const valor = itens.reduce((s, x) => s + (Number(x.valor_total) || 0), 0);
  const concluidas = tarefas.filter((t) => t.status === 'Concluído').length;
  const pct = tarefas.length ? Math.round((concluidas / tarefas.length) * 100) : 0;

  // Contagem de tarefas por status.
  const cont = { 'Não iniciado': 0, 'Em andamento': 0, 'Concluído': 0 };
  tarefas.forEach((t) => { if (t.status in cont) cont[t.status] += 1; });
  const total = tarefas.length || 1;
  const larg = (n) => (n / total * 100).toFixed(1);

  // Proximos prazos: tarefas em aberto, com prazo, ordenadas pela data.
  const prazos = tarefas
    .filter((t) => t.prazo && t.status !== 'Concluído')
    .sort((a, b) => String(a.prazo).localeCompare(String(b.prazo)))
    .slice(0, 6);

  alvo.innerHTML = `
    <div class="pagina-titulo">Painel do evento</div>

    <div class="kpis">
      ${kpi('Dias para o evento', dias == null ? '—' : dias, dias != null && dias < 0)}
      ${kpi('Conclusão geral', pct + '%')}
      ${kpi('Itens de produção', itens.length)}
      ${kpi('Valor orçado', fmtMoedaCurta(valor))}
    </div>

    <div class="cartao">
      <h2>Tarefas por status — ${tarefas.length} no total</h2>
      <div class="barra-status">
        <div style="width:${larg(cont['Não iniciado'])}%;background:#cbc6d1"></div>
        <div style="width:${larg(cont['Em andamento'])}%;background:#f0b84a"></div>
        <div style="width:${larg(cont['Concluído'])}%;background:#86bd5a"></div>
      </div>
      <div class="barra-legenda">
        <span><span class="ponto" style="background:#cbc6d1"></span>Não iniciado · ${cont['Não iniciado']}</span>
        <span><span class="ponto" style="background:#f0b84a"></span>Em andamento · ${cont['Em andamento']}</span>
        <span><span class="ponto" style="background:#86bd5a"></span>Concluído · ${cont['Concluído']}</span>
      </div>
    </div>

    <div class="cartao">
      <h2>Próximos prazos</h2>
      ${prazos.length
        ? prazos.map((t) => linhaPrazo(t, estado)).join('')
        : '<div class="coluna-vazia">Nenhuma tarefa com prazo em aberto.</div>'}
    </div>`;
}

function kpi(rotulo, valor, alerta) {
  return `<div class="kpi">
    <div class="rotulo">${rotulo}</div>
    <div class="valor${alerta ? ' alerta' : ''}">${valor}</div>
  </div>`;
}

function linhaPrazo(t, estado) {
  const resp = estado.equipe.find((p) => p.id === t.responsavel_id);
  const nome = resp ? (resp.nome_cracha || resp.nome_completo) : '—';
  const dias = diasAte(t.prazo);
  let etiqueta = '';
  if (dias != null && dias < 0) etiqueta = '<span class="tag perigo">atrasada</span>';
  else if (dias === 0) etiqueta = '<span class="tag andamento">hoje</span>';
  return `<div class="linha-prazo">
    <span class="av">${esc(iniciais(nome))}</span>
    <span class="titulo">${esc(t.titulo)}</span>
    ${etiqueta}
    <span class="data">${fmtData(t.prazo)}</span>
  </div>`;
}
