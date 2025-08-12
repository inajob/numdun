// browser_io.js
import { game, UPGRADES } from './core.js';

let gameOutputDiv; // For browser DOM output
let gameInput; // For browser DOM input

function print(text) {
    const p = document.createElement('p');
    p.textContent = text;
    document.getElementById('game-messages').appendChild(p);
    document.getElementById('game-messages').scrollTop = document.getElementById('game-messages').scrollHeight; // Auto-scroll to bottom
}

function clear() {
    document.getElementById('game-messages').innerHTML = '';
}

function prompt(promptText) {
    print(promptText);
    gameInput.focus();
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
            cell.style.cursor = 'default'; // No pointer cursor

            const gridCell = displayState.grid[r][c];
            const isPlayer = (r === displayState.player.r && c === displayState.player.c);
            const isExit = (r === displayState.exit.r && c === displayState.exit.c);
            const showExitEarly = game.hasUpgrade('reveal_exit_temporarily');

            // アイテムがある場合は背景色を変更
            if (gridCell.hasItem) {
                cell.style.backgroundColor = '#8BC34A'; // Light green for item
            }

            if (isPlayer) {
                // Display player 'P' and the cell content
                if (gridCell.isTrap) {
                    cell.textContent = 'P(X)'; // Player on a trap
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#F44336'; // アイテムがない場合のみ赤
                } else {
                    cell.textContent = 'P(' + (gridCell.adjacentTraps === 0 ? '.' : gridCell.adjacentTraps) + ')'; // Player on a safe cell
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#4CAF50'; // アイテムがない場合のみ緑
                }
            } else if (isExit && (gridCell.isRevealed || showExitEarly)) {
                cell.textContent = 'E';
                if (!gridCell.hasItem) cell.style.backgroundColor = '#FFC107'; // アイテムがない場合のみアンバー
            } else if (gridCell.isRevealed) {
                if (gridCell.isTrap) {
                    cell.textContent = 'X';
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#F44336'; // アイテムがない場合のみ赤
                } else {
                    cell.textContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps;
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#9E9E9E'; // アイテムがない場合のみグレー
                }
            } else {
                cell.textContent = '';
                if (!gridCell.hasItem) cell.style.backgroundColor = '#616161'; // アイテムがない場合のみダークグレー
            }
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    gameGridDiv.appendChild(table);
}

function handleGlobalKeyboardInput(event) {
    console.log("handleGlobalKeyboardInput called. event.key:", event.key); // 追加
    if (game.gameState !== 'playing' || game.isGameOver) return;

    let handled = true;
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            processBrowserInput('w');
            break;
        case 'ArrowDown':
        case 's':
            processBrowserInput('s');
            break;
        case 'ArrowLeft':
        case 'a':
            processBrowserInput('a');
            break;
        case 'ArrowRight':
        case 'd':
            processBrowserInput('d');
            break;
        case 'u': // ダウジングロッド
            processBrowserInput('u');
            break;
        case 'j': // 跳躍のブーツ
            processBrowserInput('j');
            break;
        default:
            console.log("Unhandled key:", event.key); // 追加
            handled = false;
            break;
    }

    if (handled) {
        event.preventDefault();
    }
}

function processBrowserInput(input) {
    console.log("processBrowserInput called. input:", input); // 追加
    const actionResult = game.handleInput(input);
    if (actionResult && actionResult.action === 'next_floor_after_delay') {
        print(actionResult.message);
        setTimeout(() => {
            game.floorNumber++;
            game.setupFloor();
            runBrowserGameLoop();
        }, actionResult.delay);
    } else {
        runBrowserGameLoop();
    }
}

function updateItemListDisplay(displayState) {
    const itemListDiv = document.getElementById('item-list');
    itemListDiv.innerHTML = ''; // Clear previous list

    let itemsHtml = '<strong>Items:</strong> ';
    if (displayState.player.items.length === 0) {
        itemsHtml += 'None';
    } else {
        const itemDetails = displayState.player.items.map(itemId => {
            const item = UPGRADES[itemId];
            let detail = item.name;
            if (itemId === 'dowsing_rod' && !displayState.dowsingRodUsedThisFloor) {
                detail += ' (u)';
            } else if (itemId === 'long_jump' && !displayState.longJumpUsedThisFloor) {
                detail += ' (j)';
            }
            return detail;
        });
        itemsHtml += itemDetails.join(', ');
    }
    itemListDiv.innerHTML = itemsHtml;
}

function runBrowserGameLoop() {
    const gameResult = game.gameLoop();
    clear(); // Clear messages before displaying new state

    renderGridToDom(gameResult.displayState);
    console.log("gameResult.displayState:", gameResult.displayState); // デバッグ用ログ
    console.log("gameResult.prompt:", gameResult.prompt); // これを追加

    updateItemListDisplay(gameResult.displayState); // ここで呼び出す

    if (gameResult.gameOver) {
        print(gameResult.message);
        return;
    }

    if (gameResult.prompt) {
        print(`--- Floor: ${gameResult.displayState.floorNumber} ---`);
        print(`Upgrades: ${gameResult.displayState.upgrades.join(', ') || 'None'}`);
        print(`Items: ${gameResult.displayState.player.items.map(id => UPGRADES[id].name).join(', ') || 'None'}`);
        if (gameResult.gameState === 'choosing_upgrade') {
            print('Choose your upgrade:');
            if (gameResult.displayState.currentUpgradeChoices) {
                gameResult.displayState.currentUpgradeChoices.forEach((id, index) => {
                    if (UPGRADES[id]) {
                        print(`${index + 1}: ${UPGRADES[id].name} - ${UPGRADES[id].description}`);
                    } else {
                        print(`${index + 1}: Unknown Upgrade (ID: ${id})`);
                    }
                });
                print('');
            }
        prompt(gameResult.prompt);
        }
    }
}
export function initBrowserGame() {
    gameInput = document.getElementById('game-input');
    gameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const input = gameInput.value;
            gameInput.value = ''; // Clear input field
            processBrowserInput(input);
        }
    });
    document.addEventListener('keydown', handleGlobalKeyboardInput);

    game.setupFloor();
    runBrowserGameLoop();
}