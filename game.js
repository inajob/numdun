// --- データ定義 ---
const UPGRADES = {
  reveal_one_trap: { name: '千里眼の巻物', description: '次のフロアの罠1つの位置がわかる。' },
  trap_shield: { name: '鉄の心臓', description: '1度だけ罠を踏んでも大丈夫になる。' },
  reduce_traps: { name: '解体の手引き', description: '次のフロアの罠が1つ減る。' },
  reveal_exit_temporarily: { name: '出口の地図', description: 'フロア開始から5ターンの間、出口の位置が表示される。' },
  dowsing_rod: { name: 'ダウジングロッド', description: '1フロアに1回だけ、現在地周辺の罠の数を知る。' },
  long_jump: { name: '跳躍のブーツ', description: '1フロアに1回だけ、指定方向に2マスジャンプできる。' },
  undo_move: { name: '時の砂', description: '1フロアに1回だけ、直前の1手を元に戻すことができる。' },
};

// Environment detection
const isNodeEnv = typeof window === 'undefined' && typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';

let rl; // For Node.js readline interface
let gameOutputDiv; // For browser DOM output
let gameInput; // For browser DOM input

if (isNodeEnv) {
  const readline = require('readline');
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
}

// Abstracted I/O functions
function print(text) {
  if (isNodeEnv) {
    console.log(text);
  } else {
    const p = document.createElement('p');
    p.textContent = text;
    document.getElementById('game-messages').appendChild(p);
    document.getElementById('game-messages').scrollTop = document.getElementById('game-messages').scrollHeight; // Auto-scroll to bottom
  }
}

function clear() {
  if (isNodeEnv) {
    console.clear();
  }
  else {
    document.getElementById('game-messages').innerHTML = '';
  }
}

function prompt(promptText, callback) {
  if (isNodeEnv) {
    rl.question(promptText, callback);
  } else {
    print(promptText);
    gameInput.focus();
    // In browser, the callback is handled by handleBrowserInput on Enter key
    // The actual game.handleInput will be called by handleBrowserInput
  }
}

if (!isNodeEnv) {
// Browser-specific initialization and input handling
function initBrowserDomElements() {
    if (isNodeEnv) return; // Only for browser environment
    // gameOutputDiv is no longer used for general messages, but for grid
    // gameOutputDiv = document.getElementById('game-output'); // Remove this line
    gameInput = document.getElementById('game-input');
    gameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const input = gameInput.value;
            gameInput.value = ''; // Clear input field
            game.handleInput(input); // Pass input to game logic
        }
    });
    // Add global keydown listener for movement
    document.addEventListener('keydown', handleGlobalKeyboardInput);
}

// Handle global keyboard input for movement (browser only)
function handleGlobalKeyboardInput(event) {
    if (game.gameState !== 'playing' || game.isGameOver) return; // Only handle movement when playing and not game over

    let handled = true;
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            game.handleInput('w');
            break;
        case 'ArrowDown':
        case 's':
            game.handleInput('s');
            break;
        case 'ArrowLeft':
        case 'a':
            game.handleInput('a');
            break;
        case 'ArrowRight':
        case 'd':
            game.handleInput('d');
            break;
        default:
            handled = false;
            break;
    }

    if (handled) {
        event.preventDefault(); // Prevent default scroll behavior for arrow keys
    }
}

// Renders the game grid to the DOM (browser only)
function renderGridToDom() {
    if (isNodeEnv) return; // Only for browser environment

    const gameGridDiv = document.getElementById('game-grid');
    gameGridDiv.innerHTML = ''; // Clear previous grid

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';

    for (let r = 0; r < game.rows; r++) {
        const row = document.createElement('tr');
        for (let c = 0; c < game.cols; c++) {
            const cell = document.createElement('td');
            cell.style.width = '30px';
            cell.style.height = '30px';
            cell.style.border = '1px solid #555';
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            cell.style.fontWeight = 'bold';
            cell.style.fontSize = '1.2em';
            cell.style.cursor = 'default'; // No pointer cursor

            const gridCell = game.grid[r][c];
            const isPlayer = (r === game.player.r && c === game.player.c);
            const isExit = (r === game.exit.r && c === game.exit.c);
            const showExitEarly = game.hasUpgrade('reveal_exit_temporarily') && game.turn < 5;

            if (isPlayer) {
                // Display player 'P' and the cell content
                if (gridCell.isTrap) {
                    cell.textContent = 'P(X)'; // Player on a trap
                    cell.style.backgroundColor = '#F44336'; // Red for trap
                } else {
                    cell.textContent = 'P(' + (gridCell.adjacentTraps === 0 ? '.' : gridCell.adjacentTraps) + ')'; // Player on a safe cell
                    cell.style.backgroundColor = '#4CAF50'; // Green for player
                }
            } else if (isExit && (gridCell.isRevealed || showExitEarly)) {
                cell.textContent = 'E';
                cell.style.backgroundColor = '#FFC107'; // Amber for exit
            } else if (gridCell.isRevealed) {
                if (gridCell.isTrap) {
                    cell.textContent = 'X';
                    cell.style.backgroundColor = '#F44336'; // Red for trap
                } else {
                    cell.textContent = gridCell.adjacentTraps === 0 ? '' : gridCell.adjacentTraps;
                    cell.style.backgroundColor = '#9E9E9E'; // Grey for revealed safe cell
                }
            } else {
                cell.textContent = '';
                cell.style.backgroundColor = '#616161'; // Dark grey for unrevealed
            }
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    gameGridDiv.appendChild(table);
}

} // End of browser-specific functions block

// --- ゲーム本体 ---
const game = {
  grid: [],
  rows: 8,
  cols: 8,
  player: { r: 0, c: 0, upgrades: [] },
  exit: { r: 0, c: 0 },
  floorNumber: 1,
  turn: 0,
  gameState: 'playing', // playing, choosing_upgrade, jumping_direction
  isGameOver: false,
  dowsingRodUsedThisFloor: false,
  longJumpUsedThisFloor: false,
  undoMoveUsedThisFloor: false, // NEW: 時の砂の使用状況
  savedPlayerState: null,       // NEW: 直前のプレイヤー位置
  savedGridRevealedState: null, // NEW: 直前の盤面の表示状態
  currentUpgradeChoices: [],    // NEW: 現在表示されているアップグレードの選択肢

  hasUpgrade: function(upgradeId) {
    return this.player.upgrades.includes(upgradeId);
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
    this.undoMoveUsedThisFloor = false; // NEW: リセット
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

      // 生成された盤面が解けるかチェック
      solvable = this.isSolvable(this.player.r, this.player.c, this.exit.r, this.exit.c, this.grid);
      if (!solvable) {
        // print("Generated unsolvable board, regenerating..."); // デバッグ用
      }
    } while (!solvable);

    if (this.hasUpgrade('reveal_one_trap')) {
      const trapLocations = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c].isTrap) {
            trapLocations.push({r, c});
          }
        }
      }
      
      if (trapLocations.length > 0) {
        const randomTrap = trapLocations[Math.floor(Math.random() * trapLocations.length)];
        this.grid[randomTrap.r][randomTrap.c].isRevealed = true;
      }
      this.player.upgrades = this.player.upgrades.filter(id => id !== 'reveal_one_trap');
    }

    this.revealFrom(this.player.r, this.player.c);
  },

  generateGrid: function() {
    this.grid = Array.from({ length: this.rows }, () => 
      Array.from({ length: this.cols }, () => ({ isTrap: false, isRevealed: false, adjacentTraps: 0 }))
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

    displayGrid: function() {
    clear();
    if (!isNodeEnv) { // Render to DOM only in browser
        renderGridToDom();
    }
    print(`--- Floor: ${this.floorNumber} ---`);
    print(`Upgrades: ${this.player.upgrades.map(id => UPGRADES[id].name).join(', ') || 'None'}`);
    if (isNodeEnv) { // Only print grid string in Node.js
        for (let r = 0; r < this.rows; r++) {
            let rowStr = '';
            for (let c = 0; c < this.cols; c++) {
                const isExit = r === this.exit.r && c === this.exit.c;
                const showExitEarly = this.hasUpgrade('reveal_exit_temporarily') && this.turn < 5;

                if (r === this.player.r && c === this.player.c) {
                    const cell = this.grid[r][c];
                    if (cell.isTrap) rowStr += 'P(X)';
                    else if (cell.adjacentTraps === 0) rowStr += 'P(.)';
                    else rowStr += `P(${cell.adjacentTraps})`;
                } else if (isExit && (this.grid[r][c].isRevealed || showExitEarly)) {
                    rowStr += ' E ';
                }
                else {
                    const cell = this.grid[r][c];
                    if (cell.isRevealed) {
                        if (cell.isTrap) rowStr += ' X ';
                        else if (cell.adjacentTraps === 0) rowStr += ' . ';
                        else rowStr += ` ${cell.adjacentTraps} `;
                    }
                    else {
                        rowStr += ' ■ ';
                    }
                }
            }
            print(rowStr);
        }
        print('------------------');
    }
  },

  handleInput: function(key) {
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

        if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
          print(`--- Floor ${this.floorNumber} Cleared! ---\n`);
          this.gameState = 'choosing_upgrade';
          this.showUpgradeScreen();
          return;
        }

        const newCell = this.grid[this.player.r][this.player.c];
        if (newCell.isTrap) {
          if (this.hasUpgrade('trap_shield')) {
            this.player.upgrades = this.player.upgrades.filter(id => id !== 'trap_shield');
            newCell.isTrap = false;
            this.calculateNumbers();
            print('Shield was broken!');
          } else {
            newCell.isRevealed = true;
            this.isGameOver = true;
          }
        }
        this.revealFrom(this.player.r, this.player.c);
      } else {
        print('\n--- Invalid jump direction or out of bounds. Jump wasted. ---\n');
        this.gameState = 'playing';
      }
      this.gameLoop();
      return;
    }

    // アップグレード選択状態の処理
    if (this.gameState === 'choosing_upgrade') {
      const selectedIndex = parseInt(key, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < this.currentUpgradeChoices.length) {
        const chosenId = this.currentUpgradeChoices[selectedIndex];
        this.player.upgrades.push(chosenId);
        print(`\nAcquired: ${UPGRADES[chosenId].name}!`);
      } else {
        print(`\nInvalid choice. No upgrade acquired.\n`);
      }
      setTimeout(() => {
        this.floorNumber++;
        this.setupFloor();
        this.gameLoop();
      }, 2000);
      return; // Important: return after handling upgrade choice
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
        if (this.hasUpgrade('dowsing_rod') && !this.dowsingRodUsedThisFloor) {
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
          print(`
--- Dowsing Rod: ${trapsInVicinity} traps in 3x3 area. ---
`);
        } else {
          print('\n--- Dowsing Rod not available or already used. ---\n');
        }
        this.gameLoop();
        return;
      case 'j': // 跳躍のブーツの使用
        if (this.hasUpgrade('long_jump') && !this.longJumpUsedThisFloor) {
          this.gameState = 'jumping_direction';
          print('\n--- Jump direction (w/a/s/d): ---\n');
        } else {
          print('\n--- Leaping Boots not available or already used. ---\n');
        }
        this.gameLoop();
        return;
      case 'z': // 時の砂の使用
        if (this.hasUpgrade('undo_move') && !this.undoMoveUsedThisFloor) {
          this.undoMoveUsedThisFloor = true;
          this.player.r = this.savedPlayerState.r;
          this.player.c = this.savedPlayerState.c;
          this.grid.forEach((row, r) => row.forEach((cell, c) => cell.isRevealed = this.savedGridRevealedState[r][c]));
          print('\n--- Move undone! ---\n');
        } else {
          print('\n--- Sands of Time not available or already used. ---\n');
        }
        this.gameLoop();
        return;
    }

    if (moved && newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
      this.player.r = newRow;
      this.player.c = newCol;
      this.turn++;

      if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
        print(`--- Floor ${this.floorNumber} Cleared! ---`);
        this.gameState = 'choosing_upgrade';
        this.showUpgradeScreen();
        return;
      }

      const newCell = this.grid[this.player.r][this.player.c];
      if (newCell.isTrap) {
        if (this.hasUpgrade('trap_shield')) {
          this.player.upgrades = this.player.upgrades.filter(id => id !== 'trap_shield');
          newCell.isTrap = false;
          this.calculateNumbers();
          console.log('Shield was broken!');
        } else {
          newCell.isRevealed = true;
          this.isGameOver = true;
          this.gameState = 'gameover';
        }
      }
      this.revealFrom(this.player.r, this.player.c);
    } else if (moved) {
        print('\n--- Cannot move outside the board. ---\n');
    }
    
    if (this.isGameOver) {
      this.displayGrid();
      print("!!! GAME OVER !!!");
      if (isNodeEnv) { rl.close(); }
    } else {
      this.gameLoop();
    }
  },

  showUpgradeScreen: function() {
    this.displayGrid();
    print(`
--- Floor ${this.floorNumber} Cleared! ---
`);

    const upgradeIds = Object.keys(UPGRADES);
    const choices = [];
    while (choices.length < 3 && choices.length < upgradeIds.length) {
      const randomId = upgradeIds[Math.floor(Math.random() * upgradeIds.length)];
      if (!choices.includes(randomId)) {
        choices.push(randomId);
      }
    }

    this.currentUpgradeChoices = choices; // Store choices

    print('Choose your upgrade:');
    choices.forEach((id, index) => {
      print(`${index + 1}: ${UPGRADES[id].name} - ${UPGRADES[id].description}`);
    });
    print('');

    prompt('Enter number (1-3): ');
  },

  gameLoop: function() {
    if (this.gameState === 'playing') {
      this.displayGrid();
      
      let promptText = 'Move (w/a/s/d)';
      const actions = [];
      if (this.hasUpgrade('dowsing_rod') && !this.dowsingRodUsedThisFloor) {
        actions.push(`u: ${UPGRADES['dowsing_rod'].name}`);
      }
      if (this.hasUpgrade('long_jump') && !this.longJumpUsedThisFloor) {
        actions.push(`j: ${UPGRADES['long_jump'].name}`);
      }
      if (this.hasUpgrade('undo_move') && !this.undoMoveUsedThisFloor) {
        actions.push(`z: ${UPGRADES['undo_move'].name}`);
      }

      if (actions.length > 0) {
        promptText += ` | ${actions.join(' | ')}`;
      }
      promptText += ' | q: quit > ';

      prompt(promptText, (input) => {
        if (input.toLowerCase() === 'q') this.isGameOver = true;
        this.handleInput(input);
      });
    }
  }
};

// ゲームを初期化してループを開始
if (isNodeEnv) {
  game.setupFloor();
  game.gameLoop();
}