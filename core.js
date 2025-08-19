// core.js

export const ITEMS = {
  reveal_one_trap: { name: '千里眼の巻物', description: 'プレイヤーの周囲8マスにある罠をすべて明らかにする。', key: 'r' },
  trap_shield: { name: '鉄の心臓', description: '罠を踏んだ時に1度だけ身代わりになる。(パッシブ)', key: null },
  reduce_traps: { name: '解体の手引き', description: 'ランダムな罠1つを無効化する。', key: 't' },
  reveal_exit: { name: '出口の地図', description: '出口の位置を明らかにする。', key: 'e' },
  long_jump: { name: '跳躍のブーツ', description: '指定した方向に1マス飛び越えて、2マス先に進む。', key: 'j' },
};

export const game = {
  grid: [],
  rows: 8,
  cols: 8,
  player: { r: 0, c: 0, items: [] },
  exit: { r: 0, c: 0 },
  floorNumber: 1,
  turn: 0,
  gameState: 'playing', // playing, choosing_item, jumping_direction, gameover
  exitRevealedThisFloor: false, 
  REVELATION_THRESHOLD: 0.5, // 開示率のしきい値 (50%)
  uiEffect: null, 
  
  currentItemChoices: [],

  // リザルト画面用のプロパティを復元
  floorRevelationRates: [],
  finalFloorNumber: 0,
  finalItems: [],

  hasItem: function(itemId) {
    return this.player.items.includes(itemId);
  },

  isValidCell: function(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  },

  getEightDirectionsNeighbors: function(r, c) {
    const neighbors = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue; // 自身のマスは除く
        const nR = r + i;
        const nC = c + j;
        if (this.isValidCell(nR, nC)) {
          neighbors.push({ r: nR, c: nC });
        }
      }
    }
    return neighbors;
  },

  forEachCell: function(callback) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        callback(this.grid[r][c], r, c);
      }
    }
  },

  setupFloor: function() {
    // Player positioning
    this.player.r = Math.floor(Math.random() * this.rows);
    this.player.c = Math.floor(Math.random() * this.cols);

    // Reset floor state
    this.turn = 0;
    this.gameState = 'playing';
    this.exitRevealedThisFloor = false; // リセット

    // ゲーム開始時にリザルト情報を初期化（復元）
    if (this.floorNumber === 1) {
        this.floorRevelationRates = [];
        this.finalFloorNumber = 0;
        this.finalItems = [];
    }

    // グリッドサイズをフロア数に応じて変更
    this.rows = 8 + Math.floor(this.floorNumber / 3); // 3フロアごとに1行増やす
    this.cols = 8 + Math.floor(this.floorNumber / 3); // 3フロアごとに1列増やす

    const baseTrapCount = 8 + this.floorNumber * 2; // 現在の罠の数
    // 罠の数をグリッドサイズに応じて調整
    const areaBasedTrapCount = Math.floor((this.rows * this.cols) * 0.15);
    const trapCount = Math.max(baseTrapCount, areaBasedTrapCount);

    // 初期アイテムを付与 (既に持っているアイテムは重複して付与しない)
    const allItemIds = Object.keys(ITEMS);
    const availableItems = allItemIds.filter(id => !this.player.items.includes(id));
    if (availableItems.length > 0) {
        const randomItemId = availableItems[Math.floor(Math.random() * availableItems.length)];
        this.player.items.push(randomItemId);
    }

    // Generate a solvable grid
    let solvable = false;
    let goalInitiallyVisible = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    do {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        console.warn("Failed to generate a valid grid after", MAX_ATTEMPTS, "attempts. Forcing generation.");
        solvable = true; 
        goalInitiallyVisible = false;
        break;
      }

      this.generateGrid();
      this.placeTraps(trapCount);
      this.calculateNumbers();
      
      const validCells = [];
      this.forEachCell((cell, r, c) => {
        if (!cell.isTrap && cell.adjacentTraps === 0 && !(r === this.player.r && c === this.player.c)) {
          validCells.push({ r, c });
        }
      });

      if (validCells.length < 2) { 
        solvable = false;
        continue;
      }

      // Place Exit
      const exitIndex = Math.floor(Math.random() * validCells.length);
      const exitPos = validCells.splice(exitIndex, 1)[0];
      this.exit.r = exitPos.r;
      this.exit.c = exitPos.c;

      // Place one item
      const placeableItems = Object.keys(ITEMS).filter(id => ITEMS[id].key !== null);
      if (placeableItems.length > 0 && validCells.length > 0) {
          const itemIndex = Math.floor(Math.random() * validCells.length);
          const itemPos = validCells[itemIndex];
          const randomItemId = placeableItems[Math.floor(Math.random() * placeableItems.length)];
          this.grid[itemPos.r][itemPos.c].hasItem = true;
          this.grid[itemPos.r][itemPos.c].itemId = randomItemId;
      }

      solvable = this.isSolvable(this.player.r, this.player.c, this.exit.r, this.exit.c, this.grid);
      goalInitiallyVisible = this.isGoalInitiallyVisible(this.player.r, this.player.c, this.exit.r, this.exit.c, this.grid);

      if (!solvable) {
        console.log(`Attempt ${attempts}: Grid not solvable. Retrying...`);
      } else if (goalInitiallyVisible) {
        console.log(`Attempt ${attempts}: Goal initially visible. Retrying...`);
      }
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
        isFlagged: false // NEW: フラグの状態を追加
      }))
    );
  },

  placeTraps: function(trapCount) {
    let trapsPlaced = 0;
    while (trapsPlaced < trapCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      const isPlayerStart = r === this.player.r && c === this.player.c;
      const isExit = r === this.exit.r && c === this.exit.c;

      const isNearPlayerStart = (
        r >= this.player.r - 1 && r <= this.player.r + 1 &&
        c >= this.player.c - 1 && c <= this.player.c + 1
      );

      if (!this.grid[r][c].isTrap && !isPlayerStart && !isExit && !isNearPlayerStart) {
        this.grid[r][c].isTrap = true;
        trapsPlaced++;
      }
    }
  },

  calculateNumbers: function() {
    this.forEachCell((cell, r, c) => {
      if (cell.isTrap) return;
      let trapCount = 0;
      const neighbors = this.getEightDirectionsNeighbors(r, c);
      for (const neighbor of neighbors) {
          if (this.grid[neighbor.r][neighbor.c].isTrap) {
              trapCount++;
          }
      }
      cell.adjacentTraps = trapCount;
    });
  },

  revealFrom: function(r, c) {
    if (!this.isValidCell(r, c) || this.grid[r][c].isRevealed) return;
    this.grid[r][c].isRevealed = true;
    this.grid[r][c].isFlagged = false;

    if (this.grid[r][c].adjacentTraps === 0) {
      const neighbors = this.getEightDirectionsNeighbors(r, c);
        for (const neighbor of neighbors) {
            this.revealFrom(neighbor.r, neighbor.c);
        }
    }
  },

  // NEW: 指定したマスのフラグを立てる/外す関数
  toggleFlag: function(r, c) {
    if (this.isValidCell(r, c)) {
        const cell = this.grid[r][c];
        if (!cell.isRevealed) {
            cell.isFlagged = !cell.isFlagged;
        }
    }
  },

  isSolvable: function(startR, startC, endR, endC, grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [{ r: startR, c: startC }];

    if (grid[startR][startC].isTrap) return false;
    if (grid[endR][endC].isTrap) return false;

    visited[startR][startC] = true;

    const dr = [-1, 1, 0, 0]; // 上下左右
    const dc = [0, 0, -1, 1];

    while (queue.length > 0) {
      const { r, c } = queue.shift();

      if (r === endR && c === endC) {
        return true;
      }

      for (let i = 0; i < 4; i++) {
        const nr = r + dr[i];
        const nc = c + dc[i];

        if (this.isValidCell(nr, nc) && !visited[nr][nc] && !grid[nr][nc].isTrap) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    return false;
  },

  isGoalInitiallyVisible: function(startR, startC, exitR, exitC, grid) {
      const rows = grid.length;
      const cols = grid[0].length;
      const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
      const queue = [{ r: startR, c: startC }];

      if (startR === exitR && startC === exitC) return true; // Player starts on exit

      visited[startR][startC] = true;

      const dr = [-1, -1, -1, 0, 0, 1, 1, 1]; // 8 directions
      const dc = [-1, 0, 1, -1, 1, -1, 0, 1];

      while (queue.length > 0) {
          const { r, c } = queue.shift();

          for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                  if (i === 0 && j === 0) continue;
                  const nr = r + i;
                  const nc = c + j;
                  if (this.isValidCell(nr, nc)) {
                      if (nr === exitR && nc === exitC) return true; // Exit is visible!
                  }
              }
          }

          if (grid[r][c].adjacentTraps > 0 && !(r === startR && c === startC)) {
              continue;
          }

          for (let i = 0; i < 8; i++) { // Check all 8 neighbors for cascade
              const nr = r + dr[i];
              const nc = c + dc[i];

              if (this.isValidCell(nr, nc) && !visited[nr][nc] && !grid[nr][nc].isTrap) {
                  visited[nr][nc] = true;
                  queue.push({ r: nr, c: nc });
              }
          }
      }
      return false; // Exit is not visible
  },

  calculateRevelationRate: function() {
      let revealedCount = 0;
      this.forEachCell((cell) => {
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

    if (this.gameState === 'choosing_item') {
      const selectedIndex = parseInt(key, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < this.currentItemChoices.length) {
        const chosenId = this.currentItemChoices[selectedIndex];
        this.player.items.push(chosenId);
      }
      return { action: 'next_floor_after_delay' };
    }

    if (this.gameState === 'jumping_direction') {
      let jumpRow = this.player.r;
      let jumpCol = this.player.c;
      let jumped = false;

      switch (key) {
        case 'w': jumpRow -= 2; jumped = true; break;
        case 'a': jumpCol -= 2; jumped = true; break;
        case 's': jumpRow += 2; jumped = true; break;
        case 'd': jumpCol += 2; jumped = true; break;
      }

      if (jumped && this.isValidCell(jumpRow, jumpCol)) {
        const itemIndex = this.player.items.indexOf('long_jump');
        if (itemIndex > -1) {
            this.player.items.splice(itemIndex, 1);
        }

        this.player.r = jumpRow;
        this.player.c = jumpCol;
        this.gameState = 'playing';
        this.processPlayerLocation();
        return this.gameLoop();
      } else {
        this.gameState = 'playing';
        return this.gameLoop();
      }
    }

    if (this.gameState === 'playing') {
      let newRow = this.player.r;
      let newCol = this.player.c;
      let moved = false;
      let itemUsed = false;

      const itemToUse = Object.keys(ITEMS).find(id => ITEMS[id].key === key);
      if (itemToUse && this.hasItem(itemToUse)) {
          itemUsed = true;
          const itemIndex = this.player.items.indexOf(itemToUse);
          
          switch(itemToUse) {
              case 'reveal_one_trap':
                  const neighborsToReveal = this.getEightDirectionsNeighbors(this.player.r, this.player.c);
                  for (const neighbor of neighborsToReveal) {
                      const cell = this.grid[neighbor.r][neighbor.c];
                      if (cell.isTrap) {
                          cell.isRevealed = true;
                          cell.isFlagged = false;
                      } else {
                          this.revealFrom(neighbor.r, neighbor.c);
                      }
                  }
                  this.player.items.splice(itemIndex, 1);
                  break;
              case 'reduce_traps':
                  const neighborsForTrapCheck = this.getEightDirectionsNeighbors(this.player.r, this.player.c);
                  const trapsInVicinity = neighborsForTrapCheck.filter(cellPos => this.grid[cellPos.r][cellPos.c].isTrap);

                  if (trapsInVicinity.length > 0) {
                      const trapToDemolish = trapsInVicinity[Math.floor(Math.random() * trapsInVicinity.length)];
                      this.grid[trapToDemolish.r][trapToDemolish.c].isTrap = false;
                      this.calculateNumbers();
                  }
                  this.player.items.splice(itemIndex, 1);
                  break;
              case 'reveal_exit':
                  if (!this.exitRevealedThisFloor) { 
                      this.exitRevealedThisFloor = true;
                      this.player.items.splice(itemIndex, 1);
                  } else {
                      itemUsed = false;
                  }
                  break; 
              case 'long_jump':
                  this.gameState = 'jumping_direction';
                  break;
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
        if (this.isValidCell(newRow, newCol)) {
          // NEW: Check for flag before moving
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
      
      if (moved || itemUsed) {
          this.turn++;
          this.processPlayerLocation();
      }
    }
    
    return this.gameLoop();
  },

  processPlayerLocation: function() {
      const currentCell = this.grid[this.player.r][this.player.c];

      if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
        const currentRevelationRate = this.calculateRevelationRate();

        this.floorRevelationRates.push({
            floor: this.floorNumber,
            rate: currentRevelationRate
        });

        if (currentRevelationRate < this.REVELATION_THRESHOLD) {
            this.lastActionMessage = `フロア開示率が${(this.REVELATION_THRESHOLD * 100).toFixed(0)}%未満のため、アイテムボーナスはありませんでした。（${(currentRevelationRate * 100).toFixed(0)}%）`;
            this.floorNumber++;
            this.setupFloor();
        } else {
            this.gameState = 'choosing_item';
            this.showItemChoiceScreen();
        }
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
        this.player.items.push(currentCell.itemId);
        currentCell.hasItem = false;
        currentCell.itemId = null;
      }
      
      if(this.gameState !== 'gameover') {
          this.revealFrom(this.player.r, this.player.c);
      }
  },

  showItemChoiceScreen: function() {
    const choices = [];
    const itemIds = Object.keys(ITEMS);
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
    }

    return {
      displayState: this.getDisplayState(),
      prompt: promptText,
      message: message,
      lastActionMessage: this.lastActionMessage,
      uiEffect: this.uiEffect,
      gameState: this.gameState,
    };
  }
};

// メッセージをクリアする
game.clearLastActionMessage = function() {
    this.lastActionMessage = '';
};

// UIエフェクトをクリアする
game.clearUiEffect = function() {
    this.uiEffect = null;
};