import { game, initializeGame } from './game.js';
import { ITEMS } from './items.js';

let selectedChoiceIndex = 0; // For keyboard selection on item choice screen
let selectedConfirmIndex = 0; // For keyboard selection on next floor confirmation
const INPUT_DEBOUNCE_MS = 100; // Cooldown in ms to prevent double taps
let lastInput = { key: null, time: 0 };
let isModalActive = false; // NEW: To control game pause for modal

// Cache DOM elements to avoid repeated lookups
const dom = {
    gameGrid: document.getElementById('game-grid'),
    controls: document.getElementById('controls'),
    itemSelectionScreen: document.getElementById('item-selection-screen'),
    gameStatus: document.getElementById('game-status'),
    inventoryScreen: document.getElementById('inventory-screen'),
    actionPrompt: document.getElementById('action-prompt'),
    resultScreen: document.getElementById('result-screen'),
    itemList: document.getElementById('item-list'),
    floorNumber: document.getElementById('floor-number'),
    revelationStatus: document.getElementById('revelation-status'),
    gameContainer: document.getElementById('game-container'),
    resetButton: document.getElementById('btn-reset'),
};

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

/**
 * NEW: Shows a modal dialog for item acquisition, pausing the game.
 * @param {object} item The acquired item object from core.js
 */
function showItemAcquiredModal(item) {
    console.log("show")
    if (isModalActive) return;
    console.log("next")
    isModalActive = true;
    game.clearJustAcquiredItem(); // Clear the state in core.js

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h3');
    title.textContent = `アイテム獲得: ${item.name}`;

    const description = document.createElement('p');
    description.textContent = item.description;

    const button = document.createElement('button');
    button.textContent = '続ける (任意のキー)';

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(button);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    button.focus();

    const closeModal = () => {
        if (!isModalActive) return;
        document.removeEventListener('keydown', modalKeyListener);
        document.body.removeChild(overlay);
        isModalActive = false;
        runBrowserGameLoop(); // Refresh the game screen after closing
    };

    const modalKeyListener = (event) => {
        event.preventDefault();
        closeModal();
    };

    button.addEventListener('click', closeModal);
    document.addEventListener('keydown', modalKeyListener);
}

function renderGridToDom(displayState) {
    dom.gameGrid.innerHTML = ''; // Clear previous grid

    // Calculate dynamic cell size
    const gridGap = 2; // From CSS --grid-gap
    const totalGridGapWidth = (displayState.grid[0].length - 1) * gridGap;
    const availableWidth = dom.gameGrid.clientWidth || window.innerWidth * 0.9; // Use container width or a percentage of window width
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

            // NEW: Add click listener for flagging non-revealed cells
            if (!isRevealed) {
                cell.addEventListener('click', (event) => {
                    event.preventDefault();
                    game.toggleFlag(r, c);
                    runBrowserGameLoop();
                });
            }

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
            } else if (gridCell.isFlagged) {
                cell.classList.add('game-cell--flagged');
                numberContent = '⚑';
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
    dom.gameGrid.appendChild(table);
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
    if (isModalActive) {
        // The modal's own listener will handle Enter.
        // We prevent any other game input from processing.
        event.preventDefault();
        return;
    }

    // Convert arrow keys to wasd at the beginning for consistent handling
    let key = event.key.toLowerCase();
    switch (event.key) {
        case 'ArrowUp': key = 'w'; break;
        case 'ArrowDown': key = 's'; break;
        case 'ArrowLeft': key = 'a'; break;
        case 'ArrowRight': key = 'd'; break;
    }

    let handled = true;

    if (game.gameState === 'confirm_next_floor') {
        event.preventDefault();
        const choices = ['yes', 'no'];
        switch (key) {
            case 'w':
                selectedConfirmIndex = (selectedConfirmIndex > 0) ? selectedConfirmIndex - 1 : choices.length - 1;
                updateConfirmHighlight();
                break;
            case 's':
                selectedConfirmIndex = (selectedConfirmIndex < choices.length - 1) ? selectedConfirmIndex + 1 : 0;
                updateConfirmHighlight();
                break;
            case 'enter':
                const action = choices[selectedConfirmIndex];
                processBrowserInput(action);
                break;
            default:
                break;
        }
    } else if (game.gameState === 'choosing_item') {
        event.preventDefault();
        const choices = document.querySelectorAll('.item-choice-btn');
        if (!choices.length) return;

        if (isInputDebounced(key)) return;

        switch (key) {
            case 'w':
                selectedChoiceIndex = (selectedChoiceIndex > 0) ? selectedChoiceIndex - 1 : choices.length - 1;
                updateChoiceHighlight();
                break;
            case 's':
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

    } else if (game.gameState === 'jumping_direction' || game.gameState === 'recon_direction') {
        if ('wasd'.includes(key)) {
            if (isInputDebounced(key)) return;
            processBrowserInput(key);
        } else {
            handled = false;
        }
    } else if (game.gameState === 'playing') {
        const itemKeys = Object.values(ITEMS).map(item => item.key).filter(k => k).join('');
        const validKeys = 'wasd' + itemKeys;

        if (validKeys.includes(key)) {
            if (isInputDebounced(key)) return;
            processBrowserInput(key);
        } else {
            handled = false;
        }
    } else {
        // For 'gameover' or any other state, do not handle input
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

function updateStatusUI(displayState) {
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
    dom.itemList.innerHTML = itemsHtml;

    dom.floorNumber.textContent = `Floor: ${displayState.floorNumber}`;

    const currentRevelationRate = game.calculateRevelationRate();
    if (currentRevelationRate >= game.REVELATION_THRESHOLD) {
        dom.revelationStatus.textContent = '開示率: 達成';
        dom.revelationStatus.style.color = '#4CAF50';
    } else {
        dom.revelationStatus.textContent = '開示率: 未達成';
        dom.revelationStatus.style.color = '#F44336';
    }
}

function runBrowserGameLoop() {
    const gameResult = game.gameLoop();

    // NEW: Check for item acquisition first and show modal if needed
    if (gameResult.newItemAcquired) {
        showItemAcquiredModal(gameResult.newItemAcquired);
        return; // Stop further rendering until modal is closed
    }

    const displayState = gameResult.displayState;

    // Hide all full-screen overlays by default
    dom.itemSelectionScreen.style.display = 'none';
    dom.inventoryScreen.style.display = 'none';
    dom.resultScreen.style.display = 'none';
    
    // Show the main game view by default
    dom.gameGrid.style.display = 'flex';
    dom.controls.style.display = 'grid';
    dom.gameStatus.style.display = 'flex';
    dom.actionPrompt.style.display = 'none';
    dom.controls.classList.remove('confirm-dialog'); // Remove confirm class by default


    if (gameResult.gameState === 'confirm_next_floor') {
        renderGridToDom(displayState);
        updateStatusUI(displayState);

        // Take over the controls area for the confirmation dialog
        dom.controls.innerHTML = ''; // Clear arrow buttons
        dom.controls.classList.add('confirm-dialog');
        selectedConfirmIndex = 0; // Reset selection

        const prompt = document.createElement('div');
        prompt.textContent = gameResult.message;
        prompt.className = 'confirm-prompt-message';

        const yesButton = document.createElement('button');
        yesButton.textContent = 'はい';
        yesButton.className = 'confirm-btn';
        yesButton.dataset.choice = 'yes';
        yesButton.onclick = () => processBrowserInput('yes');
        
        const noButton = document.createElement('button');
        noButton.textContent = 'いいえ';
        noButton.className = 'confirm-btn';
        noButton.dataset.choice = 'no';
        noButton.onclick = () => processBrowserInput('no');

        const pad1 = document.createElement('div');
        const pad2 = document.createElement('div');
        const pad3 = document.createElement('div');
        const pad4 = document.createElement('div');
        const pad5 = document.createElement('div');
        dom.controls.appendChild(pad1);
        dom.controls.appendChild(prompt);
        dom.controls.appendChild(pad2);
        dom.controls.appendChild(pad3);
        dom.controls.appendChild(yesButton);
        dom.controls.appendChild(pad4);
        dom.controls.appendChild(pad5);
        dom.controls.appendChild(noButton);
        
        updateConfirmHighlight();

    } else if (gameResult.gameState === 'choosing_item') {
        renderGridToDom(displayState);
        updateStatusUI(displayState);
        dom.itemSelectionScreen.style.display = 'block';
        renderItemSelectionScreen(displayState.currentItemChoices);
        // Hide game view behind item selection
        dom.gameGrid.style.display = 'none';
        dom.controls.style.display = 'none';

    } else if (gameResult.gameState === 'gameover') {
        renderGridToDom(displayState); // Render the final grid state
        updateStatusUI(displayState);

        // Render the result screen
        renderResultScreen(gameResult.result);
        dom.resultScreen.style.display = 'flex';

        // Hide game-related UI
        dom.gameStatus.style.display = 'none';
        dom.controls.style.display = 'none';

    } else { // playing, jumping, etc.
        renderGridToDom(displayState);
        updateStatusUI(displayState);
        setupControlButtons();

        // Handle messages based on their type
        if (gameResult.lastActionMessage) {
            showNotification(gameResult.lastActionMessage);
            game.clearLastActionMessage();
        }

        if (gameResult.gameState === 'jumping_direction' || gameResult.gameState === 'recon_direction') {
            if (gameResult.message) {
                dom.actionPrompt.textContent = gameResult.message;
                dom.actionPrompt.style.display = 'block';
            }
        } else if (gameResult.message && gameResult.gameState !== 'choosing_item') {
            showNotification(gameResult.message);
        }

        if (gameResult.uiEffect === 'flash_red') {
            flashScreenRed();
            game.clearUiEffect(); // エフェクトをクリア
        }
    }
}

/**
 * Makes the screen flash red briefly.
 */
function flashScreenRed() {
    dom.gameContainer.classList.add('flash-red');
    setTimeout(() => {
        dom.gameContainer.classList.remove('flash-red');
    }, 200); // Flash for 200ms
}

// NEW: リザルト画面のレンダリング関数
function renderResultScreen(result) {
    document.getElementById('final-floor').textContent = `最終到達フロア: ${result.finalFloorNumber}`;
    
    const finalItemsDiv = document.getElementById('final-items');
    let itemsHtml = '所持アイテム: ';
    const itemEntries = Object.entries(result.finalItems); // result.finalItems はすでにカウント済みオブジェクト

    if (itemEntries.length === 0) {
        itemsHtml += 'なし';
    } else {
        itemsHtml += itemEntries.map(([id, count]) => {
            const item = ITEMS[id];
            if (!item) return 'Unknown Item';

            let itemName = item.name;
            // リザルト画面ではキー表示は不要なので削除
            // if (item.key) {
            //     itemName += `(${item.key.toLowerCase()})`;
            // }

            return `${itemName} x${count}`;
        }).join(', ');
    }
    finalItemsDiv.textContent = itemsHtml;

    const floorRevelationRatesDiv = document.getElementById('floor-revelation-rates');
    floorRevelationRatesDiv.innerHTML = '<h3>各フロアの開示率:</h3>';
    if (result.floorRevelationRates.length > 0) {
        const ul = document.createElement('ul');
        result.floorRevelationRates.forEach(fr => {
            const li = document.createElement('li');
            li.textContent = `フロア ${fr.floor}: ${(fr.rate * 100).toFixed(2)}%`;
            ul.appendChild(li);
        });
        floorRevelationRatesDiv.appendChild(ul);
    } else {
        floorRevelationRatesDiv.textContent += 'なし';
    }
}

function renderItemSelectionScreen(choices) {
    const screen = dom.itemSelectionScreen;
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

function updateConfirmHighlight() {
    const choices = dom.controls.querySelectorAll('.confirm-btn');
    choices.forEach((btn, index) => {
        if (index === selectedConfirmIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function setupControlButtons() {
    // This function now assumes the controls div is empty or has non-button elements
    // that should be removed. It rebuilds the controls.
    dom.controls.innerHTML = '';
    const controls = [
        { id: 'btn-up', key: 'w', text: '&uarr;' },
        { id: 'btn-left', key: 'a', text: '&larr;' },
        { id: 'btn-down', key: 's', text: '&darr;' },
        { id: 'btn-right', key: 'd', text: '&rarr;' },
        { id: 'btn-inventory', key: null, text: 'Inv' } // Inventory button
    ];

    controls.forEach(c => {
        const button = document.createElement('button');
        button.id = c.id;
        if (c.key) button.dataset.key = c.key;
        button.className = 'control-btn';
        button.innerHTML = c.text;
        dom.controls.appendChild(button);
    });

    // Add event listeners
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

    dom.gameGrid.style.display = 'none';
    dom.controls.style.display = 'none';
    dom.gameStatus.style.display = 'none';
    dom.inventoryScreen.style.display = 'block';

    renderInventoryScreen(usableItems);
}

function renderInventoryScreen(usableItems) {
    const screen = dom.inventoryScreen;
    screen.innerHTML = '<h2>Use Item</h2>';

    const hideAndShowGame = () => {
        screen.style.display = 'none';
        dom.gameGrid.style.display = 'flex';
        dom.controls.style.display = 'grid';
        dom.gameStatus.style.display = 'flex';
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
    dom.resetButton.addEventListener('click', () => {
        initializeGame();
        game.setupFloor();
        runBrowserGameLoop();
        // Re-enable control buttons on reset
        document.querySelectorAll('.control-btn').forEach(b => {
            b.style.pointerEvents = 'auto';
            b.style.backgroundColor = ''; // Reset to default color
        });
    });
    game.setupFloor();
    runBrowserGameLoop();
}
