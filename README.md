いますぐプレイ！ [NumDun をブラウザで遊ぶ](https://inajob.github.io/numdun/)

Play now! [Play NumDun in your browser](https://inajob.github.io/numdun/)


![NumDun Game Screenshot](imgs/cover.png)

# NumDun

## Gemini CLI と共に創られたゲーム

English explanation is available below.

この「NumDun」は、マインスイーパのロジックとローグライトの要素を組み合わせた、ミニマルなパズルゲームです。プレイヤーは数字のヒントを頼りに罠を避け、自動生成されるダンジョンからの脱出を目指します。

しかし、このプロジェクトの真の価値は、その開発プロセスにあります。本ゲームは、Google Gemini CLI との対話を通じて、インタラクティブに開発されました。

Gemini CLI は、以下のような様々なソフトウェアエンジニアリングタスクにおいて、強力なアシスタントとして機能しました。

*   **機能追加**: スマートフォン対応、アイテムボーナスロジックの導入など、新しいゲームメカニクスの実装。
*   **バグ修正**: ジャンプ移動の不具合、レイアウトのずれなどの問題解決。
*   **リファクタリング**: コードの整理と最適化。
*   **ドキュメント更新**: ゲーム仕様やOGPタグの追加・修正。

## 自由にフォークして改造してください！

このプロジェクトは、Gemini CLI の活用例として、また、インタラクティブな開発の可能性を示すものとして公開されています。

ぜひこのリポジトリをフォークし、自由にコードを改造したり、新しい機能を追加したりしてみてください。あなた自身のプロジェクトで Gemini CLI を活用する際の参考になれば幸いです。

## ゲームコンセプト

*   **ジャンル**: ロジックパズル、ローグライト
*   **コアメカニクス**: マインスイーパの数字ヒントを基に、罠を避けながら出口を目指す。
*   **特徴**: 自動生成ダンジョン、ラン中の成長、シンプルなUI。

## 実行方法

ブラウザのセキュリティ制限（CORS）により、`index.html` を直接開くとJavaScriptモジュールが読み込めない場合があります。そのため、ローカルWebサーバーを介してアクセスする必要があります。

以下のいずれかの方法でローカルサーバーを起動し、ブラウザで `http://localhost:8000` (または表示されるアドレス) にアクセスしてください。

### Python を使用する場合 (推奨)

Pythonがインストールされている環境であれば、以下のコマンドで簡単にローカルサーバーを起動できます。

1.  プロジェクトのルートディレクトリに移動します。
    ```bash
    cd /path/to/minigame-gemini
    ```
2.  以下のコマンドを実行します。
    ```bash
    python -m http.server
    ```
3.  ブラウザで `http://localhost:8000` にアクセスします。

### Node.js を使用する場合 (npm がインストールされている場合)

`serve` パッケージをインストールして使用することもできます。

1.  プロジェクトのルートディレクトリに移動します。
    ```bash
    cd /path/to/minigame-gemini
    ```
2.  `serve` パッケージをインストールします (初回のみ)。
    ```bash
    npm install -g serve
    ```
3.  以下のコマンドを実行します。
    ```bash
    serve .
    ```
4.  ブラウザで表示されるアドレスにアクセスします。

## 使用技術

*   JavaScript (Webブラウザ環境)

---

Play now! [Play NumDun in your browser](https://inajob.github.io/numdun/)

# NumDun

## A Game Created with Gemini CLI

"NumDun" is a minimalist puzzle game that combines Minesweeper logic with roguelite elements. Players rely on numerical hints to avoid traps and aim to escape from an automatically generated dungeon.

However, the true value of this project lies in its development process. This game was interactively developed through dialogue with the Google Gemini CLI.

Gemini CLI served as a powerful assistant in various software engineering tasks, including:

*   **Feature Addition**: Implementing new game mechanics such as smartphone compatibility and item bonus logic.
*   **Bug Fixing**: Resolving issues like jump movement glitches and layout discrepancies.
*   **Refactoring**: Organizing and optimizing code.
*   **Documentation Updates**: Adding and modifying game specifications and OGP tags.

## Feel Free to Fork and Modify!

This project is released as an example of how to utilize Gemini CLI and to demonstrate the potential of interactive development.

Feel free to fork this repository, modify the code, and add new features. We hope it serves as a reference for when you utilize Gemini CLI in your own projects.

## Game Concept

*   **Genre**: Logic Puzzle, Roguelite
*   **Core Mechanics**: Based on Minesweeper's numerical hints, avoid traps and aim for the exit.
*   **Features**: Automatically generated dungeons, in-run progression, simple UI.

## How to Run

Due to browser security restrictions (CORS), directly opening `index.html` may prevent JavaScript modules from loading. Therefore, you need to access it via a local web server.

Start a local server using one of the methods below and access `http://localhost:8000` (or the displayed address) in your browser.

### Using Python (Recommended)

If you have Python installed, you can easily start a local server with the following command:

1.  Navigate to the project's root directory.
    ```bash
    cd /path/to/minigame-gemini
    ```
2.  Run the following command:
    ```bash
    python -m http.server
    ```
3.  Access `http://localhost:8000` in your browser.

### Using Node.js (If npm is installed)

You can also install and use the `serve` package.

1.  Navigate to the project's root directory.
    ```bash
    cd /path/to/minigame-gemini
    ```
2.  Install the `serve` package (first time only).
    ```bash
    npm install -g serve
    ```
3.  Run the following command:
    ```bash
    serve .
    ```
4.  Access the address displayed in your browser.

## Technologies Used

*   JavaScript (Web browser environment)