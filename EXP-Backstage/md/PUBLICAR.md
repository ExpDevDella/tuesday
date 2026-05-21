# Fase 3 — Testar e publicar o site

O site é estático (HTML, CSS e JavaScript puro, sem build). Ele já vem
em **modo demonstração**: abre sozinho, com dados de exemplo, sem precisar
de API nem login. Assim dá para ver tudo funcionando antes de conectar
o backend.

---

## 1. Testar no seu computador

Os módulos JavaScript não carregam abrindo o arquivo direto (`file://`) —
precisam de um servidor local. Escolha uma das opções, dentro da pasta
`site/`:

- **VS Code:** instale a extensão *Live Server* e clique em "Go Live".
- **Python:** `python -m http.server 8080` e abra `http://localhost:8080`.
- **Node:** `npx serve` e abra a URL que aparecer.

Como o `MODO_DEMO` começa ligado, o site abre direto no Painel com os
dados de exemplo. Clique em "Entrar em modo demonstração", navegue entre
Painel e Tarefas, crie e arraste tarefas — tudo funciona em memória.

## 2. Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `exp-backstage-site`).
2. Envie para ele **o conteúdo da pasta `site/`** (o `index.html` deve
   ficar na raiz do repositório).
3. No repositório: **Settings → Pages**.
4. Em "Build and deployment", fonte **Deploy from a branch**, branch
   `main` e pasta `/ (root)`. Salve.
5. Em um minuto o site fica no ar em
   `https://SEU-USUARIO.github.io/exp-backstage-site/`.

## 3. Conectar à API de verdade

Quando quiser sair do modo demonstração e usar o backend real, edite o
arquivo `js/config.js`:

```javascript
export const MODO_DEMO = false;
export const API_URL = 'https://script.google.com/macros/s/.../exec';
export const GOOGLE_CLIENT_ID = '....apps.googleusercontent.com';
```

- **`API_URL`** — a URL `/exec` do Apps Script (Fase 2).
- **`GOOGLE_CLIENT_ID`** — o ID de cliente OAuth (Fase 2, etapa 4).

E falta um ajuste no Google Cloud: no **ID de cliente OAuth**, em
**Origens JavaScript autorizadas**, adicione a origem do site —
apenas o domínio, sem o caminho:

```
https://SEU-USUARIO.github.io
```

Salve, envie o `config.js` atualizado para o repositório e pronto: o
site passa a ler e gravar no Google Sheets, com login pela conta Google.

---

## Estrutura dos arquivos

```
site/
  index.html          casca da página
  css/estilo.css      tema roxo + Roboto
  js/
    config.js         o que você preenche (modo, API, OAuth)
    demo.js           dados de exemplo do modo demonstração
    util.js           funções auxiliares (datas, valores, texto)
    auth.js           login com Google
    api.js            cliente da API (real ou demo)
    app.js            casca do app, navegação e estado
    painel.js         tela Painel
    tarefas.js        tela Tarefas (kanban)
```

Os módulos são pequenos e separados por responsabilidade — dá para mexer
em uma tela sem tocar nas outras.
