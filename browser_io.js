// browser_io.js
import { game, ITEMS } from './core.js';

function print(text) {
    const p = document.createElement('p');
    p.textContent = text;
    document.getElementById('game-messages').appendChild(p);
    document.getElementById('game-messages').scrollTop = document.getElementById('game-messages').scrollHeight; // Auto-scroll to bottom
}

function clear() {
    document.getElementById('game-messages').innerHTML = '';
}

function renderGridToDom(displayState) {
    const gameGridDiv = document.getElementById('game-grid');
    gameGridDiv.innerHTML = ''; // Clear previous grid

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';

    for (let r = 0; r < displayState.grid.length; r++) {
        const row = document.createElement('tr');
        for (let c = 0; c < displayState.grid[0].length; c++) {
            const cell = document.createElement('td');
            cell.style.width = '30px';
            cell.style.height = '30px';
            cell.style.border = '1px solid #555';
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.style.fontWeight = 'bold';
            cell.style.fontSize = '1.2em';
            cell.style.cursor = 'default';

            const gridCell = displayState.grid[r][c];
            const isPlayer = (r === displayState.player.r && c === displayState.player.c);
            const isExit = (r === displayState.exit.r && c === displayState.exit.c);

            if (gridCell.hasItem) {
                cell.style.backgroundColor = '#8BC34A';
            }

            if (isPlayer) {
                if (gridCell.isTrap) {
                    cell.textContent = 'P(X)';
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#F44336';
                } else {
                    cell.textContent = 'P(' + (gridCell.adjacentTraps === 0 ? '.' : gridCell.adjacentTraps) + ')';
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#4CAF50';
                }
            } else if (isExit && (gridCell.isRevealed || displayState.exitRevealedThisFloor)) {
                cell.textContent = 'E';
                if (!gridCell.hasItem) cell.style.backgroundColor = '#FFC107';
            } else if (gridCell.isRevealed) {
                if (gridCell.isTrap) {
                    cell.textContent = 'X';
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#F44336';
                } else {
                    cell.textContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps;
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#9E9E9E';
                }
            } else {
                cell.textContent = '';
                if (!gridCell.hasItem) cell.style.backgroundColor = '#616161';
            }
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    gameGridDiv.appendChild(table);
}

function handleGlobalKeyboardInput(event) {
    if (game.isGameOver) return;

    let handled = true;
    let key = event.key.toLowerCase();

    // アイテム選択状態の場合
    if (game.gameState === 'choosing_item') {
        // 数字キー (1, 2, 3) のみを受け付ける
        if (['1', '2', '3'].includes(key)) {
            processBrowserInput(key);
        } else {
            handled = false; // それ以外のキーは無視
        }
    } else { // 通常のゲームプレイ状態の場合
        // Arrow keys mapping
        switch (event.key) {
            case 'ArrowUp': key = 'w'; break;
            case 'ArrowDown': key = 's'; break;
            case 'ArrowLeft': key = 'a'; break;
            case 'ArrowRight': key = 'd'; break;
        }

        // Check for valid game command keys
        if ('wasduretj'.includes(key)) {
            processBrowserInput(key);
        } else {
            handled = false;
        }
    }

    if (handled) {
        event.preventDefault();
    }
}

function processBrowserInput(input) {
    const actionResult = game.handleInput(input);

    if (actionResult && actionResult.action === 'next_floor_after_delay') {
        setTimeout(() => {
            game.floorNumber++;
            game.setupFloor();
            runBrowserGameLoop();
        }, 1000);
    }
    runBrowserGameLoop();
}

function runBrowserGameLoop() {
    const gameResult = game.gameLoop();
    clear();

    renderGridToDom(gameResult.displayState);

    const itemListDiv = document.getElementById('item-list');
    const items = gameResult.displayState.items || [];
    let itemsHtml = '<strong>Items:</strong> ';
    if (items.length === 0) {
        itemsHtml += 'None';
    } else {
        itemsHtml += items.map(id => ITEMS[id].name).join(', ');
    }
    itemListDiv.innerHTML = itemsHtml;

    document.getElementById('floor-number').textContent = `Floor: ${gameResult.displayState.floorNumber}`;

    if (gameResult.gameOver) {
        print(gameResult.message);
        return;
    }

    if (gameResult.message) {
        print(gameResult.message);
    }
    if (gameResult.lastActionMessage) {
        print(gameResult.lastActionMessage);
        game.clearLastActionMessage(); // メッセージを表示したらクリア
    }

    if (gameResult.gameState === 'choosing_item') {
        if (gameResult.displayState.currentItemChoices) {
            gameResult.displayState.currentItemChoices.forEach((id, index) => {
                if (ITEMS[id]) {
                    print(`${index + 1}: ${ITEMS[id].name} - ${ITEMS[id].description}`);
                } else {
                    print(`${index + 1}: Unknown Item (ID: ${id})`);
                }
            });
            print('');
        }
    }

    print(gameResult.prompt);
}

export function initBrowserGame() {
    document.addEventListener('keydown', handleGlobalKeyboardInput);
    game.setupFloor();
    runBrowserGameLoop();
}