// browser_io.js
import { game, ITEMS } from './core.js';

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
    // gameInput.focus(); // Do not focus automatically
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
            } else if (isExit && (gridCell.isRevealed || displayState.exitRevealedThisFloor)) {
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
    // ゲームオーバー時やテキスト入力中はグローバルキー入力を無効化
    if (game.isGameOver || document.activeElement === gameInput) return;

    let handled = true;
    let key = event.key.toLowerCase();

    // カーソルキーをwasdにマッピング
    switch (event.key) {
        case 'ArrowUp':
            key = 'w';
            break;
        case 'ArrowDown':
            key = 's';
            break;
        case 'ArrowLeft':
            key = 'a';
            break;
        case 'ArrowRight':
            key = 'd';
            break;
    }

    if ('wasduretj'.includes(key)) {
        processBrowserInput(key);
    } else {
        handled = false;
    }

    if (handled) {
        event.preventDefault();
    }
}

function processBrowserInput(input) {
    const actionResult = game.handleInput(input);

    if (actionResult && actionResult.action === 'next_floor_after_delay') {
        // 少し遅れて次のフロアへ
        setTimeout(() => {
            game.floorNumber++;
            game.setupFloor();
            runBrowserGameLoop();
        }, 1000);
    } 
    // handleInput内でゲームの状態が更新されたので、ループを再実行してUIに反映
    runBrowserGameLoop();
}

function runBrowserGameLoop() {
    const gameResult = game.gameLoop();
    clear(); // メッセージエリアをクリア

    // 1. グリッドの描画
    renderGridToDom(gameResult.displayState);

    // 2. アイテムリストの表示
    const itemListDiv = document.getElementById('item-list');
    const items = gameResult.displayState.items || [];
    let itemsHtml = '<strong>Items:</strong> ';
    if (items.length === 0) {
        itemsHtml += 'None';
    } else {
        itemsHtml += items.map(id => ITEMS[id].name).join(', ');
    }
    itemListDiv.innerHTML = itemsHtml;
    
    // 3. フロア番号の表示
    document.getElementById('floor-number').textContent = `Floor: ${gameResult.displayState.floorNumber}`;

    // 4. ゲームオーバー処理
    if (gameResult.gameOver) {
        print(gameResult.message);
        gameInput.disabled = true; // 入力を無効化
        return;
    }

    // 5. メッセージとプロンプトの表示
    if (gameResult.message) {
        print(gameResult.message);
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
    
    prompt(gameResult.prompt);
    if (gameResult.gameState === 'choosing_item') {
        gameInput.focus();
    }
}

export function initBrowserGame() {
    gameInput = document.getElementById('game-input');
    gameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const input = gameInput.value.trim();
            gameInput.value = ''; // Clear input field
            if (input) {
                processBrowserInput(input);
            }
        }
    });
    document.addEventListener('keydown', handleGlobalKeyboardInput);

    game.setupFloor();
    runBrowserGameLoop();
}