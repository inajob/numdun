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
            // Base cell styles
            cell.style.width = 'var(--dynamic-cell-size)';
            cell.style.height = 'var(--dynamic-cell-size)';
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.style.cursor = 'default';
            cell.style.borderRadius = '3px';
            cell.style.position = 'relative'; // For layering children

            const gridCell = displayState.grid[r][c];
            const isPlayer = (r === displayState.player.r && c === displayState.player.c);
            const isExit = (r === displayState.exit.r && c === displayState.exit.c);
            const isRevealed = gridCell.isRevealed || (isExit && displayState.exitRevealedThisFloor);

            // Create spans for the different layers
            const numberSpan = document.createElement('span');
            const entitySpan = document.createElement('span'); // For corner icons *, E
            const playerSpan = document.createElement('span'); // For centered @

            // --- Set Content and Styles based on game state ---

            let cellBackgroundColor = '#616161'; // 1. Default: Hidden
            let numberContent = '';
            let numberFontSize = `calc(var(--dynamic-cell-size) * 0.6)`; // Default large
            let numberColor = '#FFFFFF';
            let entityContent = '';
            let playerContent = '';

            if (isRevealed) {
                cellBackgroundColor = '#9E9E9E'; // 2. Revealed
                if (gridCell.isTrap) {
                    cellBackgroundColor = '#F44336'; // Revealed Trap
                    numberContent = 'X';
                } else {
                    numberContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps;
                }

                // 3. Check for Item/Exit on revealed cells
                if (gridCell.hasItem) {
                    cellBackgroundColor = '#FFC107'; // Item color
                    entityContent = 'I';
                }
                if (isExit) {
                    cellBackgroundColor = '#FFC107'; // Exit color
                    entityContent = 'E';
                }
            }

            // 4. Player logic overrides almost everything
            if (isPlayer) {
                playerContent = '@';
                numberFontSize = `calc(var(--dynamic-cell-size) * 0.4)`; // Number becomes small
                numberColor = '#FFFFFF'; // Keep number white

                // If player is on an item, keep the corner icon
                if (gridCell.hasItem) {
                     entityContent = 'I';
                }
                 // If player is on the exit, keep the corner icon
                if (isExit) {
                    entityContent = 'E';
                }

                if (gridCell.isTrap) {
                    cellBackgroundColor = '#F44336'; // Player on trap
                    numberContent = 'X'; // Show X behind player
                } else {
                    // If player is not on a trap, their color is green, overriding item/exit color
                    cellBackgroundColor = '#4CAF50';
                }
            }

            // --- Apply styles and content to spans ---

            // Number Span (styling depends on player presence)
            numberSpan.textContent = numberContent;
            numberSpan.style.fontSize = numberFontSize;
            numberSpan.style.fontWeight = 'bold';
            numberSpan.style.color = numberColor;
            numberSpan.style.position = 'absolute';

            if (isPlayer) {
                // Position number in top-left corner
                numberSpan.style.top = '1px';
                numberSpan.style.left = '3px';
            } else {
                // Center the number if no player
                numberSpan.style.top = '0';
                numberSpan.style.left = '0';
                numberSpan.style.width = '100%';
                numberSpan.style.height = '100%';
                numberSpan.style.display = 'flex';
                numberSpan.style.alignItems = 'center';
                numberSpan.style.justifyContent = 'center';
            }
            cell.appendChild(numberSpan);

            // Entity Span (for corner icons)
            if (entityContent) {
                entitySpan.textContent = entityContent;
                entitySpan.style.position = 'absolute';
                entitySpan.style.top = '1px';
                entitySpan.style.right = '3px';
                entitySpan.style.fontSize = `calc(var(--dynamic-cell-size) * 0.4)`;
                entitySpan.style.fontWeight = 'bold';
                entitySpan.style.color = 'rgba(255, 255, 255, 0.9)';
                cell.appendChild(entitySpan);
            }

            // Player Span (for centered '@')
            if (playerContent) {
                playerSpan.textContent = playerContent;
                playerSpan.style.position = 'absolute';
                playerSpan.style.top = '0';
                playerSpan.style.left = '0';
                playerSpan.style.width = '100%';
                playerSpan.style.height = '100%';
                playerSpan.style.display = 'flex';
                playerSpan.style.alignItems = 'center';
                playerSpan.style.justifyContent = 'center';
                playerSpan.style.fontSize = `calc(var(--dynamic-cell-size) * 0.7)`;
                playerSpan.style.fontWeight = 'bold';
                playerSpan.style.color = '#FFFFFF';
                cell.appendChild(playerSpan);
            }

            // Set final background color
            cell.style.backgroundColor = cellBackgroundColor;

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
