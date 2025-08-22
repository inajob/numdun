
import { jest } from '@jest/globals';
import {
  isValidCell,
  getEightDirectionsNeighbors,
  forEachCell,
  isSolvable,
  isGoalInitiallyVisible,
  getLineCells
} from './utils.js';

describe('utils.js', () => {

  describe('isValidCell', () => {
    const rows = 5, cols = 5;
    test('should return true for valid cells', () => {
      expect(isValidCell(0, 0, rows, cols)).toBe(true);
      expect(isValidCell(4, 4, rows, cols)).toBe(true);
      expect(isValidCell(2, 3, rows, cols)).toBe(true);
    });

    test('should return false for invalid cells', () => {
      expect(isValidCell(-1, 0, rows, cols)).toBe(false); // Negative row
      expect(isValidCell(0, -1, rows, cols)).toBe(false); // Negative col
      expect(isValidCell(5, 0, rows, cols)).toBe(false);  // Row out of bounds
      expect(isValidCell(0, 5, rows, cols)).toBe(false);  // Col out of bounds
    });
  });

  describe('getEightDirectionsNeighbors', () => {
    const rows = 3, cols = 3;
    test('should return 8 neighbors for a center cell', () => {
      const neighbors = getEightDirectionsNeighbors(1, 1, rows, cols);
      expect(neighbors.length).toBe(8);
      expect(neighbors).toEqual(expect.arrayContaining([
        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
        { r: 1, c: 0 },                 { r: 1, c: 2 },
        { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 },
      ]));
    });

    test('should return 3 neighbors for a corner cell (0,0)', () => {
      const neighbors = getEightDirectionsNeighbors(0, 0, rows, cols);
      expect(neighbors.length).toBe(3);
      expect(neighbors).toEqual(expect.arrayContaining([
        { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }
      ]));
    });
  });

  describe('forEachCell', () => {
    test('should iterate over every cell in the grid', () => {
      const grid = [[1, 2], [3, 4]];
      const callback = jest.fn();
      forEachCell(grid, callback);

      expect(callback).toHaveBeenCalledTimes(4);
      expect(callback).toHaveBeenCalledWith(1, 0, 0);
      expect(callback).toHaveBeenCalledWith(2, 0, 1);
      expect(callback).toHaveBeenCalledWith(3, 1, 0);
      expect(callback).toHaveBeenCalledWith(4, 1, 1);
    });
  });

  describe('isSolvable', () => {
    const grid = [
      [{ isTrap: false }, { isTrap: true },  { isTrap: false }],
      [{ isTrap: false }, { isTrap: false }, { isTrap: false }],
      [{ isTrap: false }, { isTrap: true },  { isTrap: false }]
    ];

    test('should return true for a solvable path', () => {
      expect(isSolvable(grid, 0, 0, 2, 2)).toBe(true);
    });

    test('should return false for an unsolvable path', () => {
      // Block the only path
      grid[1][1].isTrap = true;
      expect(isSolvable(grid, 0, 0, 2, 2)).toBe(false);
      grid[1][1].isTrap = false; // Reset for other tests
    });

    test('should return false if start or end is a trap', () => {
      expect(isSolvable(grid, 0, 1, 2, 2)).toBe(false);
      expect(isSolvable(grid, 0, 0, 2, 1)).toBe(false);
    });
  });

  describe('getLineCells', () => {
    test('should return correct cells for a horizontal line', () => {
      const cells = getLineCells(1, 1, 1, 4);
      expect(cells).toEqual([{r:1, c:1}, {r:1, c:2}, {r:1, c:3}, {r:1, c:4}]);
    });

    test('should return correct cells for a vertical line', () => {
      const cells = getLineCells(1, 1, 4, 1);
      expect(cells).toEqual([{r:1, c:1}, {r:2, c:1}, {r:3, c:1}, {r:4, c:1}]);
    });

    test('should return correct cells for a diagonal line', () => {
      const cells = getLineCells(0, 0, 3, 3);
      expect(cells).toEqual([{r:0, c:0}, {r:1, c:1}, {r:2, c:2}, {r:3, c:3}]);
    });
  });

});
