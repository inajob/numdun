// console_io.js
import { game, UPGRADES } from './core.js';
import readline from 'readline'; // Use import for readline

let rl; // For Node.js readline interface

function print(text) {
  console.log(text);
}

function clear() {
  console.clear();
}

function prompt(promptText, callback) {
  rl.question(promptText, callback);
}

function displayGridConsole(displayState) {
    clear();
    print(`--- Floor: ${displayState.floorNumber} ---`);
    print(`Upgrades: ${displayState.upgrades.join(', ') || 'None'}`);
    for (let r = 0; r < displayState.grid.length; r++) {
        let rowStr = '';
        for (let c = 0; c < displayState.grid[0].length; c++) {
            const isExit = r === displayState.exit.r && c === displayState.exit.c;
            const showExitEarly = game.hasUpgrade('reveal_exit_temporarily') && displayState.turn < 5; // game.hasUpgrade is still needed

            if (r === displayState.player.r && c === displayState.player.c) {
                const cell = displayState.grid[r][c];
                if (cell.isTrap) rowStr += 'P(X)';
                else if (cell.adjacentTraps === 0) rowStr += 'P(.)';
                else rowStr += `P(${cell.adjacentTraps})`;
            } else if (isExit && (displayState.grid[r][c].isRevealed || showExitEarly)) {
                rowStr += ' E ';
            }
            else {
                const cell = displayState.grid[r][c];
                if (cell.isRevealed) {
                    if (cell.isTrap) rowStr += ' X ';
                    else if (cell.adjacentTraps === 0) rowStr += ' . ';
                    else rowStr += ` ${cell.adjacentTraps} `;
                }
                else {
                    rowStr += ' ■ ';
                }
            }
        }
        print(rowStr);
    }
    print('------------------');
}

export function initConsoleGame() {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    game.setupFloor();
    runConsoleGameLoop();
}

function runConsoleGameLoop() {
    const gameResult = game.gameLoop();

    if (gameResult.gameOver) {
        displayGridConsole(gameResult.displayState);
        print(gameResult.message);
        rl.close();
        return;
    }

    if (gameResult.prompt) {
        displayGridConsole(gameResult.displayState);
        print(`--- Floor ${gameResult.displayState.floorNumber} Cleared! ---`); // Message for cleared floor
        print(`Upgrades: ${gameResult.displayState.upgrades.map(id => UPGRADES[id].name).join(', ') || 'None'}`); // Display upgrades
        print('Choose your upgrade:');
        gameResult.displayState.currentUpgradeChoices.forEach((id, index) => {
            print(`${index + 1}: ${UPGRADES[id].name} - ${UPGRADES[id].description}`);
        });
        print('');

        prompt(gameResult.prompt, (input) => {
            if (input.toLowerCase() === 'q') {
                game.isGameOver = true;
                runConsoleGameLoop();
                return;
            }
            const actionResult = game.handleInput(input);
            if (actionResult && actionResult.action === 'next_floor_after_delay') {
                print(actionResult.message);
                setTimeout(() => {
                    game.floorNumber++;
                    game.setupFloor();
                    runConsoleGameLoop();
                }, actionResult.delay);
            } else {
                runConsoleGameLoop();
            }
        });
    } else {
        // This case should ideally not happen if gameLoop always returns a prompt or game over state
        displayGridConsole(gameResult.displayState);
        runConsoleGameLoop();
    }
}