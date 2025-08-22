// console_io.js
import { game } from './game.js';
import { ITEMS } from './items.js';
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
    print(`Upgrades: ${displayState.items.map(id => ITEMS[id].name).join(', ') || 'None'}`);
    for (let r = 0; r < displayState.grid.length; r++) {
        let rowStr = '';
        for (let c = 0; c < displayState.grid[0].length; c++) {
            const isExit = r === displayState.exit.r && c === displayState.exit.c;
            const mapWasUsed = displayState.exitRevealedThisFloor;

            if (r === displayState.player.r && c === displayState.player.c) {
                const cell = displayState.grid[r][c];
                if (cell.isTrap) rowStr += 'P(X)';
                else if (cell.adjacentTraps === 0) rowStr += 'P(.)';
                else rowStr += `P(${cell.adjacentTraps})`;
            } else if (isExit && (displayState.grid[r][c].isRevealed || mapWasUsed)) {
                rowStr += ' E ';
            }
            else {
                const cell = displayState.grid[r][c];
                if (cell.isRevealed) {
                    if (cell.hasItem) {
                        rowStr += ' I ';
                    } else if (cell.isTrap) {
                        rowStr += ' X ';
                    } else if (cell.adjacentTraps === 0) {
                        rowStr += ' . ';
                    } else {
                        rowStr += ` ${cell.adjacentTraps} `;
                    }
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

    if (gameResult.gameState === 'gameover') { // gameStateで判定
        displayGridConsole(gameResult.displayState);
        print(gameResult.message);
        // NEW: リザルト情報を表示
        print('\n--- Game Over Result ---');
        print(`最終到達フロア: ${gameResult.result.finalFloorNumber}`);
        const finalItemNames = Object.entries(gameResult.result.finalItems)
            .map(([id, count]) => `${ITEMS[id].name} x${count}`)
            .join(', ');
        print(`所持アイテム: ${finalItemNames || 'なし'}`);
        print('各フロアの開示率:');
        if (gameResult.result.floorRevelationRates.length > 0) {
            gameResult.result.floorRevelationRates.forEach(fr => {
                print(`  フロア ${fr.floor}: ${(fr.rate * 100).toFixed(2)}%`);
            });
        } else {
            print('  なし');
        }
        print('------------------------');
        rl.close();
        return;
    }

    displayGridConsole(gameResult.displayState);

    if (gameResult.message) {
        print(gameResult.message);
    }
    if (gameResult.lastActionMessage) {
        print(gameResult.lastActionMessage);
        game.clearLastActionMessage();
    }

    prompt(gameResult.prompt, (input) => {
        if (input.toLowerCase() === 'q') {
            rl.close();
            return;
        }
        game.handleInput(input);
        runConsoleGameLoop();
    });
}