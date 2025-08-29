
import { jest } from '@jest/globals';
import { ITEMS } from './items.js';

describe('items.js', () => {
  let mockGame;

  // 各テストの前に、基本的なモックのgameオブジェクトを作成する
  beforeEach(() => {
    mockGame = {
      player: { r: 1, c: 1 },
      rows: 3,
      cols: 3,
      grid: [
        [{isTrap: false}, {isTrap: true}, {isTrap: false}],
        [{isTrap: false}, {isTrap: false}, {isTrap: false}],
        [{isTrap: false}, {isTrap: false}, {isTrap: true}],
      ],
      exit: { r: 2, c: 2 },
      exitRevealedThisFloor: false,
      gameState: 'playing',
      // gameオブジェクトが持つ関数もモックしておく
      revealFrom: jest.fn(),
      calculateNumbers: jest.fn(),
    };
  });

  describe('reveal_one_trap', () => {
    it('should reveal surrounding traps and cells', () => {
      const item = ITEMS.reveal_one_trap;
      item.use(mockGame);

      // 隣接する罠(0,1)が明らかにされ、フラグが立つことを確認
      expect(mockGame.grid[0][1].isRevealed).toBe(true);
      expect(mockGame.grid[0][1].isFlagged).toBe(true);
      
      // 隣接する安全なマスに対してrevealFromが呼ばれることを確認
      // (0,0), (0,2), (1,0), (1,2), (2,0), (2,1) の6マス
      expect(mockGame.revealFrom).toHaveBeenCalledTimes(6);
      expect(mockGame.revealFrom).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('reduce_traps', () => {
    it('should remove the only trap in the vicinity', () => {
        // プレイヤー(1,1)の周囲に罠が(0,1)の一つだけある状態を作る
        mockGame.grid = [
            [{isTrap: false}, {isTrap: true}, {isTrap: false}],
            [{isTrap: false}, {isTrap: false}, {isTrap: false}],
            [{isTrap: false}, {isTrap: false}, {isTrap: false}], // 他の罠は消す
        ];

        const item = ITEMS.reduce_traps;
        item.use(mockGame);

        // 罠が無効化され、calculateNumbersが呼ばれることを確認
        expect(mockGame.grid[0][1].isTrap).toBe(false);
        expect(mockGame.calculateNumbers).toHaveBeenCalledTimes(1);
    });
  });

  describe('reveal_exit', () => {
    const item = ITEMS.reveal_exit;

    it('should reveal the exit and be consumed', () => {
      const result = item.use(mockGame);
      expect(mockGame.exitRevealedThisFloor).toBe(true);
      expect(result.consumed).toBe(true);
    });

    it('should not be consumed if exit is already revealed', () => {
      mockGame.exitRevealedThisFloor = true;
      const result = item.use(mockGame);
      expect(result.consumed).toBe(false);
      expect(result.messageKey).toBe('item_reveal_exit_already_known');
    });
  });

  describe('long_jump', () => {
    it('should change gameState to jumping_direction', () => {
      const item = ITEMS.long_jump;
      const result = item.use(mockGame);
      expect(mockGame.gameState).toBe('jumping_direction');
      expect(result.consumed).toBe(false);
    });
  });

  describe('recon_drone', () => {
    it('should change gameState to recon_direction', () => {
      const item = ITEMS.recon_drone;
      const result = item.use(mockGame);
      expect(mockGame.gameState).toBe('recon_direction');
      expect(result.consumed).toBe(false);
    });
  });

});
