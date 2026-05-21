# AI Companion Chat App

HTML/CSS/JSで作られた、シンプルでモダンなAIコンパニオンチャットアプリです。
GoogleのGemini APIを使用してリアルタイムに対話ができます。

## 特徴

- **完全にサーバーレス**: GitHub Pagesなどで静的ファイルとして公開可能です。
- **プライバシー配慮**: APIキーはブラウザの `localStorage` にのみ保存され、サーバーに送信されることはありません。
- **レスポンシブデザイン**: PCでもスマートフォンでも快適に利用できます。
- **文脈の維持**: 過去のやり取りを記憶し、スムーズな会話が可能です。

## セットアップ方法

1.  このリポジトリをクローンまたはダウンロードします。
2.  `index.html` をブラウザで開くか、GitHub Pagesで公開します。
3.  [Google AI Studio](https://aistudio.google.com/app/apikey) でGemini APIキーを取得します。
4.  アプリ右上の設定ボタン（⚙️）をクリックし、APIキーを入力して保存します。

## GitHub Pagesへの公開方法

1.  GitHubに新しいリポジトリを作成します。
2.  このリポジトリのファイルをプッシュします。
3.  リポジトリの `Settings` > `Pages` に移動します。
4.  `Build and deployment` > `Source` で `Deploy from a branch` を選択し、`main` ブランチを保存します。
5.  数分後に公開URLにアクセス可能になります。

## 技術スタック

- HTML5
- CSS3 (Vanilla CSS)
- JavaScript (ES6+, Fetch API)
- Google Gemini API (gemini-1.5-flash)
