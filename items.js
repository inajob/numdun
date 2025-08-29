import { getEightDirectionsNeighbors, getLineCells, isValidCell, forEachCell } from './utils.js';

export const ITEMS = {
  // 通常アイテム (F1+)
  reveal_one_trap: {
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
    key: null,
    minFloor: 1,
    maxFloor: Infinity
  },
  reduce_traps: {
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
    key: 'e',
    minFloor: 1,
    maxFloor: 8,
    use: function(game) {
      if (!game.exitRevealedThisFloor) {
        game.exitRevealedThisFloor = true;
        return { consumed: true };
      }
      return { consumed: false, messageKey: 'item_reveal_exit_already_known' };
    }
  },
  long_jump: {
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
    key: 'c',
    minFloor: 5,
    maxFloor: Infinity,
    use: function(game) {
      game.gameState = 'recon_direction';
      return { consumed: false };
    }
  },
  ariadnes_thread: {
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
    key: 'x',
    minFloor: 5,
    maxFloor: Infinity,
    use: function(game) {
      const cellsToReveal = getEightDirectionsNeighbors(game.exit.r, game.exit.c, game.rows, game.cols);
      cellsToReveal.push({ r: game.exit.r, c: game.exit.c });

      const hasUnrevealedCell = cellsToReveal.some(pos => 
        isValidCell(pos.r, pos.c, game.rows, game.cols) && !game.grid[pos.r][pos.c].isRevealed
      );

      if (hasUnrevealedCell) {
        game.exitRevealedThisFloor = true; 
        for (const pos of cellsToReveal) {
          if (isValidCell(pos.r, pos.c, game.rows, game.cols)) {
            game.revealFrom(pos.r, pos.c);
          }
        }
        return { consumed: true };
      } else {
        return { consumed: false, messageKey: 'item_detailed_map_of_exit_already_known' };
      }
    }
  },
  // 上位アイテム (F10+)
  philosophers_stone: {
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
    key: 'k',
    minFloor: 10,
    maxFloor: Infinity,
    use: function(game) {
      const protectedCells = [];
      forEachCell(game.grid, (cell, r, c) => {
        if ((r === game.exit.r && c === game.exit.c) || cell.hasItem) {
          protectedCells.push({ r, c });
        }
      });

      const forbiddenZones = new Set();
      protectedCells.forEach(pos => {
        forbiddenZones.add(`${pos.r},${pos.c}`);
        const neighbors = getEightDirectionsNeighbors(pos.r, pos.c, game.rows, game.cols);
        neighbors.forEach(n => forbiddenZones.add(`${n.r},${n.c}`));
      });

      const shufflableCells = [];
      let trapCountToShuffle = 0;
      forEachCell(game.grid, (cell, r, c) => {
        if (!cell.isRevealed && !cell.isFlagged && !forbiddenZones.has(`${r},${c}`)) {
          shufflableCells.push(cell);
          if (cell.isTrap) {
            trapCountToShuffle++;
            cell.isTrap = false; 
          }
        }
      });

      for (let i = shufflableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shufflableCells[i], shufflableCells[j]] = [shufflableCells[j], shufflableCells[i]];
      }

      for (let i = 0; i < trapCountToShuffle; i++) {
        shufflableCells[i].isTrap = true;
      }

      game.calculateNumbers();
      return { consumed: true };
    }
  },
};