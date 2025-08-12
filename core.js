// core.js

export const ITEMS = {
  reveal_one_trap: { name: '千里眼の巻物', description: 'ランダムな罠1つの位置を明らかにする。', key: 'r' },
  trap_shield: { name: '鉄の心臓', description: '罠を踏んだ時に1度だけ身代わりになる。(パッシブ)', key: null },
  reduce_traps: { name: '解体の手引き', description: 'ランダムな罠1つを無効化する。', key: 't' },
  reveal_exit: { name: '出口の地図', description: '出口の位置を明らかにする。', key: 'e' },
  dowsing_rod: { name: 'ダウジングロッド', description: '現在地の周囲8マスにある罠の数を表示する。', key: 'u' },
  long_jump: { name: '跳躍のブーツ', description: '指定した方向に2マスジャンプする。', key: 'j' },
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
  
  currentItemChoices: [],

  hasItem: function(itemId) {
    return this.player.items.includes(itemId);
  },

  setupFloor: function() {
    // Player/Exit positioning
    this.player.r = Math.floor(Math.random() * this.rows);
    this.player.c = Math.floor(Math.random() * this.cols);
    do {
      this.exit.r = Math.floor(Math.random() * this.rows);
      this.exit.c = Math.floor(Math.random() * this.cols);
    } while (this.exit.r === this.player.r && this.exit.c === this.player.c);

    // Reset floor state
    this.turn = 0;
    this.gameState = 'playing';
    this.isGameOver = false;
    this.exitRevealedThisFloor = false; // リセット

    const trapCount = 8 + this.floorNumber * 2;

    // Generate a solvable grid
    let solvable = false;
    do {
      this.generateGrid();
      this.placeTraps(trapCount);
      this.calculateNumbers();
      
      // Place one item on the floor
      const placeableItems = Object.keys(ITEMS).filter(id => ITEMS[id].key !== null); // Exclude passive items
      let itemPlaced = false;
      while (!itemPlaced) {
        const r = Math.floor(Math.random() * this.rows);
        const c = Math.floor(Math.random() * this.cols);
        const isPlayerStart = r === this.player.r && c === this.player.c;
        const isExit = r === this.exit.r && c === this.exit.c;
        if (!this.grid[r][c].isTrap && !isPlayerStart && !isExit && !this.grid[r][c].hasItem && this.grid[r][c].adjacentTraps === 0) {
          const randomItemId = placeableItems[Math.floor(Math.random() * placeableItems.length)];
          this.grid[r][c].hasItem = true;
          this.grid[r][c].itemId = randomItemId;
          itemPlaced = true;
        }
      }

      solvable = this.isSolvable(this.player.r, this.player.c, this.exit.r, this.exit.c, this.grid);
    } while (!solvable);

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
      if (!this.grid[r][c].isTrap && !isPlayerStart && !isExit) {
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
        this.player.r = jumpRow;
        this.player.c = jumpCol;
        this.gameState = 'playing';
        // ジャンプ後の処理（罠、アイテム取得など）は移動処理に共通化
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
                  // 未発見の罠をランダムに1つ रिवील
                  const unrevealedTraps = [];
                  for (let r = 0; r < this.rows; r++) {
                      for (let c = 0; c < this.cols; c++) {
                          if (this.grid[r][c].isTrap && !this.grid[r][c].isRevealed) {
                              unrevealedTraps.push({r, c});
                          }
                      }
                  }
                  if (unrevealedTraps.length > 0) {
                      const trapToReveal = unrevealedTraps[Math.floor(Math.random() * unrevealedTraps.length)];
                      this.grid[trapToReveal.r][trapToReveal.c].isRevealed = true;
                  }
                  this.player.items.splice(itemIndex, 1);
                  break;
              case 'reduce_traps':
                  // ランダムな罠を1つ削除
                  const allTraps = [];
                  for (let r = 0; r < this.rows; r++) {
                      for (let c = 0; c < this.cols; c++) {
                          if (this.grid[r][c].isTrap) {
                              allTraps.push({r, c});
                          }
                      }
                  }
                  if (allTraps.length > 0) {
                      const trapToRemove = allTraps[Math.floor(Math.random() * allTraps.length)];
                      this.grid[trapToRemove.r][trapToRemove.c].isTrap = false;
                      this.calculateNumbers(); // 数字を再計算
                  }
                  this.player.items.splice(itemIndex, 1);
                  break;
              case 'reveal_exit':
                  this.exitRevealedThisFloor = true;
                  this.player.items.splice(itemIndex, 1); // アイテムを消費
                  break; 
              case 'dowsing_rod':
                  let trapsInVicinity = 0;
                  for (let i = -1; i <= 1; i++) {
                      for (let j = -1; j <= 1; j++) {
                          const checkR = this.player.r + i;
                          const checkC = this.player.c + j;
                          if (checkR >= 0 && checkR < this.rows && checkC >= 0 && checkC < this.cols) {
                              if (this.grid[checkR][checkC].isTrap) {
                                  trapsInVicinity++;
                              }
                          }
                      }
                  }
                  // TODO: メッセージをUIに表示する方法が必要
                  console.log(`[Dowsing] Traps nearby: ${trapsInVicinity}`);
                  this.player.items.splice(itemIndex, 1);
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
      }

      // 移動・ジャンプ後の共通処理
      const currentCell = this.grid[this.player.r][this.player.c];

      // 1. 出口判定
      if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
        this.gameState = 'choosing_item';
        this.showItemChoiceScreen();
        return;
      }

      // 2. 罠判定
      if (currentCell.isTrap) {
        if (this.hasItem('trap_shield')) {
          const index = this.player.items.indexOf('trap_shield');
          this.player.items.splice(index, 1);
          currentCell.isTrap = false;
          this.calculateNumbers();
        } else {
          currentCell.isRevealed = true;
          this.isGameOver = true;
          this.gameState = 'gameover';
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
    }
    
    return this.gameLoop();
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
      gameOver: this.isGameOver,
      gameState: this.gameState,
    };
  }
};


