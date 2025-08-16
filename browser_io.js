// browser_io.js
import { game, ITEMS } from './core.js';

let selectedChoiceIndex = 0; // For keyboard selection on item choice screen
const INPUT_DEBOUNCE_MS = 100; // Cooldown in ms to prevent double taps
let lastInput = { key: null, time: 0 };

/**
 * Displays a short-lived notification pop-up.
 * @param {string} text The message to display.
 * @param {number} duration How long to display the message in ms.
 */
function showNotification(text, duration = 3000) {
    const popup = document.createElement('div');
    popup.className = 'game-popup';
    popup.textContent = text;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.classList.add('fade-out');
        popup.addEventListener('transitionend', () => popup.remove());
    }, duration);
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
    table.className = 'game-table';

    for (let r = 0; r < displayState.grid.length; r++) {
        const row = document.createElement('tr');
        for (let c = 0; c < displayState.grid[0].length; c++) {
            const cell = document.createElement('td');
            cell.className = 'game-cell';

            const gridCell = displayState.grid[r][c];
            const isPlayer = (r === displayState.player.r && c === displayState.player.c);
            const isExit = (r === displayState.exit.r && c === displayState.exit.c);
            const isRevealed = gridCell.isRevealed || (isExit && displayState.exitRevealedThisFloor);

            const numberSpan = document.createElement('span');
            numberSpan.className = 'cell-number';

            // Determine content and classes
            let numberContent = '';
            let entityContent = ''; // For corner icon when player is present
            let playerContent = '';

            if (isPlayer) {
                playerContent = '@';
                numberSpan.classList.add('cell-number--player-present');

                if (gridCell.isTrap) {
                    cell.classList.add('game-cell--trap');
                    numberContent = 'X';
                } else {
                    cell.classList.add('game-cell--player');
                    numberContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps;
                }
                if (gridCell.hasItem) entityContent = 'I';
                if (isExit) entityContent = 'E';

            } else if (isRevealed) {
                // Priority: Exit > Item > Trap > Number
                if (isExit) {
                    cell.classList.add('game-cell--exit');
                    numberContent = 'E';
                } else if (gridCell.hasItem) {
                    cell.classList.add('game-cell--item');
                    numberContent = 'I';
                } else if (gridCell.isTrap) {
                    cell.classList.add('game-cell--trap');
                    numberContent = 'X';
                } else {
                    cell.classList.add('game-cell--revealed');
                    numberContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps;
                }
            } else {
                cell.classList.add('game-cell--hidden');
            }

            // Set content and append children
            numberSpan.textContent = numberContent;
            cell.appendChild(numberSpan);

            // This span is now ONLY for the corner icon when the player is on top of something
            if (entityContent) {
                const entitySpan = document.createElement('span');
                entitySpan.className = 'cell-entity';
                entitySpan.textContent = entityContent;
                cell.appendChild(entitySpan);
            }
            if (playerContent) {
                const playerSpan = document.createElement('span');
                playerSpan.className = 'cell-player-icon';
                playerSpan.textContent = playerContent;
                cell.appendChild(playerSpan);
            }
            
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    gameGridDiv.appendChild(table);
}

function isInputDebounced(key) {
    const now = Date.now();
    if (key === lastInput.key && now - lastInput.time < INPUT_DEBOUNCE_MS) {
        return true; // Debounce this input
    }
    lastInput.key = key;
    lastInput.time = now;
    return false;
}

function handleGlobalKeyboardInput(event) {
    if (game.isGameOver) return;

    let handled = true;
    const key = event.key.toLowerCase();

    if (game.gameState === 'choosing_item') {
        event.preventDefault();
        const choices = document.querySelectorAll('.item-choice-btn');
        if (!choices.length) return;

        if (isInputDebounced(key)) return;

        switch (key) {
            case 'w':
            case 'arrowup':
                selectedChoiceIndex = (selectedChoiceIndex > 0) ? selectedChoiceIndex - 1 : choices.length - 1;
                updateChoiceHighlight();
                break;
            case 's':
            case 'arrowdown':
                selectedChoiceIndex = (selectedChoiceIndex < choices.length - 1) ? selectedChoiceIndex + 1 : 0;
                updateChoiceHighlight();
                break;
            case 'enter':
                const selectedButton = choices[selectedChoiceIndex];
                if (selectedButton) {
                    selectedButton.click();
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
            if (isInputDebounced(moveKey)) return;
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
            if (isInputDebounced(moveKey)) return;
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
    const inventoryScreen = document.getElementById('inventory-screen');
    const actionPrompt = document.getElementById('action-prompt');

    // Hide all screens by default, then show the correct one
    gameGrid.style.display = 'none';
    controls.style.display = 'none';
    itemSelectionScreen.style.display = 'none';
    inventoryScreen.style.display = 'none';
    gameStatus.style.display = 'none';
    actionPrompt.style.display = 'none';


    if (gameResult.gameState === 'choosing_item') {
        gameStatus.style.display = 'flex';
        itemSelectionScreen.style.display = 'block';
        renderItemSelectionScreen(displayState.currentItemChoices);
    } else {
        gameGrid.style.display = 'flex';
        controls.style.display = 'grid';
        gameStatus.style.display = 'flex';

        renderGridToDom(displayState);

        const itemListDiv = document.getElementById('item-list');
        let itemsHtml = '<strong>Items:</strong> ';
        const itemCounts = (displayState.items || []).reduce((counts, id) => {
            counts[id] = (counts[id] || 0) + 1;
            return counts;
        }, {});

        const itemEntries = Object.entries(itemCounts);

        if (itemEntries.length === 0) {
            itemsHtml += 'None';
        } else {
            itemsHtml += itemEntries.map(([id, count]) => {
                const item = ITEMS[id];
                if (!item) return 'Unknown Item';

                let itemName = item.name;
                if (item.key) {
                    itemName += `(${item.key.toLowerCase()})`;
                }

                return `${itemName} x${count}`;
            }).join(', ');
        }
        itemListDiv.innerHTML = itemsHtml;

        document.getElementById('floor-number').textContent = `Floor: ${displayState.floorNumber}`;

        const revelationStatusDiv = document.getElementById('revelation-status');
        const currentRevelationRate = game.calculateRevelationRate();
        if (currentRevelationRate >= game.REVELATION_THRESHOLD) {
            revelationStatusDiv.textContent = '開示率: 達成';
            revelationStatusDiv.style.color = '#4CAF50';
        } else {
            revelationStatusDiv.textContent = '開示率: 未達成';
            revelationStatusDiv.style.color = '#F44336';
        }

        // Handle messages based on their type
        if (gameResult.lastActionMessage) {
            showNotification(gameResult.lastActionMessage);
            game.clearLastActionMessage();
        }

        if (gameResult.gameState === 'jumping_direction') {
            if (gameResult.message) {
                actionPrompt.textContent = gameResult.message;
                actionPrompt.style.display = 'block';
            }
        } else if (gameResult.message && gameResult.gameState !== 'choosing_item') {
            showNotification(gameResult.message);
        }

        if (gameResult.gameOver) {
            document.querySelectorAll('.control-btn').forEach(b => {
                if (b.id !== 'btn-reset') {
                    b.style.pointerEvents = 'none';
                    b.style.backgroundColor = '#333';
                }
            });
            return;
        }
    }
}

function renderItemSelectionScreen(choices) {
    const screen = document.getElementById('item-selection-screen');
    screen.innerHTML = '<h2>Floor Cleared! Choose a reward:</h2>';
    selectedChoiceIndex = 0;

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
        updateChoiceHighlight();
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
            const key = button.getAttribute('data-key');
            if (key) {
                if (isInputDebounced(key)) return;
                processBrowserInput(key);
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
        showNotification("You have no usable items.");
        return;
    }

    document.getElementById('game-grid').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    document.getElementById('game-status').style.display = 'none';
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
        runBrowserGameLoop();
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
