// browser_main.js
import { game, initializeGame } from './game.js';
import { initBrowserGame } from './browser_io.js';

window.onload = () => {
    initBrowserGame(game, initializeGame);
};