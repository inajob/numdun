// 日本語のテキストリソース
export const ja = {
  // Common
  close: "閉じる",
  cancel: "キャンセル",
  yes: "はい",
  no: "いいえ",
  // Main UI
  inventory: "Item",
  // Status
  floor: "階層",
  items: "Items",
  none: "なし",
  revelationRate: "開示率",
  revelationAchieved: "達成",
  revelationNotAchieved: "未達成",
  viewDetails: "の詳細を見る",
  // Screens & Dialogs
  useItemTitle: "アイテムを使用",
  floorClearedPrompt: "フロアクリア！報酬を選択してください：",
  gameOverTitle: "ゲームオーバー",
  finalFloor: "最終到達フロア",
  heldItems: "所持アイテム",
  floorRevelationRates: "各フロアの開示率",
  playAgain: "もう一度プレイ",
  nextFloorPrompt: "次のフロアに進みますか？",
  // Notifications
  noUsableItems: "使用できるアイテムがありません。",
  itemAcquired: "アイテム獲得:",
  bonusLostMessage: "フロア開示率が{0}%未満のため、アイテムボーナスはありませんでした。（{1}%）",
  cantMoveToFlaggedCell: "チェックしたマスには移動できません。",
  trapShieldTriggered: "鉄の心臓が身代わりになった！",
  trapTriggered: "罠を踏んでしまった！",
  reconDroneCancelled: "偵察ドローンの使用をキャンセルしました。",
  longJumpCancelled: "跳躍のブーツの使用をキャンセルしました。",
  // Tutorials
  tutorialObscuredCellTitle: "新ギミック：見通しの悪いマス",
  tutorialObscuredCellContent: `このフロアから、ひび割れた「見通しの悪いマス」が登場します。

このマスに表示される数字は、そのマスの「上下左右」4方向にある罠の数のみを示しており、「斜め」方向の罠はカウントしません。

開示して初めて判明するため、注意深く探索しましょう。`,
  // Items
  item_reveal_one_trap_name: "千里眼の巻物",
  item_reveal_one_trap_desc: "プレイヤーの周囲8マスにある罠をすべて明らかにする。",
  item_trap_shield_name: "鉄の心臓",
  item_trap_shield_desc: "罠を踏んだ時に1度だけ身代わりになる。(パッシブ)",
  item_reduce_traps_name: "解体の手引き",
  item_reduce_traps_desc: "プレイヤーの周囲8マスにあるランダムな罠を1つ無効化する。",
  item_reveal_exit_name: "出口の地図",
  item_reveal_exit_desc: "現在のフロアの出口(E)の位置を明らかにする。",
  item_reveal_exit_already_known: "出口はすでに判明している。",
  item_long_jump_name: "跳躍のブーツ",
  item_long_jump_desc: "指定した方向に1マス飛び越えて、2マス先に進む。",
  item_recon_drone_name: "偵察ドローン",
  item_recon_drone_desc: "指定した方向へ一直線に飛び、通路を開示する。罠にぶつかると停止する。",
  item_ariadnes_thread_name: "アリアドネの糸",
  item_ariadnes_thread_desc: "プレイヤーから出口までの最短経路をマップ上に示し、開示する。",
  item_detailed_map_of_exit_name: "詳細な出口の地図",
  item_detailed_map_of_exit_desc: "出口の位置と、その周囲8マスをすべて開示する。",
  item_detailed_map_of_exit_already_known: "出口はすでに判明している。",
  item_philosophers_stone_name: "賢者の石",
  item_philosophers_stone_desc: "プレイヤーの周囲5x5の広大な範囲を一度に開示する。",
  item_scroll_of_chaos_name: "無秩序の巻物",
  item_scroll_of_chaos_desc: "未開示・未チェックのマスで、罠の配置をシャッフルする。",
};