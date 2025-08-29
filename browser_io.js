import { ITEMS } from './items.js';

let selectedChoiceIndex = 0; // For keyboard selection on item choice screen
let selectedConfirmIndex = 0; // For keyboard selection on next floor confirmation
const INPUT_DEBOUNCE_MS = 100; // Cooldown in ms to prevent double taps
let lastInput = { key: null, time: 0 };
let isInputLocked = false; // Flag to prevent input race conditions
let resizeTimeout; // For debouncing resize events

// このモジュールで共有されるゲームインスタンス
let gameInstance;
let t = {}; // i18n text resources

// DOM要素を保持するオブジェクト。initDomCacheで初期化する。
let dom = {};

function initDomCache() {
    dom = {
        gameGrid: document.getElementById('game-grid'),
        controls: document.getElementById('controls'),
        itemSelectionScreen: document.getElementById('item-selection-screen'),
        gameStatus: document.getElementById('game-status'),
        inventoryScreen: document.getElementById('inventory-screen'),
        actionPrompt: document.getElementById('action-prompt'),
        resultScreen: document.getElementById('result-screen'),
        confirmDialogScreen: document.getElementById('confirm-dialog-screen'),
        itemList: document.getElementById('item-list'),
        floorNumber: document.getElementById('floor-number'),
        revelationStatus: document.getElementById('revelation-status'),
        gameContainer: document.getElementById('game-container'),
        resetButton: document.getElementById('btn-reset'),
        h1: document.querySelector('h1'),
    };
}

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
 * Shows a modal dialog with item details.
 * @param {string} itemId The ID of the item to display.
 */
function showItemDetailModal(itemId) {
    const item = ITEMS[itemId];
    if (!item) return;

    // Close any existing modal first
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const template = document.getElementById('template-modal-dialog');
    const modal = template.content.cloneNode(true);
    const overlay = modal.querySelector('.modal-overlay');
    const button = modal.querySelector('button');

    const nameKey = `item_${itemId}_name`;
    const descKey = `item_${itemId}_desc`;

    modal.querySelector('h3').textContent = t[nameKey] || item.name; // Fallback to item.name if not in locale
    modal.querySelector('p').textContent = t[descKey] || item.description; // Fallback to item.description
    button.textContent = t.close;

    document.body.appendChild(modal);

    button.focus();

    const closeModal = () => {
        document.body.removeChild(overlay);
    };

    button.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });
}

/**
 * Shows a tutorial modal dialog.
 * @param {string} title The title of the modal.
 * @param {string} contentText The text content of the modal.
 */
function showTutorialModal(title, contentText) {
    // Close any existing modal first
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const template = document.getElementById('template-modal-dialog');
    const modal = template.content.cloneNode(true);
    const overlay = modal.querySelector('.modal-overlay');
    const button = modal.querySelector('button');
    const descriptionP = modal.querySelector('p');

    modal.querySelector('h3').textContent = title;
    descriptionP.textContent = contentText;
    descriptionP.style.whiteSpace = 'pre-wrap'; // To respect newlines in the text
    button.textContent = t.close;

    document.body.appendChild(modal);

    button.focus();

    const closeModal = () => {
        document.body.removeChild(overlay);
        gameInstance.clearTutorial(); // Notify the game that the tutorial has been closed
    };

    button.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });
}

export function renderGridToDom(displayState) {
    dom.gameGrid.innerHTML = ''; // Clear previous grid

    const gridGap = 2; // From CSS --grid-gap

    // --- Width-based calculation ---
    const totalGridGapWidth = (displayState.grid[0].length - 1) * gridGap;
    // Use the container's width minus its padding for a more accurate calculation
    const availableWidth = dom.gameContainer.clientWidth - 20; // 20px for horizontal padding
    const optimalWidthCellSize = (availableWidth - totalGridGapWidth) / displayState.grid[0].length;

    // --- Height-based calculation ---
    // Estimate the height of non-grid elements to find available vertical space.
    const h1Height = dom.h1 ? dom.h1.offsetHeight : 30;
    const gameStatusHeight = dom.gameStatus.offsetHeight || 80;
    // Estimate controls height as it might not be visible. This is a key factor for small screens.
    const controlsHeight = 180; // Estimated height for 3 rows of buttons + gaps
    const actionPromptHeight = dom.actionPrompt.offsetHeight || 0;
    const containerPadding = 20; // #game-container vertical padding
    const wrapperPadding = 20; // #game-wrapper vertical padding
    const otherElementsHeight = h1Height + gameStatusHeight + controlsHeight + actionPromptHeight + containerPadding + wrapperPadding;

    const availableHeight = window.innerHeight - otherElementsHeight;
    const totalGridGapHeight = (displayState.grid.length - 1) * gridGap;
    const optimalHeightCellSize = (availableHeight - totalGridGapHeight) / displayState.grid.length;

    // --- Final cell size determination ---
    // Use the smaller of the two calculated sizes to ensure the grid fits both ways.
    // Only consider the height-based size if it's a positive number.
    let optimalCellSize = optimalWidthCellSize;
    if (optimalHeightCellSize > 0) {
        optimalCellSize = Math.min(optimalWidthCellSize, optimalHeightCellSize);
    }

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

            // 開示されていて、かつ見通しの悪いマスの場合にのみスタイルを適用
            if (gridCell.isObscured && isRevealed) {
                cell.classList.add('game-cell--obscured');
            }

            if (!isRevealed) {
                const flagAction = (event) => {
                    if (isInputLocked) return;
                    event.preventDefault();
                    gameInstance.toggleFlag(r, c);
                    runBrowserGameLoop();
                };
                cell.addEventListener('click', flagAction);
                cell.addEventListener('contextmenu', flagAction);
            }

            const numberSpan = document.createElement('span');
            numberSpan.className = 'cell-number';

            let numberContent = '';
            let entityContent = '';
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

            numberSpan.textContent = numberContent;
            cell.appendChild(numberSpan);

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
        return true;
    }
    lastInput.key = key;
    lastInput.time = now;
    return false;
}

function handleGlobalKeyboardInput(event) {
    const modal = document.querySelector('.modal-overlay');
    if (event.key === 'Escape' && modal) {
        modal.remove();
        return;
    }
    if (modal) return;

    let key = event.key.toLowerCase();
    switch (event.key) {
        case 'ArrowUp': key = 'w'; break;
        case 'ArrowDown': key = 's'; break;
        case 'ArrowLeft': key = 'a'; break;
        case 'ArrowRight': key = 'd'; break;
    }

    let handled = true;

    if (gameInstance.gameState === 'confirm_next_floor') {
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
    } else if (gameInstance.gameState === 'choosing_item') {
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

    } else if (['jumping_direction', 'recon_direction'].includes(gameInstance.gameState)) {
        if ('wasd'.includes(key)) {
            if (isInputDebounced(key)) return;
            processBrowserInput(key);
        } else {
            handled = false;
        }
    } else if (gameInstance.gameState === 'playing') {
        const itemKeys = Object.values(ITEMS).map(item => item.key).filter(k => k).join('');
        const validKeys = 'wasd' + itemKeys;

        if (validKeys.includes(key)) {
            if (isInputDebounced(key)) return;
            processBrowserInput(key);
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
    const actionResult = gameInstance.handleInput(input);

    if (actionResult && actionResult.action === 'next_floor_after_delay') {
        gameInstance.floorNumber++;
        gameInstance.setupFloor();
    }
    runBrowserGameLoop();
}

function updateStatusUI(displayState) {
    const itemCounts = (displayState.items || []).reduce((counts, id) => {
        counts[id] = (counts[id] || 0) + 1;
        return counts;
    }, {});

    const itemEntries = Object.entries(itemCounts);

    if (itemEntries.length === 0) {
        dom.itemList.innerHTML = `<strong>${t.items}:</strong> ${t.none}`;
    } else {
        const itemHtmlElements = itemEntries.map(([id, count]) => {
            const item = ITEMS[id];
            if (!item) return 'Unknown Item';

            const nameKey = `item_${id}_name`;
            // Get item name from locale, with a fallback to the original item object
            let itemName = t[nameKey] || item.name;
            if (item.key) {
                itemName += `(${item.key.toLowerCase()})`;
            }
            const itemTitle = t[nameKey] || item.name;
            return `<span class="item-link" data-item-id="${id}" title="${itemTitle}${t.viewDetails}">${itemName} x${count}</span>`;
        });
        dom.itemList.innerHTML = `<strong>${t.items}:</strong> ${itemHtmlElements.join(', ')}`;
    }

    dom.floorNumber.textContent = `${t.floor}: ${displayState.floorNumber}`;

    const currentRevelationRate = gameInstance.calculateRevelationRate();
    dom.revelationStatus.classList.remove('status-achieved', 'status-not-achieved');
    if (currentRevelationRate >= gameInstance.REVELATION_THRESHOLD) {
        dom.revelationStatus.textContent = `${t.revelationRate}: ${t.revelationAchieved}`;
        dom.revelationStatus.classList.add('status-achieved');
    } else {
        dom.revelationStatus.textContent = `${t.revelationRate}: ${t.revelationNotAchieved}`;
        dom.revelationStatus.classList.add('status-not-achieved');
    }
}

function renderConfirmDialog(message) {
    const screen = dom.confirmDialogScreen;
    screen.innerHTML = ''; // Clear previous content

    const template = document.getElementById('template-confirm-dialog');
    const content = template.content.cloneNode(true);

    // Set the message
    content.querySelector('.confirm-prompt-message').textContent = t.nextFloorPrompt;

    // Set button actions
    const yesButton = content.querySelector('[data-choice="yes"]');
    const noButton = content.querySelector('[data-choice="no"]');
    yesButton.textContent = t.yes;
    noButton.textContent = t.no;

    yesButton.onclick = () => processBrowserInput('yes');
    noButton.onclick = () => processBrowserInput('no');

    // Append the template content to the screen
    screen.appendChild(content);

    selectedConfirmIndex = 0;
    updateConfirmHighlight();
}

function runBrowserGameLoop() {
    const gameResult = gameInstance.gameLoop();

    document.body.dataset.gameState = gameResult.gameState;

    if (gameResult.newItemAcquired) {
        const item = gameResult.newItemAcquired;
        const nameKey = `item_${item.id}_name`;
        const itemName = t[nameKey] || item.name; // Fallback for non-i18n items
        const message = `${t.itemAcquired} ${itemName}`;
        showNotification(message, 3000);
        gameInstance.clearJustAcquiredItem();
    }

    const displayState = gameResult.displayState;

    renderGridToDom(displayState);
    updateStatusUI(displayState);

    const gameState = gameResult.gameState;

    if (gameState === 'confirm_next_floor') {
        renderConfirmDialog(gameResult.message);
    } else if (gameState === 'choosing_item') {
        renderItemSelectionScreen(displayState.currentItemChoices);
    } else if (gameState === 'gameover') {
        renderResultScreen(gameResult.result);
    } else if (['playing', 'jumping_direction', 'recon_direction'].includes(gameState)) {
        setupControlButtons();
    }

    if (gameResult.lastActionMessage) {
        // If the message is a key, translate it. Otherwise, display as is.
        const message = t[gameResult.lastActionMessage] || gameResult.lastActionMessage;
        showNotification(message);
        gameInstance.clearLastActionMessage();
    }

    if (['jumping_direction', 'recon_direction'].includes(gameState) && gameResult.message) {
        dom.actionPrompt.textContent = gameResult.message;
    }
    
    if (gameResult.message && !['choosing_item', 'confirm_next_floor', 'jumping_direction', 'recon_direction'].includes(gameState)) {
        showNotification(gameResult.message);
    }

    if (gameResult.uiEffect === 'flash_red') {
        flashScreenRed();
        gameInstance.clearUiEffect();
    }

    if (gameResult.tutorialToShow) {
        showTutorialModal(gameResult.tutorialToShow.title, gameResult.tutorialToShow.content);
    }
}

function flashScreenRed() {
    dom.gameContainer.classList.add('flash-red');
    setTimeout(() => {
        dom.gameContainer.classList.remove('flash-red');
    }, 200);
}

function renderResultScreen(result) {
    dom.resultScreen.querySelector('h2').textContent = t.gameOverTitle;
    document.getElementById('final-floor').textContent = `${t.finalFloor}: ${result.finalFloorNumber}`;
    
    const finalItemsDiv = document.getElementById('final-items');
    let itemsHtml = `${t.heldItems}: `;
    const itemEntries = Object.entries(result.finalItems);

    if (itemEntries.length === 0) {
        itemsHtml += t.none;
    } else {
        itemsHtml += itemEntries.map(([id, count]) => {
            const item = ITEMS[id];
            if (!item) return 'Unknown Item';
            return `${item.name} x${count}`;
        }).join(', ');
    }
    finalItemsDiv.textContent = itemsHtml;

    const floorRevelationRatesDiv = document.getElementById('floor-revelation-rates');
    floorRevelationRatesDiv.innerHTML = `<h3>${t.floorRevelationRates}:</h3>`;
    if (result.floorRevelationRates.length > 0) {
        const ul = document.createElement('ul');
        result.floorRevelationRates.forEach(fr => {
            const li = document.createElement('li');
            li.textContent = `${t.floor} ${fr.floor}: ${(fr.rate * 100).toFixed(2)}%`;
            ul.appendChild(li);
        });
        floorRevelationRatesDiv.appendChild(ul);
    } else {
        floorRevelationRatesDiv.textContent += t.none;
    }

    dom.resetButton.textContent = t.playAgain;
}

function renderItemSelectionScreen(choices) {
    const screen = dom.itemSelectionScreen;
    screen.innerHTML = `<h2>${t.floorClearedPrompt}</h2>`;
    selectedChoiceIndex = 0;

    if (choices) {
        const template = document.getElementById('template-item-choice');
        choices.forEach((id, index) => {
            const item = ITEMS[id];
            if (item) {
                const content = template.content.cloneNode(true);
                const button = content.querySelector('.item-choice-btn');
                
                const nameKey = `item_${id}_name`;
                const descKey = `item_${id}_desc`;
                button.querySelector('strong').textContent = t[nameKey] || item.name; // Fallback for non-i18n items
                button.querySelector('span').textContent = t[descKey] || item.description; // Fallback for non-i18n items
                
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
    let choices;
    // The game state on the body is the most reliable source of truth here
    if (document.body.dataset.gameState === 'confirm_next_floor') {
        choices = dom.confirmDialogScreen.querySelectorAll('.confirm-btn');
    } else {
        // Fallback for any other potential future confirmation dialogs in controls
        choices = dom.controls.querySelectorAll('.confirm-btn');
    }

    choices.forEach((btn, index) => {
        if (index === selectedConfirmIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function setupControlButtons() {
    dom.controls.innerHTML = '';
    const controls = [
        { id: 'btn-up', key: 'w', text: '&uarr;' },
        { id: 'btn-left', key: 'a', text: '&larr;' },
        { id: 'btn-down', key: 's', text: '&darr;' },
        { id: 'btn-right', key: 'd', text: '&rarr;' },
        { id: 'btn-inventory', key: null, text: t.inventory }
    ];

    controls.forEach(c => {
        const button = document.createElement('button');
        button.id = c.id;
        if (c.key) button.dataset.key = c.key;
        button.className = 'control-btn';
        button.innerHTML = c.text;
        dom.controls.appendChild(button);
    });

    document.getElementById('btn-inventory').addEventListener('click', showInventoryScreen);

    const keyButtons = document.querySelectorAll('[data-key]');
    keyButtons.forEach(button => {
        const action = (event) => {
            if (isInputLocked) return;
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
    const displayState = gameInstance.getDisplayState();
    const usableItemIds = displayState.items
        .filter(id => ITEMS[id] && ITEMS[id].key !== null);

    if (usableItemIds.length === 0) {
        showNotification(t.noUsableItems);
        return;
    }

    document.body.dataset.gameState = 'inventory';
    renderInventoryScreen(usableItemIds);
}

function renderInventoryScreen(usableItemIds) {
    const screen = dom.inventoryScreen;
    screen.innerHTML = `<h2>${t.useItemTitle}</h2>`;

    const hideAndShowGame = (event) => {
        if (event) event.stopPropagation(); // イベントの伝播を停止

        isInputLocked = true;
        setTimeout(() => { isInputLocked = false; }, 300);

        document.body.dataset.gameState = 'playing';
        runBrowserGameLoop();
    };

    usableItemIds.forEach(id => {
        const item = ITEMS[id];
        const button = document.createElement('button');
        button.className = 'inventory-item-btn';
        
        const nameKey = `item_${id}_name`;
        button.textContent = t[nameKey] || `(ID: ${id})`; // Fallback to ID

        const action = (event) => {
            // pointerupイベントは、デフォルトのアクション（clickイベントのトリガーなど）が少ないが、
            // 念のため呼び、意図しない動作を防ぐ。
            event.preventDefault();
            event.stopPropagation();

            isInputLocked = true;
            setTimeout(() => { isInputLocked = false; }, 300);

            hideAndShowGame(event);
            processBrowserInput(item.key);
        };
        // 'click'と'touchend'の代わりに'pointerup'に一本化
        button.addEventListener('pointerup', action);
        screen.appendChild(button);
    });

    const cancelButton = document.createElement('button');
    cancelButton.className = 'inventory-item-btn';
    cancelButton.id = 'inventory-cancel-btn';
    cancelButton.textContent = t.cancel;
    // 'click'と'touchend'の代わりに'pointerup'に一本化
    cancelButton.addEventListener('pointerup', hideAndShowGame);
    screen.appendChild(cancelButton);
}

function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (gameInstance) {
            runBrowserGameLoop();
        }
    }, 250); // Debounce resize events for 250ms
}

export function initBrowserGame(game, initializeGame, locale) {
    t = locale; // Set the locale for the module
    initDomCache();
    gameInstance = game;
    document.addEventListener('keydown', handleGlobalKeyboardInput);
    window.addEventListener('resize', handleResize); // Add resize listener
    setupControlButtons();

    dom.itemList.addEventListener('click', (event) => {
        const itemLink = event.target.closest('.item-link');
        if (itemLink) {
            const itemId = itemLink.dataset.itemId;
            if (itemId) {
                showItemDetailModal(itemId);
            }
        }
    });

    dom.resetButton.addEventListener('click', () => {
        initializeGame();
        gameInstance.setupFloor();
        runBrowserGameLoop();
        document.querySelectorAll('.control-btn').forEach(b => {
            b.style.pointerEvents = 'auto';
            b.style.backgroundColor = '';
        });
    });
    gameInstance.setupFloor();
    runBrowserGameLoop();
}