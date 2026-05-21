/**
 * util.js — Funcoes auxiliares puras (sem dependencias).
 * Usadas pelas telas para formatar datas, valores e textos.
 */

/** "2026-06-04..." -> "04/06/2026". Aceita data ISO completa ou curta. */
export function fmtData(v) {
  if (!v) return '';
  const p = String(v).slice(0, 10).split('-');
  if (p.length !== 3) return String(v);
  return `${p[2]}/${p[1]}/${p[0]}`;
}

/** "2026-06-04..." -> "04/06". */
export function fmtDataCurta(v) {
  if (!v) return '';
  const p = String(v).slice(0, 10).split('-');
  if (p.length !== 3) return '';
  return `${p[2]}/${p[1]}`;
}

/** Converte uma data ISO para objeto Date (meia-noite, horario local). */
export function paraData(v) {
  if (!v) return null;
  const p = String(v).slice(0, 10).split('-');
  if (p.length !== 3) return null;
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Quantos dias faltam ate a data (negativo = ja passou). */
export function diasAte(v) {
  const d = paraData(v);
  if (!d) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d - hoje) / 86400000);
}

/** Numero -> "R$ 1.234". Sem casas decimais. */
export function fmtMoeda(n) {
  const v = Number(n) || 0;
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Numero grande -> "1,4 mi" / "850 mil". Para cartoes compactos. */
export function fmtMoedaCurta(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(2).replace('.', ',') + ' mi';
  if (v >= 1000) return 'R$ ' + Math.round(v / 1000) + ' mil';
  return fmtMoeda(v);
}

/** "Fernando Olliver" -> "FO". Para os avatares. */
export function iniciais(nome) {
  const ps = String(nome || '').trim().split(/\s+/);
  if (!ps[0]) return '?';
  const ultimo = ps.length > 1 ? ps[ps.length - 1][0] : '';
  return (ps[0][0] + ultimo).toUpperCase();
}

/** Escapa texto para inserir com seguranca dentro de innerHTML. */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
