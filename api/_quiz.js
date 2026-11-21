/* Lista de telas e perguntas do quiz, lida do próprio assets/js/quiz-perguntas.js (o mesmo do site).
   O arquivo grava window.QUIZ_FLUXO; aqui criamos um "window" vazio antes e apagamos depois,
   para nenhuma biblioteca achar que está num navegador. */
import "./_quiz-janela.js";
import "../assets/js/quiz-perguntas.js";

export const QUIZ_FLUXO = (globalThis.window && globalThis.window.QUIZ_FLUXO) || [];
delete globalThis.window;
