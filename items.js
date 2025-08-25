import { getEightDirectionsNeighbors, getLineCells, isValidCell, forEachCell } from './utils.js';

export const ITEMS = {
  // 通常アイテム (F1+)
  reveal_one_trap: {
    name: '千里眼の巻物',
    description: 'プレイヤーの周囲8マスにある罠をすべて明らかにする。',
    key: 'r',
    minFloor: 1,
    maxFloor: Infinity,
    use: function(game) {
      const neighborsToReveal = getEightDirectionsNeighbors(game.player.r, game.player.c, game.rows, game.cols);
      for (const neighbor of neighborsToReveal) {
        const cell = game.grid[neighbor.r][neighbor.c];
        if (cell.isTrap) {
          cell.isRevealed = true;
          cell.isFlagged = true; // Mark revealed trap
        } else {
          game.revealFrom(neighbor.r, neighbor.c);
        }
      }
      return { consumed: true };
    }
  },
  trap_shield: {
    name: '鉄の心臓',
    description: '罠を踏んだ時に1度だけ身代わりになる。(パッシブ)',
    key: null,
    minFloor: 1,
    maxFloor: Infinity
  },
  reduce_traps: {
    name: '解体の手引き',
    description: 'ランダムな罠1つを無効化する。',
    key: 't',
    minFloor: 1,
    maxFloor: 10,
    use: function(game) {
      const neighborsForTrapCheck = getEightDirectionsNeighbors(game.player.r, game.player.c, game.rows, game.cols);
      const trapsInVicinity = neighborsForTrapCheck.filter(cellPos => game.grid[cellPos.r][cellPos.c].isTrap);

      if (trapsInVicinity.length > 0) {
        const trapToDemolish = trapsInVicinity[Math.floor(Math.random() * trapsInVicinity.length)];
        const cellToClear = game.grid[trapToDemolish.r][trapToDemolish.c];
        cellToClear.isTrap = false;
        cellToClear.isFlagged = false; // 罠と同時にフラグも解除
        game.calculateNumbers();
      }
      return { consumed: true };
    }
  },
  reveal_exit: {
    name: '出口の地図',
    description: '現在のフロアの出口(E)の位置を明らかにする。',
    key: 'e',
    minFloor: 1,
    maxFloor: 8,
    use: function(game) {
      if (!game.exitRevealedThisFloor) {
        game.exitRevealedThisFloor = true;
        return { consumed: true };
      }
      return { consumed: false, message: '出口はすでに判明している。' };
    }
  },
  long_jump: {
    name: '跳躍のブーツ',
    description: '指定した方向に1マス飛び越えて、2マス先に進む。',
    key: 'j',
    minFloor: 1,
    maxFloor: Infinity,
    use: function(game) {
      game.gameState = 'jumping_direction';
      return { consumed: false };
    }
  },
  // 拡張アイテム (F5+)
  recon_drone: {
    name: '偵察ドローン',
    description: '使用時、上下左右のいずれかの方向を指定する。ドローンがその方向へ一直線に飛び、通路（数字が書かれたマス）を次々と開示していく。もし進路上に罠があった場合、その罠を開示して停止する。',
    key: 'c',
    minFloor: 5,
    maxFloor: Infinity,
    use: function(game) {
      game.gameState = 'recon_direction';
      return { consumed: false };
    }
  },
  ariadnes_thread: {
    name: 'アリアドネの糸',
    description: '使用すると、プレイヤーから出口までの「最短経路」がマップ上に示される。経路上のマスはすべて開示されるが、そこにある罠もすべて表示される。',
    key: 'g',
    minFloor: 5,
    maxFloor: Infinity,
    use: function(game) {
      const path = getLineCells(game.player.r, game.player.c, game.exit.r, game.exit.c);
      if (path && path.length > 0) {
        path.forEach(pos => {
          const cell = game.grid[pos.r][pos.c];
          cell.isRevealed = true;
          if (cell.isTrap) {
            cell.isFlagged = true; // Mark revealed trap
          } else {
            cell.isFlagged = false;
          }
        });
      }
      return { consumed: true };
    }
  },
  detailed_map_of_exit: {
    name: '詳細な出口の地図',
    description: '出口の位置を明らかにすると同時に、出口に隣接する周囲8マスの状態もすべて開示する。',
    key: 'x',
    minFloor: 5,
    maxFloor: Infinity,
    use: function(game) {
      const cellsToReveal = getEightDirectionsNeighbors(game.exit.r, game.exit.c, game.rows, game.cols);
      cellsToReveal.push({ r: game.exit.r, c: game.exit.c });

      // これから開示しようとするマスの中に、まだ開示されていないマスがあるかチェック
      const hasUnrevealedCell = cellsToReveal.some(pos => 
        isValidCell(pos.r, pos.c, game.rows, game.cols) && !game.grid[pos.r][pos.c].isRevealed
      );

      if (hasUnrevealedCell) {
        game.exitRevealedThisFloor = true; // 出口の位置は判明済みにする
        for (const pos of cellsToReveal) {
          // revealFromは内部でisRevealedチェックをするので、そのまま呼んでもOK
          //念のためisValidCellも実行
          if (isValidCell(pos.r, pos.c, game.rows, game.cols)) {
            game.revealFrom(pos.r, pos.c);
          }
        }
        return { consumed: true };
      } else {
        // 開示する新しいマスが何もない場合
        return { consumed: false, message: '出口の周囲はすべて判明している。' };
      }
    }
  },
  // 上位アイテム (F10+)
  philosophers_stone: {
    name: '賢者の石',
    description: '使用すると、プレイヤーの周囲5x5の広大な範囲を一度に開示する。',
    key: 'p',
    minFloor: 10,
    maxFloor: Infinity,
    use: function(game) {
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const nR = game.player.r + i;
          const nC = game.player.c + j;
          if (isValidCell(nR, nC, game.rows, game.cols)) {
            game.revealFrom(nR, nC);
          }
        }
      }
      return { consumed: true };
    }
  },
  scroll_of_chaos: {
    name: '無秩序の巻物',
    description: '使用すると、まだ開示もフラグもされていない全てのマスで、罠の配置をシャッフル（再配置）する。罠の総数は変わらない。',
    key: 'k',
    minFloor: 10,
    maxFloor: Infinity,
    use: function(game) {
      // 1. 出口とアイテムマスの隣接マスを「罠配置禁止ゾーン」として定義
      const protectedCells = [];
      forEachCell(game.grid, (cell, r, c) => {
        if ((r === game.exit.r && c === game.exit.c) || cell.hasItem) {
          protectedCells.push({ r, c });
        }
      });

      const forbiddenZones = new Set();
      protectedCells.forEach(pos => {
        // 自分自身も禁止ゾーンに含める
        forbiddenZones.add(`${pos.r},${pos.c}`);
        // 隣接マスを禁止ゾーンに追加
        const neighbors = getEightDirectionsNeighbors(pos.r, pos.c, game.rows, game.cols);
        neighbors.forEach(n => forbiddenZones.add(`${n.r},${n.c}`));
      });

      // 2. シャッフル対象のセルを決定
      const shufflableCells = [];
      let trapCountToShuffle = 0;
      forEachCell(game.grid, (cell, r, c) => {
        if (!cell.isRevealed && !cell.isFlagged && !forbiddenZones.has(`${r},${c}`)) {
          shufflableCells.push(cell);
          if (cell.isTrap) {
            trapCountToShuffle++;
            cell.isTrap = false; // 一旦すべての罠をクリア
          }
        }
      });

      // 3. シャッフル実行 (Fisher-Yates shuffle)
      for (let i = shufflableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shufflableCells[i], shufflableCells[j]] = [shufflableCells[j], shufflableCells[i]];
      }

      // 4. 新しい位置に罠を配置
      for (let i = 0; i < trapCountToShuffle; i++) {
        shufflableCells[i].isTrap = true;
      }

      // 5. 盤面を更新
      game.calculateNumbers();
      return { consumed: true };
    }
  },
};