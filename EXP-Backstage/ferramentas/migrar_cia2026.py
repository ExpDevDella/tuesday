#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
migrar_cia2026.py
=================
Migracao da planilha "CIA 2026 - PLANEJAMENTO.xlsx" para o backend
normalizado do EXP-Backstage.

O que faz:
  1. Le a planilha de planejamento atual (origem).
  2. Normaliza os dados em 8 tabelas: Eventos, Equipe, Fornecedores,
     Itens, Orcamentos, Tarefas, Cronograma e Config.
  3. Gera um novo arquivo .xlsx (destino) ja formatado com o tema roxo,
     dropdowns e cabecalhos congelados. Esse arquivo vira o Google Sheets
     que serve de backend.

Uso:
  python migrar_cia2026.py [origem.xlsx] [destino.xlsx]

Convencoes do backend:
  - O cabecalho de cada aba sao os nomes de campo (snake_case). A API
    le a primeira linha e mapeia direto para os campos -> nao renomeie.
  - Toda linha tem um 'id' UUID. As relacoes entre tabelas usam *_id.
  - Campos *_id apontam para o 'id' de outra tabela.
  - created_at / updated_at sao preenchidos na migracao.
"""

import sys
import uuid
import unicodedata
from datetime import datetime, date

from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# --------------------------------------------------------------------------
# Configuracao
# --------------------------------------------------------------------------
ORIGEM = sys.argv[1] if len(sys.argv) > 1 else "CIA 2026 - PLANEJAMENTO.xlsx"
DESTINO = sys.argv[2] if len(sys.argv) > 2 else "EXP-Backstage-Backend.xlsx"

AGORA = datetime.now().replace(microsecond=0)

# Identidade visual
ROXO = "6B3E92"          # cabecalhos
ROXO_CLARO = "EDE7F3"    # destaque
BRANCO = "FFFFFF"
FONTE = "Roboto"         # o Google Sheets tem Roboto nativo

# Membros citados na operacao que nao estavam nas abas CRACHÁS/PRODUTORES.
# Confirmados pela equipe em 21/05/2026.
MEMBROS_EXTRA = ["Tota", "Marcio", "Turco"]

# Apelidos: nome como aparece na planilha (normalizado) -> nome ja cadastrado.
APELIDOS = {"izabella": "iza"}


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def novo_id():
    """Gera um identificador unico (UUID v4)."""
    return str(uuid.uuid4())


def txt(valor):
    """Limpa um valor de celula. Texto perde espacos das pontas;
    None vira ''; numeros e datas passam direto."""
    if valor is None:
        return ""
    if isinstance(valor, str):
        return valor.strip()
    return valor


def chave(valor):
    """Normaliza um texto para comparacao: minusculo, sem acento,
    sem espacos extras. Serve para casar nomes escritos de formas
    diferentes (ex.: 'Olliver ' x 'OLLIVER')."""
    s = "" if valor is None else str(valor)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return " ".join(s.lower().split())


def parse_data(valor):
    """Converte para date. Se nao for data, devolve None."""
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    return None


# Padroniza os status, que na origem aparecem com caixa e acentos variados.
_MAPA_STATUS = {
    "pendente": "Pendente",
    "em andamento": "Em andamento",
    "concluido": "Concluído",
    "contratado": "Contratado",
    "orcado": "Orçado",
    "nao iniciado": "Não iniciado",
    "travado": "Travado",
    "aprovado": "Aprovado",
    "recusado": "Recusado",
    "nao necessita": "Não necessita",
    "nao necessario": "Não necessário",
    "agendada": "Agendada",
}


def status(valor):
    """Devolve o status no formato padrao. Valores desconhecidos sao
    apenas limpos (sem mudanca de caixa)."""
    s = txt(valor)
    if not isinstance(s, str) or not s:
        return ""
    return _MAPA_STATUS.get(chave(s), s)


def distintos(linhas, *campos):
    """Lista ordenada de valores distintos (nao vazios) de um ou mais campos."""
    achados = set()
    for linha in linhas:
        for campo in campos:
            v = linha.get(campo, "")
            if isinstance(v, str) and v.strip():
                achados.add(v.strip())
    return sorted(achados, key=lambda x: chave(x))


# --------------------------------------------------------------------------
# Leitura da planilha de origem
# --------------------------------------------------------------------------
print(f"Lendo origem: {ORIGEM}")
wb = load_workbook(ORIGEM, data_only=True)


# --------------------------------------------------------------------------
# Tabela: Equipe  (origem: abas CRACHÁS + PRODUTORES)
# --------------------------------------------------------------------------
equipe = []
_equipe_por_chave = {}   # chave(nome) -> id


def _indexar_equipe(reg, *apelidos):
    """Registra um membro e os apelidos que apontam para o id dele."""
    for apelido in apelidos:
        k = chave(apelido)
        if k and k not in _equipe_por_chave:
            _equipe_por_chave[k] = reg["id"]


def resolver_pessoa(nome):
    """Encontra o id de um membro da equipe a partir de um nome solto.
    Tenta, em ordem: correspondencia exata, primeiro nome no nome
    completo, nome contido no nome completo, primeiro nome no cracha.
    Devolve '' se nao achar ou se for ambiguo."""
    k = chave(nome)
    if not k:
        return ""
    k = APELIDOS.get(k, k)          # resolve apelidos conhecidos (ex.: Izabella -> Iza)
    if k in _equipe_por_chave:
        return _equipe_por_chave[k]

    def unico(candidatos):
        return candidatos[0]["id"] if len(candidatos) == 1 else ""

    achou = unico([r for r in equipe
                   if chave(r["nome_completo"]).split()[:1] == [k]])
    if achou:
        return achou
    achou = unico([r for r in equipe if k in chave(r["nome_completo"])])
    if achou:
        return achou
    achou = unico([r for r in equipe
                   if chave(r["nome_cracha"]).split()[:1] == [k]])
    return achou


# CRACHÁS e a lista mais completa de pessoas
ws = wb["CRACHÁS"]
for r in range(3, ws.max_row + 1):
    nome_completo = txt(ws.cell(r, 2).value)
    if not nome_completo:
        continue
    reg = {
        "id": novo_id(),
        "nome_completo": nome_completo,
        "nome_cracha": txt(ws.cell(r, 3).value),
        "funcao": "",
        "area": "",
        "setor": txt(ws.cell(r, 5).value),
        "email": "",
        "telefone": "",
        "foto_url": txt(ws.cell(r, 4).value),
        "ativo": "Sim",
        "created_at": AGORA,
        "updated_at": AGORA,
    }
    equipe.append(reg)
    _indexar_equipe(reg, nome_completo, reg["nome_cracha"])

# PRODUTORES traz funcao e area; completa quem ja existe ou cria novo
ws = wb["PRODUTORES"]
for r in range(3, ws.max_row + 1):
    nome = txt(ws.cell(r, 1).value)
    if not nome:
        continue
    pid = resolver_pessoa(nome)
    if pid:
        reg = next(x for x in equipe if x["id"] == pid)
        reg["funcao"] = txt(ws.cell(r, 2).value)
        reg["area"] = txt(ws.cell(r, 3).value)
    else:
        reg = {
            "id": novo_id(),
            "nome_completo": nome,
            "nome_cracha": nome,
            "funcao": txt(ws.cell(r, 2).value),
            "area": txt(ws.cell(r, 3).value),
            "setor": "",
            "email": "",
            "telefone": "",
            "foto_url": "",
            "ativo": "Sim",
            "created_at": AGORA,
            "updated_at": AGORA,
        }
        equipe.append(reg)
        _indexar_equipe(reg, nome)

# Membros confirmados pela equipe que nao constavam em CRACHÁS/PRODUTORES
for nome in MEMBROS_EXTRA:
    if resolver_pessoa(nome):
        continue
    reg = {
        "id": novo_id(),
        "nome_completo": nome,
        "nome_cracha": nome,
        "funcao": "",
        "area": "",
        "setor": "",
        "email": "",
        "telefone": "",
        "foto_url": "",
        "ativo": "Sim",
        "created_at": AGORA,
        "updated_at": AGORA,
    }
    equipe.append(reg)
    _indexar_equipe(reg, nome)


# --------------------------------------------------------------------------
# Tabela: Fornecedores  (criada sob demanda a partir dos nomes citados)
# --------------------------------------------------------------------------
fornecedores = []
_fornecedor_por_chave = {}


def obter_fornecedor(nome):
    """Devolve o id do fornecedor, criando o registro se for a 1a vez.
    Nome vazio devolve ''."""
    nome = txt(nome)
    if not nome or not isinstance(nome, str):
        return ""
    k = chave(nome)
    if k in _fornecedor_por_chave:
        return _fornecedor_por_chave[k]
    reg = {
        "id": novo_id(),
        "nome": nome,
        "categoria": "",
        "contato_nome": "",
        "telefone": "",
        "email": "",
        "observacoes": "",
        "created_at": AGORA,
        "updated_at": AGORA,
    }
    fornecedores.append(reg)
    _fornecedor_por_chave[k] = reg["id"]
    return reg["id"]


# --------------------------------------------------------------------------
# Tabela: Eventos  (origem: cabecalho da aba CHECKLIST)
# --------------------------------------------------------------------------
ck = wb["CHECKLIST"]
evento = {
    "id": novo_id(),
    "nome": "Copa Inter Atléticas 2026",
    "tipo_evento": "",                       # a definir pela equipe
    "cidade": txt(ck["B5"].value),
    "local": txt(ck["B6"].value),
    "data_inicio": parse_data(ck["B3"].value),
    "data_fim": parse_data(ck["B4"].value),
    "descricao": txt(ck["B7"].value),
    "fase": "Execução",                      # SUPOSICAO: montagem em andamento
    "responsavel_id": resolver_pessoa("Olliver"),
    "status": "Ativo",
    "created_at": AGORA,
    "updated_at": AGORA,
}
EVENTO_ID = evento["id"]
eventos = [evento]


# --------------------------------------------------------------------------
# Tabela: Itens  (origem: aba PLANILHA DE TRABALHO)
# --------------------------------------------------------------------------
# Mapa: indice da coluna na origem -> campo no backend
_MAPA_ITENS = {
    1: "id_origem", 2: "status_origem", 3: "categoria", 4: "item",
    5: "descritivo", 6: "observacao", 7: "fornecedor", 8: "responsavel",
    9: "empresa_socio", 10: "socios_frente", 11: "status_contrato",
    12: "status_producao", 13: "status_pagamento", 14: "qntd", 15: "freq",
    16: "unidade", 17: "qntd_total", 18: "valor_unitario", 19: "valor_total",
    20: "prazo_execucao", 21: "dias_prazo", 22: "score_risco",
    23: "prioridade", 24: "status_geral", 25: "trava_op", 26: "quem_decide",
    27: "setor_impactado", 28: "pergunta_decisao", 29: "proxima_acao",
    30: "impacto_nao_decidir", 31: "observacao_reuniao", 32: "score_rank",
    33: "atualizado_por", 34: "proxima_checagem",
}
_STATUS_ITENS = {"status_origem", "status_contrato",
                 "status_producao", "status_pagamento"}
_DATAS_ITENS = {"prazo_execucao", "proxima_checagem"}

itens = []
ws = wb["PLANILHA DE TRABALHO"]
for r in range(3, ws.max_row + 1):
    valores = [ws.cell(r, c).value for c in range(1, 35)]
    if all(v in (None, "") for v in valores):
        continue
    reg = {"id": novo_id(), "evento_id": EVENTO_ID}
    for col, campo in _MAPA_ITENS.items():
        bruto = ws.cell(r, col).value
        if campo in _STATUS_ITENS:
            reg[campo] = status(bruto)
        elif campo in _DATAS_ITENS:
            reg[campo] = parse_data(bruto)
        else:
            reg[campo] = txt(bruto)
    reg["fornecedor_id"] = obter_fornecedor(reg["fornecedor"])
    reg["responsavel_id"] = resolver_pessoa(reg["responsavel"])
    reg["created_at"] = AGORA
    reg["updated_at"] = AGORA
    itens.append(reg)

# Indice para ligar orcamentos aos itens pelo texto do item
_item_por_chave = {}
for reg in itens:
    k = chave(reg["item"])
    if k:
        _item_por_chave.setdefault(k, reg["id"])


# --------------------------------------------------------------------------
# Tabela: Orcamentos  (origem: aba ORÇAMENTOS)
# --------------------------------------------------------------------------
orcamentos = []
ws = wb["ORÇAMENTOS"]
for r in range(3, ws.max_row + 1):
    valores = [ws.cell(r, c).value for c in range(1, 11)]
    if all(v in (None, "") for v in valores):
        continue
    item_nome = txt(ws.cell(r, 2).value)
    reg = {
        "id": novo_id(),
        "evento_id": EVENTO_ID,
        "item_id": _item_por_chave.get(chave(item_nome), ""),
        "item_nome": item_nome,
        "categoria": txt(ws.cell(r, 1).value),
        "descritivo_orcado": txt(ws.cell(r, 3).value),
        "observacao": txt(ws.cell(r, 4).value),
        "fornecedor": txt(ws.cell(r, 5).value),
        "fornecedor_id": obter_fornecedor(ws.cell(r, 5).value),
        "qntd_total": txt(ws.cell(r, 6).value),
        "valor_unitario": txt(ws.cell(r, 7).value),
        "valor_total": txt(ws.cell(r, 8).value),
        "obs": txt(ws.cell(r, 9).value),
        "responsavel": txt(ws.cell(r, 10).value),
        "responsavel_id": resolver_pessoa(ws.cell(r, 10).value),
        "status": "Pendente",     # a origem nao tem status de cotacao
        "created_at": AGORA,
        "updated_at": AGORA,
    }
    orcamentos.append(reg)


# --------------------------------------------------------------------------
# Tabela: Tarefas  (origem: aba CHECKLIST, linhas a partir da 11)
# --------------------------------------------------------------------------
tarefas = []
ws = wb["CHECKLIST"]
for r in range(11, ws.max_row + 1):
    titulo = txt(ws.cell(r, 2).value)
    acao = txt(ws.cell(r, 4).value)
    if not titulo and not acao:
        continue
    reg = {
        "id": novo_id(),
        "evento_id": EVENTO_ID,
        "fase": "",                          # CHECKLIST nao tem fase
        "categoria": txt(ws.cell(r, 1).value),
        "titulo": titulo,
        "descricao": acao,
        "item_id": "",
        "fornecedor": txt(ws.cell(r, 5).value),
        "fornecedor_id": obter_fornecedor(ws.cell(r, 5).value),
        "responsavel": txt(ws.cell(r, 6).value),
        "responsavel_id": resolver_pessoa(ws.cell(r, 6).value),
        "data_criacao": parse_data(ws.cell(r, 7).value),
        "prazo": parse_data(ws.cell(r, 8).value),
        "status": status(ws.cell(r, 9).value),
        "origem": "Manual",
        "created_at": AGORA,
        "updated_at": AGORA,
    }
    tarefas.append(reg)


# --------------------------------------------------------------------------
# Tabela: Cronograma  (origem: aba CRONOGRAMA)
# --------------------------------------------------------------------------
# A origem desenha o cronograma como uma grade de dias (colunas 9..57).
# Aqui guardamos apenas data_inicio / data_fim: os dias agendados sao
# as celulas com marca numerica; pegamos a menor e a maior data.
cronograma = []
ws = wb["CRONOGRAMA"]
datas_das_colunas = {}
for c in range(9, 58):
    d = parse_data(ws.cell(1, c).value)
    if d:
        datas_das_colunas[c] = d

for r in range(4, ws.max_row + 1):
    servico = txt(ws.cell(r, 3).value)
    item = txt(ws.cell(r, 4).value)
    if not servico and not item:
        continue
    dias_marcados = [datas_das_colunas[c]
                     for c in datas_das_colunas
                     if isinstance(ws.cell(r, c).value, (int, float))]
    reg = {
        "id": novo_id(),
        "evento_id": EVENTO_ID,
        "id_origem": txt(ws.cell(r, 2).value),
        "setor": txt(ws.cell(r, 1).value),
        "servico": servico,
        "item": item,
        "fornecedor": txt(ws.cell(r, 5).value),
        "fornecedor_id": obter_fornecedor(ws.cell(r, 5).value),
        "produtor": txt(ws.cell(r, 6).value),
        "responsavel_id": resolver_pessoa(ws.cell(r, 6).value),
        "tipo": "",                          # origem nao distingue mont./desm.
        "data_inicio": min(dias_marcados) if dias_marcados else None,
        "data_fim": max(dias_marcados) if dias_marcados else None,
        "dias": txt(ws.cell(r, 8).value),
        "status": status(ws.cell(r, 7).value),
        "observacao": "",
        "created_at": AGORA,
        "updated_at": AGORA,
    }
    cronograma.append(reg)


# --------------------------------------------------------------------------
# Tabela: Config  (listas de valores para os menus suspensos)
# --------------------------------------------------------------------------
config = {
    "fase": ["Briefing", "Orçamento", "Aprovação", "Contratações",
             "Execução", "Operação", "Pós-evento", "Finalizado"],
    "status_evento": ["Ativo", "Arquivado"],
    "status_3etapas": ["Pendente", "Em andamento", "Concluído"],
    "status_tarefa": ["Não iniciado", "Em andamento", "Concluído"],
    "status_cronograma": ["Não iniciado", "Em andamento",
                          "Concluído", "Travado"],
    "status_orcamento": ["Pendente", "Aprovado", "Recusado"],
    "categoria_item": distintos(itens, "categoria"),
    "prioridade": distintos(itens, "prioridade"),
    "status_geral": distintos(itens, "status_geral"),
    "trava_op": distintos(itens, "trava_op"),
    "unidade": distintos(itens, "unidade"),
    "setor": distintos(itens, "setor_impactado") + distintos(cronograma, "setor"),
    "categoria_tarefa": distintos(tarefas, "categoria"),
}
# remove duplicatas em 'setor' mantendo a ordem
config["setor"] = sorted(set(config["setor"]), key=lambda x: chave(x))


# --------------------------------------------------------------------------
# Escrita do arquivo de backend
# --------------------------------------------------------------------------
COLUNAS = {
    "Eventos": ["id", "nome", "tipo_evento", "cidade", "local",
                "data_inicio", "data_fim", "descricao", "fase",
                "responsavel_id", "status", "created_at", "updated_at"],
    "Equipe": ["id", "nome_completo", "nome_cracha", "funcao", "area",
               "setor", "email", "telefone", "foto_url", "ativo",
               "created_at", "updated_at"],
    "Fornecedores": ["id", "nome", "categoria", "contato_nome", "telefone",
                     "email", "observacoes", "created_at", "updated_at"],
    "Itens": ["id", "evento_id", "id_origem", "status_origem", "categoria",
              "item", "descritivo", "observacao", "fornecedor",
              "fornecedor_id", "responsavel", "responsavel_id",
              "empresa_socio", "socios_frente", "status_contrato",
              "status_producao", "status_pagamento", "qntd", "freq",
              "unidade", "qntd_total", "valor_unitario", "valor_total",
              "prazo_execucao", "dias_prazo", "score_risco", "prioridade",
              "status_geral", "trava_op", "quem_decide", "setor_impactado",
              "pergunta_decisao", "proxima_acao", "impacto_nao_decidir",
              "observacao_reuniao", "score_rank", "atualizado_por",
              "proxima_checagem", "created_at", "updated_at"],
    "Orcamentos": ["id", "evento_id", "item_id", "item_nome", "categoria",
                   "descritivo_orcado", "observacao", "fornecedor",
                   "fornecedor_id", "qntd_total", "valor_unitario",
                   "valor_total", "obs", "responsavel", "responsavel_id",
                   "status", "created_at", "updated_at"],
    "Tarefas": ["id", "evento_id", "fase", "categoria", "titulo",
                "descricao", "item_id", "fornecedor", "fornecedor_id",
                "responsavel", "responsavel_id", "data_criacao", "prazo",
                "status", "origem", "created_at", "updated_at"],
    "Cronograma": ["id", "evento_id", "id_origem", "setor", "servico",
                   "item", "fornecedor", "fornecedor_id", "produtor",
                   "responsavel_id", "tipo", "data_inicio", "data_fim",
                   "dias", "status", "observacao", "created_at",
                   "updated_at"],
}

DADOS = {
    "Eventos": eventos,
    "Equipe": equipe,
    "Fornecedores": fornecedores,
    "Itens": itens,
    "Orcamentos": orcamentos,
    "Tarefas": tarefas,
    "Cronograma": cronograma,
}

# Larguras de coluna por tipo de campo
LARGAS = {"descritivo", "observacao", "item", "descricao", "titulo",
          "servico", "descritivo_orcado", "pergunta_decisao",
          "proxima_acao", "impacto_nao_decidir", "observacao_reuniao",
          "nome", "nome_completo", "item_nome"}


def largura(campo):
    if campo in LARGAS:
        return 38
    if campo == "id" or campo.endswith("_id"):
        return 20
    if "data" in campo or "prazo" in campo or campo == "proxima_checagem":
        return 13
    if campo in ("created_at", "updated_at"):
        return 17
    return 16


def escrever_aba(wb_saida, nome, colunas, linhas):
    """Cria uma aba com cabecalho roxo, dados, congelamento e filtro."""
    ws = wb_saida.create_sheet(nome)
    fonte_cab = Font(name=FONTE, bold=True, color=BRANCO, size=10)
    fonte_dado = Font(name=FONTE, size=10)
    fundo_cab = PatternFill("solid", fgColor=ROXO)

    for ci, campo in enumerate(colunas, 1):
        c = ws.cell(1, ci, campo)
        c.font = fonte_cab
        c.fill = fundo_cab
        c.alignment = Alignment(horizontal="center", vertical="center",
                                wrap_text=True)
        ws.column_dimensions[get_column_letter(ci)].width = largura(campo)

    for ri, linha in enumerate(linhas, 2):
        for ci, campo in enumerate(colunas, 1):
            v = linha.get(campo, "")
            c = ws.cell(ri, ci, v if v != "" else None)
            c.font = fonte_dado
            if isinstance(v, datetime):
                c.number_format = "DD/MM/YYYY HH:MM"
            elif isinstance(v, date):
                c.number_format = "DD/MM/YYYY"
            elif "valor" in campo:
                c.number_format = '"R$" #,##0.00'

    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 30
    ultima = get_column_letter(len(colunas))
    ws.auto_filter.ref = f"A1:{ultima}{max(len(linhas) + 1, 1)}"
    return ws


def escrever_config(wb_saida, listas):
    """Escreve a aba Config (uma lista por coluna) e devolve, para cada
    lista, a referencia de intervalo usada nos dropdowns."""
    ws = wb_saida.create_sheet("Config")
    fonte_cab = Font(name=FONTE, bold=True, color=BRANCO, size=10)
    fundo_cab = PatternFill("solid", fgColor=ROXO)
    refs = {}
    for ci, (nome_lista, valores) in enumerate(listas.items(), 1):
        L = get_column_letter(ci)
        c = ws.cell(1, ci, nome_lista)
        c.font = fonte_cab
        c.fill = fundo_cab
        c.alignment = Alignment(horizontal="center")
        ws.column_dimensions[L].width = 22
        for ri, valor in enumerate(valores, 2):
            ws.cell(ri, ci, valor).font = Font(name=FONTE, size=10)
        if valores:
            refs[nome_lista] = f"Config!${L}$2:${L}${len(valores) + 1}"
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 24
    return refs


def escrever_instrucoes(wb_saida):
    """Cria a aba inicial com a explicacao do backend."""
    ws = wb_saida.create_sheet("_INSTRUÇÕES")
    ws.column_dimensions["A"].width = 100
    linhas = [
        ("EXP-Backstage — Backend de dados", True),
        ("", False),
        ("Este arquivo e o banco de dados do sistema. Suba-o no Google "
         "Drive e abra como Planilha Google.", False),
        ("", False),
        ("Convencoes:", True),
        ("• O cabecalho de cada aba sao os nomes de campo. Nao renomeie "
         "nem reordene as colunas.", False),
        ("• A coluna 'id' e um UUID unico. Nunca edite os ids na mao.", False),
        ("• Campos terminados em '_id' apontam para o 'id' de outra aba "
         "(relacao entre tabelas).", False),
        ("• A aba Config guarda as listas dos menus suspensos.", False),
        ("• created_at / updated_at sao controlados pelo sistema.", False),
        ("", False),
        ("Tabelas: Eventos, Equipe, Fornecedores, Itens, Orcamentos, "
         "Tarefas, Cronograma, Config.", False),
        ("", False),
        (f"Gerado pela migracao em {AGORA:%d/%m/%Y %H:%M}.", False),
    ]
    for ri, (texto, destaque) in enumerate(linhas, 1):
        c = ws.cell(ri, 1, texto)
        if destaque:
            c.font = Font(name=FONTE, bold=True, size=13, color=ROXO)
        else:
            c.font = Font(name=FONTE, size=11)
        c.alignment = Alignment(wrap_text=True, vertical="top")
    return ws


# Liga cada coluna que recebe dropdown a uma lista da aba Config
VALIDACOES = {
    "Eventos": {"fase": "fase", "status": "status_evento"},
    "Itens": {"categoria": "categoria_item", "status_origem": None,
              "status_contrato": "status_3etapas",
              "status_producao": "status_3etapas",
              "status_pagamento": "status_3etapas",
              "prioridade": "prioridade", "status_geral": "status_geral",
              "trava_op": "trava_op", "unidade": "unidade",
              "setor_impactado": "setor"},
    "Orcamentos": {"status": "status_orcamento",
                   "categoria": "categoria_item"},
    "Tarefas": {"status": "status_tarefa", "categoria": "categoria_tarefa",
                "fase": "fase"},
    "Cronograma": {"status": "status_cronograma", "setor": "setor"},
}


def aplicar_validacoes(ws, colunas, mapa, refs):
    """Adiciona os menus suspensos numa aba."""
    for campo, nome_lista in mapa.items():
        if not nome_lista or nome_lista not in refs or campo not in colunas:
            continue
        L = get_column_letter(colunas.index(campo) + 1)
        dv = DataValidation(type="list", formula1=refs[nome_lista],
                            allow_blank=True, showErrorMessage=False)
        ws.add_data_validation(dv)
        dv.add(f"{L}2:{L}5000")


# Monta o arquivo
print(f"Gerando backend: {DESTINO}")
wb_saida = Workbook()
wb_saida.remove(wb_saida.active)            # remove a aba padrao vazia

escrever_instrucoes(wb_saida)
abas = {}
for nome in ("Eventos", "Equipe", "Fornecedores", "Itens",
             "Orcamentos", "Tarefas", "Cronograma"):
    abas[nome] = escrever_aba(wb_saida, nome, COLUNAS[nome], DADOS[nome])

refs = escrever_config(wb_saida, config)

for nome, mapa in VALIDACOES.items():
    aplicar_validacoes(abas[nome], COLUNAS[nome], mapa, refs)

wb_saida.save(DESTINO)


# --------------------------------------------------------------------------
# Resumo da migracao
# --------------------------------------------------------------------------
def taxa_relacao(linhas, campo_id, campo_texto):
    """% de linhas em que o *_id foi resolvido, considerando so as que
    tinham texto de origem."""
    com_texto = [x for x in linhas if str(x.get(campo_texto, "")).strip()]
    if not com_texto:
        return "—"
    ok = sum(1 for x in com_texto if x.get(campo_id))
    return f"{ok}/{len(com_texto)}"


print("\n" + "=" * 58)
print("MIGRACAO CONCLUIDA")
print("=" * 58)
print(f"  Eventos ......... {len(eventos)}")
print(f"  Equipe .......... {len(equipe)}")
print(f"  Fornecedores .... {len(fornecedores)}")
print(f"  Orcamentos ...... {len(orcamentos)}")
print(f"  Tarefas ......... {len(tarefas)}")
print(f"  Cronograma ...... {len(cronograma)}")
print("-" * 58)
print("Qualidade das relacoes (ids resolvidos / com texto de origem):")
print(f"  Itens.fornecedor_id ........ "
      f"{taxa_relacao(itens, 'fornecedor_id', 'fornecedor')}")
print(f"  Itens.responsavel_id ....... "
      f"{taxa_relacao(itens, 'responsavel_id', 'responsavel')}")
print(f"  Orcamentos.item_id ......... "
      f"{taxa_relacao(orcamentos, 'item_id', 'item_nome')}")
print(f"  Tarefas.responsavel_id ..... "
      f"{taxa_relacao(tarefas, 'responsavel_id', 'responsavel')}")
print(f"  Cronograma.responsavel_id .. "
      f"{taxa_relacao(cronograma, 'responsavel_id', 'produtor')}")
com_data = sum(1 for x in cronograma if x["data_inicio"])
print(f"  Cronograma com datas ....... {com_data}/{len(cronograma)}")
print("=" * 58)
