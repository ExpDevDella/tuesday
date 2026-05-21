/**
 * auth.js — Login com Google (ou usuario de demonstracao no modo demo).
 *
 * No modo real, usa o Google Identity Services: a pessoa entra com a
 * conta Google e recebemos um "ID token" (JWT) que e enviado a API.
 */
import { MODO_DEMO, GOOGLE_CLIENT_ID } from './config.js';

let token = sessionStorage.getItem('exp_token') || '';
let usuario = JSON.parse(sessionStorage.getItem('exp_usuario') || 'null');

export function estaLogado() {
  return MODO_DEMO ? !!usuario : !!token;
}

export function getToken() {
  return token;
}

export function getUsuario() {
  return usuario;
}

export function sair() {
  token = '';
  usuario = null;
  sessionStorage.removeItem('exp_token');
  sessionStorage.removeItem('exp_usuario');
  location.reload();
}

/** Le o "payload" de um JWT, so para exibir nome e e-mail do usuario. */
function lerJwt(jwt) {
  try {
    const base = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(base))));
  } catch (e) {
    return {};
  }
}

function guardar(novoToken, dadosUsuario) {
  token = novoToken || '';
  usuario = dadosUsuario;
  if (token) sessionStorage.setItem('exp_token', token);
  sessionStorage.setItem('exp_usuario', JSON.stringify(usuario));
}

/**
 * Monta o botao de entrada dentro de `slot` e chama `aoEntrar()`
 * quando o login der certo.
 */
export function montarBotaoEntrada(slot, aoEntrar) {
  // Modo demonstracao: entra direto, sem Google.
  if (MODO_DEMO) {
    const b = document.createElement('button');
    b.className = 'login-demo';
    b.innerHTML = '<i class="ti ti-player-play"></i> Entrar em modo demonstração';
    b.onclick = () => {
      guardar('', { nome: 'Visitante demo', email: 'demo@exp.rec.br' });
      aoEntrar();
    };
    slot.appendChild(b);
    return;
  }

  // Modo real: a biblioteca do Google pode ainda estar carregando.
  if (!window.google || !window.google.accounts) {
    slot.textContent = 'Carregando o login do Google...';
    setTimeout(() => montarBotaoEntrada(slot, aoEntrar), 400);
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      const dados = lerJwt(resp.credential);
      guardar(resp.credential, {
        nome: dados.name || dados.email,
        email: dados.email,
        foto: dados.picture || '',
      });
      aoEntrar();
    },
  });
  slot.innerHTML = '';
  window.google.accounts.id.renderButton(slot, {
    theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR',
  });
}
