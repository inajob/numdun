import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initBrowserGame } from './browser_io.js';

// ESM環境で__dirnameの代わり
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTMLファイルを読み込み、DOMをセットアップ
const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

describe('browser_io with Dependency Injection', () => {
  let mockGame;
  let mockInitializeGame;
  let mockDisplayState;

  beforeEach(() => {
    // DOMをリセット
    document.body.innerHTML = html;

    // モック関数とモックオブジェクトを作成
    mockInitializeGame = jest.fn();
    mockGame = {
      getDisplayState: jest.fn(),
      handleInput: jest.fn(),
      gameLoop: jest.fn(),
      toggleFlag: jest.fn(),
      clearLastActionMessage: jest.fn(),
      clearUiEffect: jest.fn(),
      clearJustAcquiredItem: jest.fn(),
      calculateRevelationRate: jest.fn(),
      setupFloor: jest.fn(),
      player: { items: [] },
      gameState: 'playing',
      REVELATION_THRESHOLD: 0.5,
    };

    // モックのデフォルトの戻り値を設定
    mockDisplayState = {
      grid: [
        [{ isRevealed: true, adjacentTraps: 1, isTrap: false, hasItem: false, isFlagged: false }, { isRevealed: false, isFlagged: false, isTrap: false, hasItem: false }],
        [{ isRevealed: false, isFlagged: true, isTrap: false, hasItem: false }, { isRevealed: true, adjacentTraps: 0, isTrap: false, hasItem: false }],
      ],
      player: { r: 0, c: 0 },
      exit: { r: 1, c: 1 },
      items: [],
      floorNumber: 1,
      exitRevealedThisFloor: false,
    };
    mockGame.getDisplayState.mockReturnValue(mockDisplayState);
    mockGame.gameLoop.mockReturnValue({ 
        displayState: mockDisplayState, 
        gameState: 'playing' 
    });
    mockGame.calculateRevelationRate.mockReturnValue(0.6);
  });

  test('initBrowserGame should set up the game and event listeners', () => {
    // Act: モックを注入してゲームを初期化
    initBrowserGame(mockGame, mockInitializeGame);

    // Assert: ゲームのセットアップ関数が呼ばれたことを確認
    expect(mockGame.setupFloor).toHaveBeenCalledTimes(1);

    // Assert: リセットボタンをクリックすると、モック関数が呼ばれるか
    const resetButton = document.getElementById('btn-reset');
    expect(resetButton).not.toBeNull();
    resetButton.click();

    expect(mockInitializeGame).toHaveBeenCalledTimes(1);
    // リセット後にもう一度setupFloorが呼ばれるので、合計2回
    expect(mockGame.setupFloor).toHaveBeenCalledTimes(2);
  });

  test('keyboard input should call handleInput on the game instance', () => {
    // Arrange
    initBrowserGame(mockGame, mockInitializeGame);

    // Act: 'd'キーの押下をシミュレート
    const event = new KeyboardEvent('keydown', { key: 'd' });
    document.dispatchEvent(event);

    // Assert: 対応するゲーム入力関数が呼ばれたか
    expect(mockGame.handleInput).toHaveBeenCalledWith('d');
  });

  test('grid cell click should call toggleFlag', () => {
    // Arrange
    // runBrowserGameLoopを一度実行してグリッドを描画させる
    mockGame.gameLoop.mockReturnValueOnce({ displayState: mockDisplayState, gameState: 'playing' });
    initBrowserGame(mockGame, mockInitializeGame);

    // Act: 2番目のセル（フラグが立っていない）をクリック
    const cell = document.querySelectorAll('.game-cell')[1];
    cell.click();

    // Assert: toggleFlagが正しい座標(r=0, c=1)で呼ばれたか
    expect(mockGame.toggleFlag).toHaveBeenCalledWith(0, 1);
  });
});