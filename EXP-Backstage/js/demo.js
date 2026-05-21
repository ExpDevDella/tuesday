/**
 * demo.js — Dados de exemplo para o MODO_DEMO.
 *
 * Quando MODO_DEMO esta ligado, a API (api.js) le e grava nestes
 * arrays, em memoria. Servem so para ver a interface funcionando
 * antes de conectar o backend real. Nada aqui vai para o Google Sheets.
 */

const EVENTO = 'evt-cia-2026';

export const DEMO = {
  Eventos: [
    {
      id: EVENTO, nome: 'Copa Inter Atléticas 2026',
      tipo_evento: 'Festival esportivo',
      cidade: 'Uberaba - MG', local: 'Centro Park',
      data_inicio: '2026-06-04', data_fim: '2026-06-07',
      fase: 'Execução', status: 'Ativo',
    },
  ],

  Equipe: [
    { id: 'p1', nome_completo: 'Fernando Olliver', nome_cracha: 'Olliver', funcao: 'Head Geral', ativo: 'Sim' },
    { id: 'p2', nome_completo: 'Della',            nome_cracha: 'Della',   funcao: 'Planejamento', ativo: 'Sim' },
    { id: 'p3', nome_completo: 'Itamar',           nome_cracha: 'Itamar',  funcao: 'Head Infra e mão de obra', ativo: 'Sim' },
    { id: 'p4', nome_completo: 'Júnior Pereira',   nome_cracha: 'Júnior',  funcao: 'Produção geral', ativo: 'Sim' },
    { id: 'p5', nome_completo: 'Izabella',         nome_cracha: 'Iza',     funcao: 'Arquiteta', ativo: 'Sim' },
    { id: 'p6', nome_completo: 'Bruno Bertolucci', nome_cracha: 'Bruno',   funcao: 'Produção', ativo: 'Sim' },
    { id: 'p7', nome_completo: 'Renata',           nome_cracha: 'Renata',  funcao: 'Produção geral', ativo: 'Sim' },
    { id: 'p8', nome_completo: 'Victor Batista',   nome_cracha: 'Victor',  funcao: 'Produção', ativo: 'Sim' },
  ],

  Itens: [
    { id: 'i1', evento_id: EVENTO, item: 'Pacote Palco Principal', categoria: 'ESTRUTURA GERAL', valor_total: 230000 },
    { id: 'i2', evento_id: EVENTO, item: 'Iluminação Palco Principal', categoria: 'ESTRUTURA EVENTUAL', valor_total: 230000 },
    { id: 'i3', evento_id: EVENTO, item: 'Sonorização Palco Principal', categoria: 'ESTRUTURA EVENTUAL', valor_total: 150000 },
    { id: 'i4', evento_id: EVENTO, item: 'Painel de LED', categoria: 'ESTRUTURA GERAL', valor_total: 150390 },
    { id: 'i5', evento_id: EVENTO, item: 'Pisos', categoria: 'ESTRUTURA GERAL', valor_total: 127720 },
    { id: 'i6', evento_id: EVENTO, item: 'Tendas', categoria: 'ESTRUTURA GERAL', valor_total: 51090 },
    { id: 'i7', evento_id: EVENTO, item: 'Box Palco eletrônico', categoria: 'ESTRUTURA GERAL', valor_total: 49070 },
    { id: 'i8', evento_id: EVENTO, item: 'Fechamentos', categoria: 'ESTRUTURA GERAL', valor_total: 38060 },
    { id: 'i9', evento_id: EVENTO, item: 'Gerador', categoria: 'ESTRUTURA GERAL', valor_total: 38000 },
  ],

  Tarefas: [
    { id: 't1', evento_id: EVENTO, categoria: '00. Montagem', titulo: 'Acompanhar montagem - Torres de andaime', descricao: 'Acompanhar a montagem das torres de caixa d’água.', responsavel_id: 'p3', prazo: '2026-05-20', status: 'Em andamento' },
    { id: 't2', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Negociar octanorm', descricao: 'Fechar valores de octanorm com o fornecedor.', responsavel_id: 'p6', prazo: '2026-05-21', status: 'Em andamento' },
    { id: 't3', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Definição de fornecedores de painel de led', descricao: 'Comparar cotações e escolher fornecedor.', responsavel_id: 'p1', prazo: '2026-05-23', status: 'Em andamento' },
    { id: 't4', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Atualizar descritivo de fechamentos', descricao: 'Atualizar o descritivo para liberar negociação.', responsavel_id: 'p5', prazo: '2026-05-20', status: 'Em andamento' },
    { id: 't5', evento_id: EVENTO, categoria: '00. Montagem', titulo: 'Acompanhar montagem - Tendas', descricao: 'Acompanhar a chegada e montagem das tendas.', responsavel_id: 'p4', prazo: '2026-05-22', status: 'Em andamento' },
    { id: 't6', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Pegar orçamento com o VJ Zee', descricao: 'Solicitar e receber o orçamento do VJ.', responsavel_id: 'p1', prazo: '2026-05-24', status: 'Não iniciado' },
    { id: 't7', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Orçar brinquedos (touro e pula-pula)', descricao: 'Levantar cotações dos brinquedos.', responsavel_id: 'p3', prazo: '2026-05-25', status: 'Não iniciado' },
    { id: 't8', evento_id: EVENTO, categoria: 'Operação', titulo: 'Definir cardápio do staff', descricao: 'Fechar o cardápio da alimentação da equipe.', responsavel_id: 'p2', prazo: '2026-05-26', status: 'Não iniciado' },
    { id: 't9', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Atualizar descritivo de barricadas', descricao: 'Descritivo de barricadas atualizado e liberado.', responsavel_id: 'p5', prazo: '2026-05-20', status: 'Concluído' },
    { id: 't10', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Atualizar linha de catracas na planilha', descricao: 'Linha de catracas revisada na planilha.', responsavel_id: 'p8', prazo: '2026-05-19', status: 'Concluído' },
    { id: 't11', evento_id: EVENTO, categoria: 'Estrutural', titulo: 'Confirmar banheiros químicos', descricao: 'Quantidade e fornecedor confirmados.', responsavel_id: 'p4', prazo: '2026-05-18', status: 'Concluído' },
  ],

  Config: {
    status_tarefa: ['Não iniciado', 'Em andamento', 'Concluído'],
    categoria_tarefa: ['00. Montagem', 'Estrutural', 'Operação', 'Pós-evento'],
    fase: ['Briefing', 'Orçamento', 'Aprovação', 'Contratações', 'Execução', 'Operação', 'Pós-evento', 'Finalizado'],
  },
};
