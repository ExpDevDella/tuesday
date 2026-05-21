/**
 * config.js — Configuracao do EXP-Backstage.
 *
 * Passos para ligar o site na API de verdade:
 *   1. Troque MODO_DEMO para false.
 *   2. Cole em API_URL a URL /exec da API (Apps Script publicado).
 *   3. Cole em GOOGLE_CLIENT_ID o ID de cliente OAuth.
 *
 * Com MODO_DEMO = true o site funciona sozinho, com dados de exemplo,
 * sem precisar de API nem login — util para ver e testar a interface.
 */

export const MODO_DEMO = false;

export const API_URL = 'https://script.google.com/macros/s/AKfycbyb4UWMVSTXpM9vJIxHLW_yRAsMYrAsCQxZX0-t_GQ9VI9gwMY20-PfA3J08ho5Lex46w/exec';

export const GOOGLE_CLIENT_ID = '117087945071-jtqfqhg0oqu6er5q8fsgq4loal71nb79.apps.googleusercontent.com';
