// browser_io.js
import { game, ITEMS } from './core.js';

let selectedChoiceIndex = 0; // For keyboard selection on item choice screen
let inputDisabled = false;
const INPUT_DEBOUNCE_MS = 200; // Cooldown in ms to prevent double taps

function print(text) {
    const p = document.createElement('p');
    p.textContent = text;
    const messagesDiv = document.getElementById('game-messages');
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
}

function clear() {
    document.getElementById('game-messages').innerHTML = '';
}

function renderGridToDom(displayState) {
    const gameGridDiv = document.getElementById('game-grid');
    gameGridDiv.innerHTML = ''; // Clear previous grid

    // Calculate dynamic cell size
    const gridGap = 2; // From CSS --grid-gap
    const totalGridGapWidth = (displayState.grid[0].length - 1) * gridGap;
    const availableWidth = gameGridDiv.clientWidth || window.innerWidth * 0.9; // Use container width or a percentage of window width
    let optimalCellSize = (availableWidth - totalGridGapWidth) / displayState.grid[0].length;

    // Apply min/max constraints
    const MIN_CELL_SIZE = 20; // Minimum cell size in pixels
    const MAX_CELL_SIZE = 40; // Maximum cell size in pixels
    optimalCellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, optimalCellSize));

    document.documentElement.style.setProperty('--dynamic-cell-size', `${optimalCellSize}px`);

    const table = document.createElement('table');
    table.style.borderCollapse = 'separate';
    table.style.borderSpacing = 'var(--grid-gap, 2px)';


    for (let r = 0; r < displayState.grid.length; r++) {
        const row = document.createElement('tr');
        for (let c = 0; c < displayState.grid[0].length; c++) {
            const cell = document.createElement('td');
            cell.style.width = 'var(--cell-size, 30px)';
            cell.style.height = 'var(--cell-size, 30px)';
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.style.fontWeight = 'bold';
            cell.style.fontSize = 'calc(var(--cell-size, 30px) * 0.6)';
            cell.style.cursor = 'default';
            cell.style.borderRadius = '3px';

            const gridCell = displayState.grid[r][c];
            const isPlayer = (r === displayState.player.r && c === displayState.player.c);
            const isExit = (r === displayState.exit.r && c === displayState.exit.c);

            if (gridCell.hasItem && gridCell.isRevealed) {
                cell.style.backgroundColor = '#8BC34A';
            }

            if (isPlayer) {
                if (gridCell.isTrap) {
                    cell.textContent = 'X'; // Show X if player is on a trap
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#F44336'; // Red for trap
                } else {
                    cell.textContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps; // Show number or empty
                    if (!gridCell.hasItem) cell.style.backgroundColor = '#4CAF50'; // Green for safe
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
                cell.style.backgroundColor = '#616161';
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
    const key = event.key.toLowerCase();

    if (game.gameState === 'choosing_item') {
        event.preventDefault();
        const choices = document.querySelectorAll('.item-choice-btn');
        if (!choices.length) return;

        switch (event.key) {
            case 'ArrowUp':
                selectedChoiceIndex = (selectedChoiceIndex > 0) ? selectedChoiceIndex - 1 : choices.length - 1;
                updateChoiceHighlight();
                break;
            case 'ArrowDown':
                selectedChoiceIndex = (selectedChoiceIndex < choices.length - 1) ? selectedChoiceIndex + 1 : 0;
                updateChoiceHighlight();
                break;
            case 'Enter':
                // Find the selected button and trigger its action
                const selectedButton = choices[selectedChoiceIndex];
                if (selectedButton) {
                    selectedButton.click(); // Simulate a click
                }
                break;
            default:
                handled = false;
                break;
        }

    } else if (game.gameState === 'jumping_direction') {
        let moveKey = key;
        switch (event.key) {
            case 'ArrowUp': moveKey = 'w'; break;
            case 'ArrowDown': moveKey = 's'; break;
            case 'ArrowLeft': moveKey = 'a'; break;
            case 'ArrowRight': moveKey = 'd'; break;
        }
        if ('wasd'.includes(moveKey)) {
            processBrowserInput(moveKey);
        } else {
            handled = false;
        }
    } else if (game.gameState === 'playing') {
        let moveKey = key;
        switch (event.key) {
            case 'ArrowUp': moveKey = 'w'; break;
            case 'ArrowDown': moveKey = 's'; break;
            case 'ArrowLeft': moveKey = 'a'; break;
            case 'ArrowRight': moveKey = 'd'; break;
        }

        if ('wasdretj'.includes(moveKey)) {
            processBrowserInput(moveKey);
        } else {
            handled = false;
        }
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
        game.floorNumber++;
        game.setupFloor();
    }
    runBrowserGameLoop();
}

function runBrowserGameLoop() {
    const gameResult = game.gameLoop();
    const displayState = gameResult.displayState;

    const gameGrid = document.getElementById('game-grid');
    const controls = document.getElementById('controls');
    const itemSelectionScreen = document.getElementById('item-selection-screen');
    const gameStatus = document.getElementById('game-status');
    const gameMessages = document.getElementById('game-messages');
    const inventoryScreen = document.getElementById('inventory-screen');

    // Hide all screens by default, then show the correct one
    gameGrid.style.display = 'none';
    controls.style.display = 'none';
    itemSelectionScreen.style.display = 'none';
    inventoryScreen.style.display = 'none';
    gameStatus.style.display = 'none';
    gameMessages.style.display = 'none';


    if (gameResult.gameState === 'choosing_item') {
        gameStatus.style.display = 'flex';
        itemSelectionScreen.style.display = 'block';
        renderItemSelectionScreen(displayState.currentItemChoices);
    } else {
        // Show game grid/controls, hide item selection screen
        gameGrid.style.display = 'flex';
        controls.style.display = 'grid';
        gameStatus.style.display = 'flex';
        gameMessages.style.display = 'block';

        clear();
        renderGridToDom(displayState);

        const itemListDiv = document.getElementById('item-list');
        const items = displayState.items || [];
        let itemsHtml = '<strong>Items:</strong> ';
        if (items.length === 0) {
            itemsHtml += 'None';
        } else {
            itemsHtml += items.map(id => ITEMS[id].name).join(', ');
        }
        itemListDiv.innerHTML = itemsHtml;

        document.getElementById('floor-number').textContent = `Floor: ${displayState.floorNumber}`;

        const revelationStatusDiv = document.getElementById('revelation-status');
        const currentRevelationRate = game.calculateRevelationRate();
        if (currentRevelationRate >= game.REVELATION_THRESHOLD) {
            revelationStatusDiv.textContent = '開示率: 達成';
            revelationStatusDiv.style.color = '#4CAF50'; // Green color for achieved
        } else {
            revelationStatusDiv.textContent = '開示率: 未達成';
            revelationStatusDiv.style.color = '#F44336'; // Red color for not achieved
        }

        if (gameResult.gameOver) {
            print(gameResult.message);
            // Disable controls on game over, except reset
            document.querySelectorAll('.control-btn').forEach(b => {
                if (b.id !== 'btn-reset') {
                    b.style.pointerEvents = 'none';
                    b.style.backgroundColor = '#333';
                }
            });
            return;
        }

        if (gameResult.message) {
            print(gameResult.message);
        }
        if (gameResult.lastActionMessage) {
            print(gameResult.lastActionMessage);
            game.clearLastActionMessage(); // メッセージを表示したらクリア
        }

        print(gameResult.prompt);
    }
}

function renderItemSelectionScreen(choices) {
    const screen = document.getElementById('item-selection-screen');
    screen.innerHTML = '<h2>Floor Cleared! Choose a reward:</h2>';
    selectedChoiceIndex = 0; // Reset index when screen is rendered

    if (choices) {
        choices.forEach((id, index) => {
            const item = ITEMS[id];
            if (item) {
                const button = document.createElement('button');
                button.className = 'item-choice-btn';
                button.innerHTML = `<strong>${item.name}</strong><span>${item.description}</span>`;
                
                const action = (event) => {
                    event.preventDefault();
                    processBrowserInput(String(index + 1));
                };

                button.addEventListener('click', action);
                button.addEventListener('touchstart', action, { passive: false });

                screen.appendChild(button);
            } 
        });
        updateChoiceHighlight(); // Set initial highlight
    }
}

function updateChoiceHighlight() {
    const choices = document.querySelectorAll('.item-choice-btn');
    choices.forEach((btn, index) => {
        if (index === selectedChoiceIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function setupControlButtons() {
    document.getElementById('btn-inventory').addEventListener('click', showInventoryScreen);

    const keyButtons = document.querySelectorAll('[data-key]');
    keyButtons.forEach(button => {
        const action = (event) => {
            event.preventDefault();
            if (inputDisabled) return; // Prevent rapid inputs

            const key = button.getAttribute('data-key');
            if (key) {
                processBrowserInput(key);
                inputDisabled = true;
                setTimeout(() => {
                    inputDisabled = false;
                }, INPUT_DEBOUNCE_MS);
            }
        };
        button.addEventListener('click', action);
        button.addEventListener('touchstart', action, { passive: false });
    });
}

function showInventoryScreen() {
    const displayState = game.getDisplayState();
    const usableItems = displayState.items
        .map(id => ITEMS[id])
        .filter(item => item.key !== null);

    if (usableItems.length === 0) {
        print("You have no usable items.");
        return;
    }

    // Hide game, show inventory
    document.getElementById('game-grid').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    document.getElementById('game-status').style.display = 'none';
    document.getElementById('game-messages').style.display = 'none';
    const inventoryScreen = document.getElementById('inventory-screen');
    inventoryScreen.style.display = 'block';

    renderInventoryScreen(usableItems);
}

function renderInventoryScreen(usableItems) {
    const screen = document.getElementById('inventory-screen');
    screen.innerHTML = '<h2>Use Item</h2>';

    const hideAndShowGame = () => {
        screen.style.display = 'none';
        document.getElementById('game-grid').style.display = 'flex';
        document.getElementById('controls').style.display = 'grid';
        document.getElementById('game-status').style.display = 'flex';
        document.getElementById('game-messages').style.display = 'block';
    };

    usableItems.forEach(item => {
        const button = document.createElement('button');
        button.className = 'inventory-item-btn';
        button.textContent = item.name;
        const action = (event) => {
            event.preventDefault();
            hideAndShowGame();
            processBrowserInput(item.key);
        };
        button.addEventListener('click', action);
        button.addEventListener('touchstart', action, { passive: false });
        screen.appendChild(button);
    });

    const cancelButton = document.createElement('button');
    cancelButton.className = 'inventory-item-btn';
    cancelButton.id = 'inventory-cancel-btn';
    cancelButton.textContent = 'Cancel';
    const cancelAction = (event) => {
        event.preventDefault();
        hideAndShowGame();
        runBrowserGameLoop(); // Redraw the game state without taking a turn
    };
    cancelButton.addEventListener('click', cancelAction);
    cancelButton.addEventListener('touchstart', cancelAction, { passive: false });
    screen.appendChild(cancelButton);
}


export function initBrowserGame() {
    document.addEventListener('keydown', handleGlobalKeyboardInput);
    setupControlButtons();
    game.setupFloor();
    runBrowserGameLoop();
}
