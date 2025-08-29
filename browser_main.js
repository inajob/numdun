// browser_main.js
import { game, initializeGame } from './game.js';
import { initBrowserGame } from './browser_io.js';

async function main() {
    // 1. 言語を決定する (ローカルストレージ > ブラウザのデフォルト > 'en')
    const savedLang = localStorage.getItem('numdun-lang');
    const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
    const lang = savedLang || browserLang;

    // 2. 対応する言語ファイルを読み込む
    const { [lang]: t } = await import(`./locales/${lang}.js`);

    // 3. 選択された言語でゲームを初期化する
    initializeGame();
    initBrowserGame(game, initializeGame, t, lang); // 現在の言語コードを渡す

    // 4. 言語スイッチャーのUIをセットアップする
    document.querySelectorAll('.lang-switcher').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = e.target.dataset.lang;
            if (selectedLang) {
                localStorage.setItem('numdun-lang', selectedLang);
                location.reload();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', main);