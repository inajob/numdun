export function getLineCells(r0, c0, r1, c1) {
  const cells = [];
  const dc = Math.abs(c1 - c0);
  const dr = -Math.abs(r1 - r0);
  const sc = c0 < c1 ? 1 : -1;
  const sr = r0 < r1 ? 1 : -1;
  let err = dc + dr;

  while (true) {
    cells.push({ r: r0, c: c0 });
    if (r0 === r1 && c0 === c1) break;
    const e2 = 2 * err;
    if (e2 >= dr) {
      err += dr;
      c0 += sc;
    }
    if (e2 <= dc) {
      err += dc;
      r0 += sr;
    }
  }
  return cells;
}

export function isValidCell(r, c, rows, cols) {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

export function getEightDirectionsNeighbors(r, c, rows, cols) {
  const neighbors = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      const nR = r + i;
      const nC = c + j;
      if (isValidCell(nR, nC, rows, cols)) {
        neighbors.push({ r: nR, c: nC });
      }
    }
  }
  return neighbors;
}

export function forEachCell(grid, callback) {
  const rows = grid.length;
  if (rows === 0) return;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      callback(grid[r][c], r, c);
    }
  }
}

export function isSolvable(grid, startR, startC, endR, endC) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [{ r: startR, c: startC }];

  if (!isValidCell(startR, startC, rows, cols) || grid[startR][startC].isTrap) return false;
  if (!isValidCell(endR, endC, rows, cols) || grid[endR][endC].isTrap) return false;

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

      if (isValidCell(nr, nc, rows, cols) && !visited[nr][nc] && !grid[nr][nc].isTrap) {
        visited[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
  }
  return false;
}

export function isGoalInitiallyVisible(grid, startR, startC, exitR, exitC) {
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

        const neighbors = getEightDirectionsNeighbors(r, c, rows, cols);
        if (neighbors.some(n => n.r === exitR && n.c === exitC)) {
            return true; // Exit is visible!
        }

        if (grid[r][c].adjacentTraps > 0 && !(r === startR && c === startC)) {
            continue;
        }

        for (let i = 0; i < 8; i++) { // Check all 8 neighbors for cascade
            const nr = r + dr[i];
            const nc = c + dc[i];

            if (isValidCell(nr, nc, rows, cols) && !visited[nr][nc] && !grid[nr][nc].isTrap) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
            }
        }
    }
    return false; // Exit is not visible
}
