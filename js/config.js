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

export const MODO_DEMO = true;

export const API_URL = 'COLE_AQUI_A_URL_EXEC_DA_API';

export const GOOGLE_CLIENT_ID = 'COLE_AQUI_O_ID_DE_CLIENTE_OAUTH';
