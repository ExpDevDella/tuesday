# Fase 2 — Instalar e publicar a API

Guia para colocar a API do EXP-Backstage no ar. A API é um Google Apps
Script ligado à planilha-backend; o site (Fase 3) vai conversar com ela.

São cinco etapas. As etapas 1 a 3 já deixam a API publicada e testável.
As etapas 4 e 5 (login com Google) podem ser feitas agora ou junto da
Fase 3 — o login só passa a ser exigido quando o site existir.

---

## 1. Criar o projeto Apps Script

1. Abra a planilha-backend no Google Sheets.
2. Menu **Extensões → Apps Script**. Abre o editor de código.
3. O editor vem com um arquivo `Código.gs`. Renomeie-o para **`Config`**
   (ícone de três pontos ao lado do nome → Renomear) e cole o conteúdo
   do arquivo `Config.gs`.
4. Crie os outros três arquivos: botão **+** ao lado de "Arquivos" →
   **Script**. Crie `Auth`, `Planilha` e `API`, colando o conteúdo de
   cada arquivo correspondente.
5. Salve tudo (Ctrl+S).

A ordem dos arquivos não importa — o Apps Script junta todos.

## 2. Publicar como aplicativo da Web

1. No editor, botão **Implantar → Nova implantação**.
2. Em "Tipo" (ícone de engrenagem), escolha **App da Web**.
3. Configure:
   - **Descrição:** `API EXP-Backstage v1`
   - **Executar como:** `Eu`
   - **Quem pode acessar:** `Qualquer pessoa`
4. Clique em **Implantar**. O Google vai pedir para **autorizar** as
   permissões do script (acessar a planilha e fazer requisições
   externas) — aceite.
5. Copie a **URL do app da Web** (termina em `/exec`). Guarde — ela vai
   para o site na Fase 3.

> **Por que "Qualquer pessoa"?** O site é público, então a chamada chega
> sem identificação na camada do Google. Quem garante a segurança é a
> nossa verificação de token (etapa 4): sem um login Google válido e na
> lista de autorizados, a API recusa qualquer operação.

## 3. Testar a API

Abra a URL `/exec` no navegador. Deve aparecer:

```json
{"ok":true,"servico":"EXP-Backstage API","versao":"1.0"}
```

Apareceu? A API está no ar. 🎉

---

## 4. Criar o ID de cliente OAuth (login com Google)

Necessário para o login funcionar. Feito no Google Cloud Console.

1. Acesse **console.cloud.google.com** e selecione (ou crie) um projeto.
2. Menu **APIs e serviços → Tela de permissão OAuth**:
   - Se `exp.rec.br` for Google Workspace, escolha **Interno** (mais
     simples, sem verificação, só pessoas da empresa).
   - Preencha nome do app e e-mails de contato e salve.
3. Menu **APIs e serviços → Credenciais → Criar credenciais →
   ID do cliente OAuth**:
   - **Tipo de aplicativo:** `Aplicativo da Web`
   - **Nome:** `EXP-Backstage`
   - **Origens JavaScript autorizadas:** adicione, por enquanto,
     `http://localhost:8080` (para testes). A URL do GitHub Pages será
     acrescentada aqui na Fase 3 — dá para editar depois.
   - Clique em **Criar** e copie o **ID do cliente**.

## 5. Preencher o `Config.gs`

No editor do Apps Script, no arquivo `Config`:

- **`CLIENT_ID`** → cole o ID do cliente OAuth da etapa 4.
- **`EMAILS_AUTORIZADOS`** → liste os e-mails Google da equipe, em
  minúsculo. Exemplo:

  ```javascript
  const EMAILS_AUTORIZADOS = [
    'thiago@exp.rec.br',
    'olliver@exp.rec.br',
    'itamar@exp.rec.br',
  ];
  ```

Salve e **publique de novo** (Implantar → Gerenciar implantações →
ícone de lápis → Versão: "Nova versão" → Implantar). A URL `/exec`
continua a mesma.

---

## Atualizações futuras

Sempre que mudarmos o código da API, o caminho é:
**Implantar → Gerenciar implantações → editar (lápis) → Nova versão →
Implantar**. Assim a URL nunca muda e o site não precisa ser ajustado.

## Como a API funciona (resumo)

- `doGet` → verificação de saúde, sem login.
- `doPost` → todas as operações de dados. Recebe um JSON com `token`
  (login Google), `acao` e os parâmetros. Ações: `listar`, `obter`,
  `criar`, `atualizar`, `excluir`, `config`.
- Toda escrita é protegida por trava (`LockService`): duas pessoas
  gravando ao mesmo tempo não se sobrepõem.
- As linhas são identificadas pelo `id` (UUID) — ordenar a planilha
  na mão não quebra nada.
