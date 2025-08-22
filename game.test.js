
import { game, initializeGame } from './game.js';
import { ITEMS } from './items.js';

// JestではESMのモックが少し複雑なため、utils.jsは一旦そのまま利用します。
// import * as utils from './utils.js';
// jest.mock('./utils.js');

describe('game', () => {

  // 各テストの前にゲームの状態を初期化する
  beforeEach(() => {
    initializeGame();
  });

  test('should initialize with default values', () => {
    expect(game.floorNumber).toBe(1);
    expect(game.turn).toBe(0);
    expect(game.gameState).toBe('playing');
    expect(game.grid).toEqual([]); // 初期状態は空
  });

  test('hasItem should return true if player has the item', () => {
    game.player.items = ['trap_shield'];
    expect(game.hasItem('trap_shield')).toBe(true);
  });

  test('hasItem should return false if player does not have the item', () => {
    game.player.items = [];
    expect(game.hasItem('trap_shield')).toBe(false);
  });

  describe('setupFloor', () => {
    test('should generate a grid with correct dimensions', () => {
      game.setupFloor();
      expect(game.grid.length).toBe(game.rows);
      expect(game.grid[0].length).toBe(game.cols);
    });

    test('should place player, exit, and traps', () => {
      game.setupFloor();
      
      let trapCount = 0;
      let itemCount = 0;
      game.grid.forEach(row => {
        row.forEach(cell => {
          if (cell.isTrap) trapCount++;
          if (cell.hasItem) itemCount++;
        });
      });

      expect(trapCount).toBeGreaterThan(0);
      // アイテムが2つ配置されることを確認
      expect(itemCount).toBe(2); 
      
      // プレイヤーと出口がグリッド内に存在することを確認
      expect(game.player.r).toBeGreaterThanOrEqual(0);
      expect(game.player.c).toBeGreaterThanOrEqual(0);
      expect(game.exit.r).toBeGreaterThanOrEqual(0);
      expect(game.exit.c).toBeGreaterThanOrEqual(0);
    });
  });

  // TODO: handleInputや他のロジックのテストを追加
  // 例:
  // - プレイヤーが移動できること
  // - 罠を踏んだらゲームオーバーになること
  // - アイテムを正しく使用できること
});
