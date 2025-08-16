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
  isGameOver: false,
  exitRevealedThisFloor: false, // NEW: 出口の地図がこのフロアで使われたか
  REVELATION_THRESHOLD: 0.5, // 開示率のしきい値 (50%)
  uiEffect: null, // NEW: UIエフェクトのトリガー
  
  currentItemChoices: [],

  hasItem: function(itemId) {
    return this.player.items.includes(itemId);
  },

  setupFloor: function() {
    // Player positioning
    this.player.r = Math.floor(Math.random() * this.rows);
    this.player.c = Math.floor(Math.random() * this.cols);

    // Reset floor state
    this.turn = 0;
    this.gameState = 'playing';
    this.isGameOver = false;
    this.exitRevealedThisFloor = false; // リセット

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
      
      // Find valid cells for exit and items (adjacentTraps === 0)
      const validCells = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.grid[r][c].isTrap && this.grid[r][c].adjacentTraps === 0 && !(r === this.player.r && c === this.player.c)) {
            validCells.push({ r, c });
          }
        }
      }

      // If no valid cells, retry grid generation
      if (validCells.length < 2) { // Need at least 2 for exit and item
        solvable = false;
        continue;
      }

      // Place Exit
      const exitIndex = Math.floor(Math.random() * validCells.length);
      const exitPos = validCells.splice(exitIndex, 1)[0]; // Pick and remove from valid cells
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
      Array.from({ length: this.cols }, () => ({ isTrap: false, isRevealed: false, adjacentTraps: 0, hasItem: false, itemId: null }))
    );
  },

  placeTraps: function(trapCount) {
    let trapsPlaced = 0;
    while (trapsPlaced < trapCount) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      const isPlayerStart = r === this.player.r && c === this.player.c;
      const isExit = r === this.exit.r && c === this.exit.c;

      // プレイヤーの初期位置の周囲3x3マスには罠を配置しない
      const isNearPlayerStart = (
        r >= this.player.r - 1 && r <= this.player.r + 1 &&
        c >= this.player.c - 1 && c <= this.player.c + 1
      );

      // isNearPlayerStart の条件を追加
      if (!this.grid[r][c].isTrap && !isPlayerStart && !isExit && !isNearPlayerStart) {
        this.grid[r][c].isTrap = true;
        trapsPlaced++;
      }
    }
  },

  calculateNumbers: function() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].isTrap) continue;
        let trapCount = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nR = r + i, nC = c + j;
            if (nR >= 0 && nR < this.rows && nC >= 0 && nC < this.cols && this.grid[nR][nC].isTrap) {
              trapCount++;
            }
          }
        }
        this.grid[r][c].adjacentTraps = trapCount;
      }
    }
  },

  revealFrom: function(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || this.grid[r][c].isRevealed) return;
    this.grid[r][c].isRevealed = true;

    if (this.grid[r][c].adjacentTraps === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          this.revealFrom(r + i, c + j);
        }
      }
    }
  },

  // NEW: 盤面が解けるかどうかをチェックする関数 (BFSを使用)
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

        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && !grid[nr][nc].isTrap) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    return false;
  },

  // NEW: 初期配置でゴールがプレイヤーに見えていないかを確認する関数
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

          // Check if any neighbor of the current cell is the exit (new logic for exit visibility)
          for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                  if (i === 0 && j === 0) continue;
                  const nr = r + i;
                  const nc = c + j;
                  if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                      if (nr === exitR && nc === exitC) return true; // Exit is visible!
                  }
              }
          }

          // If this cell has traps nearby, it stops the cascade
          if (grid[r][c].adjacentTraps > 0 && !(r === startR && c === startC)) {
              continue;
          }

          for (let i = 0; i < 8; i++) { // Check all 8 neighbors for cascade
              const nr = r + dr[i];
              const nc = c + dc[i];

              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && !grid[nr][nc].isTrap) {
                  visited[nr][nc] = true;
                  queue.push({ r: nr, c: nc });
              }
          }
      }
      return false; // Exit is not visible
  },

  // NEW: フロアの開示率を計算する関数
  calculateRevelationRate: function() {
      let revealedCount = 0;
      for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
              if (this.grid[r][c].isRevealed) {
                  revealedCount++;
              }
          }
      }
      return revealedCount / (this.rows * this.cols);
  },

  getDisplayState: function() {
    return {
      grid: this.grid,
      player: { r: this.player.r, c: this.player.c },
      exit: this.exit, // 常に出口の座標を渡す
      floorNumber: this.floorNumber,
      items: this.player.items, // IDの配列をそのまま渡す
      turn: this.turn,
      gameState: this.gameState,
      isGameOver: this.isGameOver,
      currentItemChoices: this.currentItemChoices,
      exitRevealedThisFloor: this.exitRevealedThisFloor, // 地図の使用状況を渡す
    };
  },

  handleInput: function(key) {
    key = key.toLowerCase();

    // アイテム選択状態の処理
    if (this.gameState === 'choosing_item') {
      const selectedIndex = parseInt(key, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < this.currentItemChoices.length) {
        const chosenId = this.currentItemChoices[selectedIndex];
        this.player.items.push(chosenId);
      }
      // 選択後は次のフロアへ
      return { action: 'next_floor_after_delay' };
    }

    // ジャンプ方向入力待ち状態の処理
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

      if (jumped && jumpRow >= 0 && jumpRow < this.rows && jumpCol >= 0 && jumpCol < this.cols) {
        // ジャンプ成功時にアイテムを消費
        const itemIndex = this.player.items.indexOf('long_jump');
        if (itemIndex > -1) {
            this.player.items.splice(itemIndex, 1);
        }

        this.player.r = jumpRow;
        this.player.c = jumpCol;
        this.gameState = 'playing';
        this.processPlayerLocation(); // ジャンプ後の共通処理を実行
        return this.gameLoop(); // ジャンプ処理が完了したらここで終了
      } else {
        this.gameState = 'playing'; // 無効な入力なら通常状態に
        return this.gameLoop();
      }
    }

    // 通常のゲームプレイ状態
    if (this.gameState === 'playing') {
      let newRow = this.player.r;
      let newCol = this.player.c;
      let moved = false;
      let itemUsed = false;

      // アイテム使用キーの処理
      const itemToUse = Object.keys(ITEMS).find(id => ITEMS[id].key === key);
      if (itemToUse && this.hasItem(itemToUse)) {
          itemUsed = true;
          const itemIndex = this.player.items.indexOf(itemToUse);
          
          switch(itemToUse) {
              case 'reveal_one_trap':
                  // プレイヤーの周囲8マスを対象にすべて明らかにする
                  for (let i = -1; i <= 1; i++) {
                      for (let j = -1; j <= 1; j++) {
                          if (i === 0 && j === 0) continue; // プレイヤー自身のマスは除く
                          const checkR = this.player.r + i;
                          const checkC = this.player.c + j;

                          if (checkR >= 0 && checkR < this.rows && checkC >= 0 && checkC < this.cols) {
                              // 罠かどうかに関わらず、そのマスを開示する
                              // revealFrom を使うことで、0のマスなら連鎖的に開示される
                              const cell = this.grid[checkR][checkC];
                              if (cell.isTrap) {
                                cell.isRevealed = true;
                              }else{
                                this.revealFrom(checkR, checkC);
                              }
                          }
                      }
                  }
                  this.player.items.splice(itemIndex, 1); // アイテムを消費
                  break;
              case 'reduce_traps':
                  // プレイヤーの周囲8マスにある罠のリストを作成
                  const trapsInVicinity = [];
                  for (let i = -1; i <= 1; i++) {
                      for (let j = -1; j <= 1; j++) {
                          if (i === 0 && j === 0) continue; // プレイヤー自身のマスは除く
                          const checkR = this.player.r + i;
                          const checkC = this.player.c + j;

                          if (checkR >= 0 && checkR < this.rows && checkC >= 0 && checkC < this.cols) {
                              const cell = this.grid[checkR][checkC];
                              if (cell.isTrap) {
                                  trapsInVicinity.push({ r: checkR, c: checkC });
                              }
                          }
                      }
                  }

                  if (trapsInVicinity.length > 0) {
                      // 周囲に罠がある場合、ランダムに1つ選択して解体
                      const trapToDemolish = trapsInVicinity[Math.floor(Math.random() * trapsInVicinity.length)];
                      this.grid[trapToDemolish.r][trapToDemolish.c].isTrap = false;
                      this.calculateNumbers(); // 数字を再計算
                  }
                  this.player.items.splice(itemIndex, 1); // アイテムを消費
                  break;
              case 'reveal_exit':
                  if (!this.exitRevealedThisFloor) { // 既に表示されていなければ
                      this.exitRevealedThisFloor = true;
                      this.player.items.splice(itemIndex, 1); // アイテムを消費
                  } else {
                      // 既に表示されている場合は何もせず、アイテムも消費しない
                      itemUsed = false; // アイテムが使われなかったことを示す
                  }
                  break; 
              case 'long_jump':
                  this.gameState = 'jumping_direction';
                  // アイテムはジャンプ成功時に消費
                  break;
          }
      } else {
          // 移動キーの処理
          switch (key) {
            case 'w': newRow--; moved = true; break;
            case 'a': newCol--; moved = true; break;
            case 's': newRow++; moved = true; break;
            case 'd': newCol++; moved = true; break;
          }
      }

      if (moved) {
        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
          this.player.r = newRow;
          this.player.c = newCol;
        } else {
          return this.gameLoop(); // 壁の外なら何もしない
        }
      }
      
      if (moved || itemUsed) {
          this.turn++;
          this.processPlayerLocation(); // 移動またはアイテム使用後の共通処理を実行
      }
    }
    
    return this.gameLoop();
  },

  processPlayerLocation: function() {
      // 移動・ジャンプ後の共通処理
      const currentCell = this.grid[this.player.r][this.player.c];

      // 1. 出口判定
      if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
        const REVELATION_THRESHOLD = 0.5; // 50%の開示率
        const currentRevelationRate = this.calculateRevelationRate();

        if (currentRevelationRate < REVELATION_THRESHOLD) {
            this.lastActionMessage = `フロア開示率が${(REVELATION_THRESHOLD * 100).toFixed(0)}%未満のため、アイテムボーナスはありませんでした。（${(currentRevelationRate * 100).toFixed(0)}%）`;
            this.floorNumber++;
            this.setupFloor();
        } else {
            this.gameState = 'choosing_item';
            this.showItemChoiceScreen();
        }
        return; // 共通処理の終了
      }

      // 2. 罠判定
      if (currentCell.isTrap) {
        if (this.hasItem('trap_shield')) {
          const index = this.player.items.indexOf('trap_shield');
          this.player.items.splice(index, 1);
          currentCell.isTrap = false;
          this.calculateNumbers();
          this.revealFrom(this.player.r, this.player.c); // 鉄の心臓発動時に再帰的に開示
          this.uiEffect = 'flash_red'; // NEW: UIエフェクトのトリガー
          // メッセージを設定
          this.lastActionMessage = '鉄の心臓が身代わりになった！';
        } else {
          currentCell.isRevealed = true;
          this.isGameOver = true;
          this.gameState = 'gameover';
          this.lastActionMessage = '罠を踏んでしまった！';
        }
      }

      // 3. アイテム取得判定
      if (currentCell.hasItem) {
        this.player.items.push(currentCell.itemId);
        currentCell.hasItem = false;
        currentCell.itemId = null;
      }
      
      // 4. マスを開ける
      if(!this.isGameOver) {
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
    if (this.isGameOver) {
        return {
            displayState: this.getDisplayState(),
            message: '!!! GAME OVER !!!',
            gameOver: true,
            gameState: 'gameover',
        };
    }

    let promptText = 'Move (w/a/s/d)';
    const itemActions = this.player.items
        .map(id => ITEMS[id])
        .filter(item => item.key) // キーが設定されているアイテムのみ
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
      lastActionMessage: this.lastActionMessage, // NEW: 直前の行動メッセージ
      uiEffect: this.uiEffect, // NEW: UIエフェクト
      gameOver: this.isGameOver,
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


