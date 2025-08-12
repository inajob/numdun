// core.js

export const UPGRADES = {
  reveal_one_trap: { name: '千里眼の巻物', description: '次のフロアの罠1つの位置がわかる。' },
  trap_shield: { name: '鉄の心臓', description: '1度だけ罠を踏んでも大丈夫になる。' },
  reduce_traps: { name: '解体の手引き', description: '次のフロアの罠が1つ減る。' },
  reveal_exit_temporarily: { name: '出口の地図', description: 'フロア開始時、出口の位置が常に表示される。' },
  dowsing_rod: { name: 'ダウジングロッド', description: '1フロアに1回だけ、現在地周辺の罠の数を知る。' },
  long_jump: { name: '跳躍のブーツ', description: '1フロアに1回だけ、指定方向に2マスジャンプできる。' },
  
};

export const game = {
  grid: [],
  rows: 8,
  cols: 8,
  player: { r: 0, c: 0, upgrades: [], items: [] },
  exit: { r: 0, c: 0 },
  floorNumber: 1,
  turn: 0,
  gameState: 'playing', // playing, choosing_upgrade, jumping_direction
  isGameOver: false,
  dowsingRodUsedThisFloor: false,
  longJumpUsedThisFloor: false,
  
  currentUpgradeChoices: [],    // NEW: 現在表示されているアップグレードの選択肢

  

  hasUpgrade: function(upgradeId) {
    return this.player.upgrades.includes(upgradeId);
  },

  hasItem: function(itemId) {
    return this.player.items.includes(itemId);
  },

  setupFloor: function() {
    // Randomize player start position
    this.player.r = Math.floor(Math.random() * this.rows);
    this.player.c = Math.floor(Math.random() * this.cols);

    // Randomize exit position, ensuring it's not the same as player start
    do {
      this.exit.r = Math.floor(Math.random() * this.rows);
      this.exit.c = Math.floor(Math.random() * this.cols);
    } while (this.exit.r === this.player.r && this.exit.c === this.player.c);

    this.floorNumber = this.floorNumber;
    this.turn = 0;
    this.gameState = 'playing';
    this.isGameOver = false;
    this.dowsingRodUsedThisFloor = false;
    this.longJumpUsedThisFloor = false;
    
    this.savedPlayerState = null;
    this.savedGridRevealedState = null;

    let trapCount = 8 + this.floorNumber * 2;
    if (this.hasUpgrade('reduce_traps')) {
      trapCount--;
      this.player.upgrades = this.player.upgrades.filter(id => id !== 'reduce_traps');
    }

    let solvable = false;
    do { // 解ける盤面が生成されるまでループ
      this.generateGrid();
      this.placeTraps(trapCount);
      this.calculateNumbers();

      // アイテムとして配置するアップグレードのID
      const itemUpgradeIds = ['trap_shield', 'dowsing_rod', 'long_jump'];

      // アイテムを配置する
      let itemPlaced = false;
      while (!itemPlaced) {
        const r = Math.floor(Math.random() * this.rows);
        const c = Math.floor(Math.random() * this.cols);
        const isPlayerStart = r === this.player.r && c === this.player.c;
        const isExit = r === this.exit.r && c === this.exit.c;
        // 数字のないマス (adjacentTraps === 0) にのみ配置
        if (!this.grid[r][c].isTrap && !isPlayerStart && !isExit && !this.grid[r][c].hasItem && this.grid[r][c].adjacentTraps === 0) {
          const randomItemId = itemUpgradeIds[Math.floor(Math.random() * itemUpgradeIds.length)];
          this.grid[r][c].hasItem = true;
          this.grid[r][c].itemId = randomItemId;
          itemPlaced = true;
        }
      }

      // 生成された盤面が解けるかチェック
      solvable = this.isSolvable(this.player.r, this.player.c, this.exit.r, this.exit.c, this.grid);
      if (!solvable) {
        
      }
    } while (!solvable);

    if (this.hasUpgrade('reveal_one_trap')) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const checkR = this.player.r + i;
          const checkC = this.player.c + j;
          if (checkR >= 0 && checkR < this.rows && checkC >= 0 && checkC < this.cols) {
            this.grid[checkR][checkC].isRevealed = true;
          }
        }
      }
      this.player.upgrades = this.player.upgrades.filter(id => id !== 'reveal_one_trap');
    }

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
      player: { r: this.player.r, c: this.player.c, items: this.player.items },
      exit: this.exit,
      floorNumber: this.floorNumber,
      upgrades: this.player.upgrades.map(id => UPGRADES[id].name),
      turn: this.turn,
      gameState: this.gameState,
      isGameOver: this.isGameOver,
      currentUpgradeChoices: this.currentUpgradeChoices,
      dowsingRodUsedThisFloor: this.dowsingRodUsedThisFloor,
      longJumpUsedThisFloor: this.longJumpUsedThisFloor,
      // Add any other data needed for rendering
    };
  },

  handleInput: function(key) {
    console.log("handleInput called. key:", key); // 追加
    // 現在の状態を保存 (入力処理の最初に実行)
    this.savedPlayerState = { r: this.player.r, c: this.player.c };
    this.savedGridRevealedState = this.grid.map(row => row.map(cell => cell.isRevealed));

    // ジャンプ方向入力待ち状態の処理
    if (this.gameState === 'jumping_direction') {
      let jumpRow = this.player.r;
      let jumpCol = this.player.c;
      let jumped = false;

      switch (key.toLowerCase()) {
        case 'w': jumpRow -= 2; jumped = true; break;
        case 'a': jumpCol -= 2; jumped = true; break;
        case 's': jumpRow += 2; jumped = true; break;
        case 'd': jumpCol += 2; jumped = true; break;
      }

      if (jumped && jumpRow >= 0 && jumpRow < this.rows && jumpCol >= 0 && jumpCol < this.cols) {
        this.player.r = jumpRow;
        this.player.c = jumpCol;
        this.longJumpUsedThisFloor = true;
        this.gameState = 'playing';

        // 罠判定
        const newCell = this.grid[this.player.r][this.player.c];
        if (newCell.isTrap) {
          if (this.hasItem('trap_shield')) {
            const index = this.player.items.indexOf('trap_shield');
            if (index > -1) {
              this.player.items.splice(index, 1);
            }
            newCell.isTrap = false;
            this.calculateNumbers();
          } else {
            newCell.isRevealed = true;
            this.isGameOver = true;
            this.gameState = 'gameover';
          }
        }
        this.revealFrom(this.player.r, this.player.c);
      } else {
        
        this.gameState = 'playing';
      }
      return this.gameLoop();
    }

    // アップグレード選択状態の処理
    if (this.gameState === 'choosing_upgrade') {
      const selectedIndex = parseInt(key, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < this.currentUpgradeChoices.length) {
        const chosenId = this.currentUpgradeChoices[selectedIndex];
        this.player.upgrades.push(chosenId);
        
      } else {
        
      }
      // Indicate that a delay is needed before proceeding to next floor
      return {
        action: 'next_floor_after_delay',
        delay: 2000, // 2 seconds
        message: selectedIndex >= 0 && selectedIndex < this.currentUpgradeChoices.length ?
                 `Acquired: ${UPGRADES[this.currentUpgradeChoices[selectedIndex]].name}!` :
                 'Invalid choice. No upgrade acquired.',
        displayState: this.getDisplayState(), // Return current state for display
      };
    }

    // 通常の移動処理
    if (this.gameState !== 'playing') return;

    let newRow = this.player.r;
    let newCol = this.player.c;
    let moved = false;

    switch (key.toLowerCase()) {
      case 'w': newRow--; moved = true; break;
      case 'a': newCol--; moved = true; break;
      case 's': newRow++; moved = true; break;
      case 'd': newCol++; moved = true; break;
      case 'u': // ダウジングロッドの使用
        console.log("u key pressed. hasItem('dowsing_rod'):", this.hasItem('dowsing_rod'), "dowsingRodUsedThisFloor:", this.dowsingRodUsedThisFloor); // 追加
        if (this.hasItem('dowsing_rod') && !this.dowsingRodUsedThisFloor) {
          this.dowsingRodUsedThisFloor = true;
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
          
        } else {
          
        }
        return this.gameLoop();
      case 'j': // 跳躍のブーツの使用
        console.log("j key pressed. hasItem('long_jump'):", this.hasItem('long_jump'), "longJumpUsedThisFloor:", this.longJumpUsedThisFloor); // 追加
        if (this.hasItem('long_jump') && !this.longJumpUsedThisFloor) {
          this.gameState = 'jumping_direction';
          
        } else {
          
        }
        return this.gameLoop();
      
    }

    if (moved && newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
      this.player.r = newRow;
      this.player.c = newCol;
      this.turn++;

      // 出口判定
      if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
        this.gameState = 'choosing_upgrade';
        this.showUpgradeScreen();
        return; // 出口に到達したら、以降の処理は不要
      }

      console.log("Player moved to:", this.player.r, this.player.c); // 追加
      let newCell = this.grid[this.player.r][this.player.c]; // letに変更
      console.log("New cell isTrap:", newCell.isTrap); // 追加

      // 罠判定
      //const newCell = this.grid[this.player.r][this.player.c];
      if (newCell.isTrap) {
        if (this.hasItem('trap_shield')) {
          // 鉄の心臓を持っている場合
          const index = this.player.items.indexOf('trap_shield');
          if (index > -1) {
            this.player.items.splice(index, 1); // アイテムを消費
          }
          newCell.isTrap = false; // 罠を無効化
          this.calculateNumbers(); // 周囲の数字を再計算
        } else {
          // 鉄の心臓を持っていない場合
          newCell.isRevealed = true;
          this.isGameOver = true;
          this.gameState = 'gameover';
        }
      }
      this.revealFrom(this.player.r, this.player.c);

      // アイテム取得ロジック
      const currentCell = this.grid[this.player.r][this.player.c];
      if (currentCell.hasItem) {
        this.player.items.push(currentCell.itemId);
        currentCell.hasItem = false; // アイテムは拾ったらなくなる
        currentCell.itemId = null;
        // アイテム取得メッセージなどを表示する場合は、ここでUI層に伝える情報を追加
      }
    } else if (moved) {
        
    }
    
    if (this.isGameOver) {
      // this.displayGrid();
      
      
    } else {
      return this.gameLoop();
    }
  },

  showUpgradeScreen: function() {
    const upgradeIds = ['reveal_one_trap', 'reveal_exit_temporarily', 'reduce_traps']; // フロアクリア時に選択できるアップグレードのみ
    const choices = [];
    while (choices.length < 3 && choices.length < upgradeIds.length) {
      const randomId = upgradeIds[Math.floor(Math.random() * upgradeIds.length)];
      if (!choices.includes(randomId)) {
        choices.push(randomId);
      }
    }

    this.currentUpgradeChoices = choices; // Store choices
    this.gameState = 'choosing_upgrade'; // Set game state for upgrade selection
  },

  gameLoop: function() {
    if (this.gameState === 'playing') {
      let promptText = 'Move (w/a/s/d)';
      const actions = [];
      if (this.hasItem('dowsing_rod') && !this.dowsingRodUsedThisFloor) {
        actions.push(`u: ${UPGRADES['dowsing_rod'].name}`);
      }
      if (this.hasItem('long_jump') && !this.longJumpUsedThisFloor) {
        actions.push(`j: ${UPGRADES['long_jump'].name}`);
      }
      

      if (actions.length > 0) {
        promptText += ` | ${actions.join(' | ')}`;
      }
      promptText += ' | q: quit > ';

      return {
        displayState: this.getDisplayState(),
        prompt: promptText,
        gameOver: this.isGameOver,
        gameState: this.gameState,
      };
    } else if (this.gameState === 'choosing_upgrade') {
        return {
            displayState: this.getDisplayState(),
            prompt: 'Enter number (1-3): ',
            gameOver: this.isGameOver,
            gameState: this.gameState,
        };
    } else if (this.gameState === 'jumping_direction') {
        return {
            displayState: this.getDisplayState(),
            prompt: 'Jump direction (w/a/s/d): ',
            gameOver: this.isGameOver,
            gameState: this.gameState,
        };
    } else if (this.gameState === 'gameover') {
        return {
            displayState: this.getDisplayState(),
            message: '!!! GAME OVER !!!',
            gameOver: this.isGameOver,
            gameState: this.gameState,
        };
    }
    return {
        displayState: this.getDisplayState(),
        gameOver: this.isGameOver,
        gameState: this.gameState,
    };
  }
};


