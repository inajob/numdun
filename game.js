import { ITEMS } from './items.js';
import {
  isValidCell,
  getEightDirectionsNeighbors,
  forEachCell,
  isSolvable,
  isGoalInitiallyVisible
} from './utils.js';

const getInitialGameState = () => ({
  grid: [],
  rows: 8,
  cols: 8,
  player: { r: 0, c: 0, items: [] },
  exit: { r: 0, c: 0 },
  floorNumber: 1,
  turn: 0,
  gameState: 'playing',
  exitRevealedThisFloor: false,
  uiEffect: null,
  justAcquiredItem: null,
  currentItemChoices: [],
  floorRevelationRates: [],
  finalFloorNumber: 0,
  finalItems: [],
  lastActionMessage: ''
});

export const game = {
  grid: [],
  rows: 8,
  cols: 8,
  player: { r: 0, c: 0, items: [] },
  exit: { r: 0, c: 0 },
  floorNumber: 1,
  turn: 0,
  gameState: 'playing', // playing, confirm_next_floor, choosing_item, jumping_direction, recon_direction, gameover
  exitRevealedThisFloor: false,
  REVELATION_THRESHOLD: 0.5, // 開示率のしきい値 (50%)
  uiEffect: null,
  justAcquiredItem: null,

  currentItemChoices: [],

  // リザルト画面用のプロパティを復元
  floorRevelationRates: [],
  finalFloorNumber: 0,
  finalItems: [],

  getAvailableItems: function() {
    const currentFloor = this.floorNumber;
    return Object.keys(ITEMS).filter(id => {
      const item = ITEMS[id];
      const minFloor = item.minFloor || 1;
      const maxFloor = item.maxFloor || Infinity;
      return currentFloor >= minFloor && currentFloor <= maxFloor;
    });
  },

  hasItem: function(itemId) {
    return this.player.items.includes(itemId);
  },

  setupFloor: function() {
    this.player.r = Math.floor(Math.random() * this.rows);
    this.player.c = Math.floor(Math.random() * this.cols);

    Object.assign(this, {
      turn: 0,
      gameState: 'playing',
      exitRevealedThisFloor: false,
    });

    if (this.floorNumber === 1) {
      this.floorRevelationRates = [];
      this.finalFloorNumber = 0;
      this.finalItems = [];
    }

    this.rows = 8 + Math.floor(this.floorNumber / 3);
    this.cols = 8 + Math.floor(this.floorNumber / 3);

    const baseTrapCount = 8 + this.floorNumber * 2;
    const areaBasedTrapCount = Math.floor((this.rows * this.cols) * 0.15);
    const trapCount = Math.max(baseTrapCount, areaBasedTrapCount);

    if (this.floorNumber === 1) {
      const allAvailableItemIds = this.getAvailableItems();
      const availableItems = allAvailableItemIds.filter(id => !this.player.items.includes(id));
      if (availableItems.length > 0) {
        const randomItemId = availableItems[Math.floor(Math.random() * availableItems.length)];
        this.player.items.push(randomItemId);
      }
    }

    let solvable = false;
    let goalInitiallyVisible = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    do {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        console.warn("Failed to generate a valid grid after", MAX_ATTEMPTS, "attempts. Forcing generation.");
        break;
      }

      this.generateGrid();
      this.placeTraps(trapCount);
      this.calculateNumbers();

      const validCells = [];
      forEachCell(this.grid, (cell, r, c) => {
        if (!cell.isTrap && cell.adjacentTraps === 0 && !(r === this.player.r && c === this.player.c)) {
          validCells.push({ r, c });
        }
      });

      if (validCells.length < 2) {
        solvable = false;
        continue;
      }

      const exitIndex = Math.floor(Math.random() * validCells.length);
      const exitPos = validCells.splice(exitIndex, 1)[0];
      this.exit.r = exitPos.r;
      this.exit.c = exitPos.c;

      const allPlaceableAvailable = this.getAvailableItems();
      const placeableItems = allPlaceableAvailable.filter(id => ITEMS[id].key !== null);
      const numberOfItemsToPlace = 2;

      for (let i = 0; i < numberOfItemsToPlace; i++) {
        if (placeableItems.length > 0 && validCells.length > 0) {
          const validCellIndex = Math.floor(Math.random() * validCells.length);
          const itemPos = validCells.splice(validCellIndex, 1)[0];
          const randomItemId = placeableItems[Math.floor(Math.random() * placeableItems.length)];
          this.grid[itemPos.r][itemPos.c].hasItem = true;
          this.grid[itemPos.r][itemPos.c].itemId = randomItemId;
        }
      }

      solvable = isSolvable(this.grid, this.player.r, this.player.c, this.exit.r, this.exit.c);
      goalInitiallyVisible = isGoalInitiallyVisible(this.grid, this.player.r, this.player.c, this.exit.r, this.exit.c);

    } while (!solvable || goalInitiallyVisible);

    this.revealFrom(this.player.r, this.player.c);
  },

  generateGrid: function() {
    this.grid = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        isTrap: false,
        isRevealed: false,
        adjacentTraps: 0,
        hasItem: false,
        itemId: null,
        isFlagged: false
      }))
    );
  },

  placeTraps: function(trapCount) {
    const forbiddenTrapZones = getEightDirectionsNeighbors(this.player.r, this.player.c, this.rows, this.cols);
    forbiddenTrapZones.push({ r: this.player.r, c: this.player.c });

    let trapsPlaced = 0;
    while (trapsPlaced < trapCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);

      const isForbidden = forbiddenTrapZones.some(pos => pos.r === r && pos.c === c);
      const isExit = r === this.exit.r && c === this.exit.c;

      if (!this.grid[r][c].isTrap && !isExit && !isForbidden) {
        this.grid[r][c].isTrap = true;
        trapsPlaced++;
      }
    }
  },

  calculateNumbers: function() {
    forEachCell(this.grid, (cell, r, c) => {
      if (cell.isTrap) return;
      let trapCount = 0;
      const neighbors = getEightDirectionsNeighbors(r, c, this.rows, this.cols);
      for (const neighbor of neighbors) {
        if (this.grid[neighbor.r][neighbor.c].isTrap) {
          trapCount++;
        }
      }
      cell.adjacentTraps = trapCount;
    });
  },

  revealFrom: function(r, c) {
    if (!isValidCell(r, c, this.rows, this.cols) || this.grid[r][c].isRevealed) return;
    this.grid[r][c].isRevealed = true;
    this.grid[r][c].isFlagged = false;

    if (this.grid[r][c].adjacentTraps === 0) {
      const neighbors = getEightDirectionsNeighbors(r, c, this.rows, this.cols);
      for (const neighbor of neighbors) {
        this.revealFrom(neighbor.r, neighbor.c);
      }
    }
  },

  toggleFlag: function(r, c) {
    if (isValidCell(r, c, this.rows, this.cols)) {
      const cell = this.grid[r][c];
      if (!cell.isRevealed) {
        cell.isFlagged = !cell.isFlagged;
      }
    }
  },

  calculateRevelationRate: function() {
    let revealedCount = 0;
    forEachCell(this.grid, (cell) => {
      if (cell.isRevealed) {
        revealedCount++;
      }
    });
    return revealedCount / (this.rows * this.cols);
  },

  getDisplayState: function() {
    return {
      grid: this.grid,
      player: { r: this.player.r, c: this.player.c },
      exit: this.exit,
      floorNumber: this.floorNumber,
      items: this.player.items,
      turn: this.turn,
      gameState: this.gameState,
      currentItemChoices: this.currentItemChoices,
      exitRevealedThisFloor: this.exitRevealedThisFloor,
    };
  },

  handleInput: function(key) {
    key = key.toLowerCase();

    if (this.gameState === 'confirm_next_floor') {
      if (key === 'yes') {
        const currentRevelationRate = this.calculateRevelationRate();
        this.floorRevelationRates.push({ floor: this.floorNumber, rate: currentRevelationRate });
        if (currentRevelationRate < this.REVELATION_THRESHOLD) {
          this.lastActionMessage = `フロア開示率が${(this.REVELATION_THRESHOLD * 100).toFixed(0)}%未満のため、アイテムボーナスはありませんでした。（${(currentRevelationRate * 100).toFixed(0)}%）`;
          this.floorNumber++;
          this.setupFloor();
        } else {
          this.gameState = 'choosing_item';
          this.showItemChoiceScreen();
        }
      } else {
        this.gameState = 'playing';
      }
    } else if (this.gameState === 'choosing_item') {
      const selectedIndex = parseInt(key, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < this.currentItemChoices.length) {
        const chosenId = this.currentItemChoices[selectedIndex];
        this.player.items.push(chosenId);
      }
      return { action: 'next_floor_after_delay' };
    } else if (this.gameState === 'recon_direction') {
      let dr = 0, dc = 0, directionChosen = false;
      switch (key) {
        case 'w': dr = -1; directionChosen = true; break;
        case 'a': dc = -1; directionChosen = true; break;
        case 's': dr = 1; directionChosen = true; break;
        case 'd': dc = 1; directionChosen = true; break;
        default:
          this.gameState = 'playing';
          this.lastActionMessage = '偵察ドローンの使用をキャンセルしました。';
          return this.gameLoop();
      }
      if (directionChosen) {
        const itemIndex = this.player.items.indexOf('recon_drone');
        if (itemIndex > -1) this.player.items.splice(itemIndex, 1);
        let r = this.player.r, c = this.player.c;
        while (true) {
          r += dr; c += dc;
          if (!isValidCell(r, c, this.rows, this.cols)) break;
          const cell = this.grid[r][c];
          if (cell.isTrap) {
            cell.isRevealed = true; cell.isFlagged = true; break;
          } else {
            this.revealFrom(r, c);
          }
        }
        this.gameState = 'playing';
        this.turn++;
        this.processPlayerLocation();
      }
    } else if (this.gameState === 'jumping_direction') {
      let jumpRow = this.player.r, jumpCol = this.player.c, jumped = false;
      switch (key) {
        case 'w': jumpRow -= 2; jumped = true; break;
        case 'a': jumpCol -= 2; jumped = true; break;
        case 's': jumpRow += 2; jumped = true; break;
        case 'd': jumpCol += 2; jumped = true; break;
        default:
            this.gameState = 'playing';
            this.lastActionMessage = '跳躍のブーツの使用をキャンセルしました。';
            return this.gameLoop();
      }
      if (jumped && isValidCell(jumpRow, jumpCol, this.rows, this.cols)) {
        const itemIndex = this.player.items.indexOf('long_jump');
        if (itemIndex > -1) this.player.items.splice(itemIndex, 1);
        this.player.r = jumpRow;
        this.player.c = jumpCol;
        this.gameState = 'playing';
        this.turn++;
        this.processPlayerLocation();
      } else {
        this.gameState = 'playing';
      }
    } else if (this.gameState === 'playing') {
      let newRow = this.player.r, newCol = this.player.c, moved = false, itemUsed = false;
      const itemToUseId = Object.keys(ITEMS).find(id => ITEMS[id].key === key);
      if (itemToUseId && this.hasItem(itemToUseId)) {
        const item = ITEMS[itemToUseId];
        if (item.use) {
          const result = item.use(this);
          itemUsed = true;
          if (result.consumed) {
            const itemIndex = this.player.items.indexOf(itemToUseId);
            if (itemIndex > -1) this.player.items.splice(itemIndex, 1);
          }
          if (result.message) this.lastActionMessage = result.message;
        }
      } else {
        switch (key) {
          case 'w': newRow--; moved = true; break;
          case 'a': newCol--; moved = true; break;
          case 's': newRow++; moved = true; break;
          case 'd': newCol++; moved = true; break;
        }
      }
      if (moved) {
        if (isValidCell(newRow, newCol, this.rows, this.cols)) {
          if (this.grid[newRow][newCol].isFlagged) {
            this.lastActionMessage = 'チェックしたマスには移動できません。';
            return this.gameLoop();
          }
          this.player.r = newRow;
          this.player.c = newCol;
        } else {
          return this.gameLoop();
        }
      }
      if (moved || (itemUsed && this.gameState === 'playing')) {
        this.turn++;
        this.processPlayerLocation();
      }
    }
    return this.gameLoop();
  },

  processPlayerLocation: function() {
    const currentCell = this.grid[this.player.r][this.player.c];
    if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
      this.gameState = 'confirm_next_floor';
      return;
    }
    if (currentCell.isTrap) {
      if (this.hasItem('trap_shield')) {
        const index = this.player.items.indexOf('trap_shield');
        this.player.items.splice(index, 1);
        currentCell.isTrap = false;
        this.calculateNumbers();
        this.revealFrom(this.player.r, this.player.c);
        this.uiEffect = 'flash_red';
        this.lastActionMessage = '鉄の心臓が身代わりになった！';
      } else {
        currentCell.isRevealed = true;
        this.gameState = 'gameover';
        this.lastActionMessage = '罠を踏んでしまった！';
      }
    }
    if (currentCell.hasItem) {
      const itemId = currentCell.itemId;
      this.player.items.push(itemId);
      currentCell.hasItem = false;
      currentCell.itemId = null;
      this.justAcquiredItem = itemId;
    }
    if (this.gameState !== 'gameover') {
      this.revealFrom(this.player.r, this.player.c);
    }
  },

  showItemChoiceScreen: function() {
    const choices = [];
    const itemIds = this.getAvailableItems();
    while (choices.length < 3 && choices.length < itemIds.length) {
      const randomId = itemIds[Math.floor(Math.random() * itemIds.length)];
      if (!choices.includes(randomId)) {
        choices.push(randomId);
      }
    }
    this.currentItemChoices = choices;
  },

  gameLoop: function() {
    if (this.gameState === 'gameover') {
      this.finalFloorNumber = this.floorNumber;
      this.finalItems = [...this.player.items];
      return {
        displayState: this.getDisplayState(),
        message: '!!! GAME OVER !!!',
        gameState: 'gameover',
        result: {
          floorRevelationRates: this.floorRevelationRates,
          finalFloorNumber: this.finalFloorNumber,
          finalItems: this.finalItems.reduce((counts, id) => {
            counts[id] = (counts[id] || 0) + 1;
            return counts;
          }, {})
        }
      };
    }
    let promptText = 'Move (w/a/s/d)';
    const itemActions = this.player.items
      .map(id => ITEMS[id])
      .filter(item => item.key)
      .map(item => `${item.key}: ${item.name}`);
    if (itemActions.length > 0) {
      promptText += ` | Use Item (${itemActions.join(', ')})`;
    }
    promptText += ' > ';
    let message = '';
    if (this.gameState === 'choosing_item') {
      message = 'Floor Cleared! Choose your reward:';
    } else if (this.gameState === 'jumping_direction') {
      message = 'Jump direction (w/a/s/d):';
    } else if (this.gameState === 'recon_direction') {
      message = 'Recon direction (w/a/s/d):';
    } else if (this.gameState === 'confirm_next_floor') {
      message = '次のフロアに進みますか？';
    }
    const result = {
      displayState: this.getDisplayState(),
      prompt: promptText,
      message: message,
      lastActionMessage: this.lastActionMessage,
      uiEffect: this.uiEffect,
      gameState: this.gameState,
      newItemAcquired: null
    };
    if (this.justAcquiredItem) {
      result.newItemAcquired = { id: this.justAcquiredItem, ...ITEMS[this.justAcquiredItem] };
    }
    return result;
  }
};

game.clearLastActionMessage = function() {
  this.lastActionMessage = '';
};

game.clearUiEffect = function() {
  this.uiEffect = null;
};

game.clearJustAcquiredItem = function() {
  this.justAcquiredItem = null;
};

export function initializeGame() {
  Object.assign(game, getInitialGameState());
}
