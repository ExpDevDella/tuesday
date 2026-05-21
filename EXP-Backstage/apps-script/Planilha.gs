/**
 * Planilha.gs — Camada de acesso ao Google Sheets.
 * ================================================
 * Le e grava nas abas do backend. Pontos importantes:
 *
 *  - Toda escrita passa por LockService: se duas pessoas gravarem ao
 *    mesmo tempo, uma espera a outra terminar (nada se sobrepoe).
 *  - As linhas sao localizadas pela coluna 'id' (UUID), nunca pela
 *    posicao. Ordenar ou filtrar a planilha nao quebra nada.
 *  - O cabecalho (linha 1) define os nomes dos campos.
 */

/** Abre a planilha de backend. */
function _abrirPlanilha() {
  return SpreadsheetApp.openById(SHEET_ID);
}

/** Devolve uma aba pelo nome (erro se nao existir). */
function _aba(nome) {
  const aba = _abrirPlanilha().getSheetByName(nome);
  if (!aba) throw new Error('Aba nao encontrada: ' + nome);
  return aba;
}

/**
 * Le uma aba inteira como lista de objetos.
 * @param {string} nome  nome da aba.
 * @return {object[]}    um objeto por linha; as chaves sao o cabecalho.
 */
function lerTabela(nome) {
  const valores = _aba(nome).getDataRange().getValues();
  if (valores.length < 2) return [];
  const cabecalho = valores[0];
  const linhas = [];
  for (let i = 1; i < valores.length; i++) {
    const obj = {};
    let vazia = true;
    for (let c = 0; c < cabecalho.length; c++) {
      const campo = cabecalho[c];
      if (!campo) continue;
      const v = valores[i][c];
      if (v !== '' && v !== null) vazia = false;
      obj[campo] = _paraJson(v);
    }
    if (!vazia) linhas.push(obj);
  }
  return linhas;
}

/** Le um unico registro pelo id (ou null se nao achar). */
function obterPorId(nome, id) {
  const linhas = lerTabela(nome);
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].id === id) return linhas[i];
  }
  return null;
}

/**
 * Le a aba Config como um mapa de listas: {nomeDaLista: [valores...]}.
 * Serve para o frontend montar os menus suspensos.
 */
function lerConfig() {
  const valores = _aba('Config').getDataRange().getValues();
  if (valores.length < 1) return {};
  const cabecalho = valores[0];
  const listas = {};
  for (let c = 0; c < cabecalho.length; c++) {
    const nome = cabecalho[c];
    if (!nome) continue;
    const itens = [];
    for (let i = 1; i < valores.length; i++) {
      const v = valores[i][c];
      if (v !== '' && v !== null) itens.push(v);
    }
    listas[nome] = itens;
  }
  return listas;
}

/**
 * Insere um novo registro. Gera o id (UUID) e created_at/updated_at.
 * @return {object} o registro criado, ja como ficou na planilha.
 */
function inserir(nome, dados) {
  return _comTrava(function () {
    const aba = _aba(nome);
    const cabecalho = aba.getRange(1, 1, 1, aba.getLastColumn())
      .getValues()[0];
    const agora = new Date();
    const registro = Object.assign({}, dados, {
      id: Utilities.getUuid(),
      created_at: agora,
      updated_at: agora,
    });
    const linha = cabecalho.map(function (campo) {
      return (campo in registro) ? _paraCelula(registro[campo]) : '';
    });
    aba.appendRow(linha);
    SpreadsheetApp.flush();
    return obterPorId(nome, registro.id);
  });
}

/**
 * Atualiza apenas os campos enviados de um registro existente.
 * 'id' e 'created_at' nunca sao alterados; 'updated_at' e renovado.
 * @return {object} o registro atualizado.
 */
function atualizar(nome, id, dados) {
  return _comTrava(function () {
    const aba = _aba(nome);
    const valores = aba.getDataRange().getValues();
    const cabecalho = valores[0];
    const colId = cabecalho.indexOf('id');
    const colAtualizado = cabecalho.indexOf('updated_at');
    for (let i = 1; i < valores.length; i++) {
      if (valores[i][colId] !== id) continue;
      for (let c = 0; c < cabecalho.length; c++) {
        const campo = cabecalho[c];
        if ((campo in dados) && campo !== 'id' && campo !== 'created_at') {
          aba.getRange(i + 1, c + 1).setValue(_paraCelula(dados[campo]));
        }
      }
      if (colAtualizado !== -1) {
        aba.getRange(i + 1, colAtualizado + 1).setValue(new Date());
      }
      SpreadsheetApp.flush();
      return obterPorId(nome, id);
    }
    throw new Error('Registro nao encontrado: ' + id);
  });
}

/** Exclui um registro pelo id. */
function excluir(nome, id) {
  return _comTrava(function () {
    const aba = _aba(nome);
    const valores = aba.getDataRange().getValues();
    const colId = valores[0].indexOf('id');
    for (let i = 1; i < valores.length; i++) {
      if (valores[i][colId] === id) {
        aba.deleteRow(i + 1);
        return { id: id, excluido: true };
      }
    }
    throw new Error('Registro nao encontrado: ' + id);
  });
}

/** Executa uma funcao protegida por trava (escrita exclusiva). */
function _comTrava(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(15000);   // espera ate 15s pela vez
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}

/** Converte um valor de celula para algo serializavel em JSON. */
function _paraJson(v) {
  if (v instanceof Date) return v.toISOString();
  return v;
}

/** Converte um valor vindo do frontend para gravar na celula. */
function _paraCelula(v) {
  if (v === null || v === undefined) return '';
  // Texto no formato "AAAA-MM-DD" vira uma data real (horario local),
  // para a coluna continuar sendo do tipo data.
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
  }
  return v;
}
