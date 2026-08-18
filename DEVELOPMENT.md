# 開発者向けドキュメント

デプロイ手順やレイアウトパターンの設計方針など、利用者には不要な開発向けの情報をまとめています。
(利用者向けの説明は [README.md](README.md) を参照)

## GitHub Pagesへのデプロイ手順

1. このリポジトリをGitHubにpush(ブランチ名は `main`)
2. GitHubリポジトリの **Settings → Pages** を開く
3. **Build and deployment → Source** を **GitHub Actions** に設定
4. `main` ブランチにpushすると、同梱のワークフロー(`.github/workflows/deploy.yml`)が
   自動的に `public/` の内容をビルド・デプロイする(Actionsタブから手動実行も可能)
5. デプロイ完了後、Settings → Pages に表示されるURLでアプリにアクセスできる

## ローカルで動作確認する

```bash
cd public
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開く(`Ctrl+C`で停止)。

## ファイル構成

```
collage-maker/
├── README.md
├── ignore/                    # gitignore対象
├── .github/workflows/deploy.yml
└── public/                    # GitHub Pagesで公開するディレクトリ
    ├── index.html
    ├── .nojekyll
    ├── css/style.css
    └── js/
        ├── main.js            # 状態管理・画面の結線
        ├── imageManager.js    # 画像の追加・削除・並び替え
        ├── layouts.js         # 枚数(1〜15枚)ごとのレイアウトパターン
        ├── cellEditor.js      # セル内のドラッグ&ズームでトリミング範囲を決定
        └── exporter.js        # Canvasへの描画とPNG/JPEG書き出し
```

## レイアウトパターンの設計方針

キャンバスが9:16の縦長であることを踏まえ、行ごとに列数を変えることで見た目にバラエティを
持たせつつ、各セルの面積(行の高さ ÷ 行内の列数)がおおむね均等になるように設計。

3:2などの横長(landscape)写真をなるべくそのまま活かせるよう、セルの実ピクセルアスペクト比
(幅÷高さ)が極端にならないよう制限している。

- セルが縦長すぎる(幅が狭い)と `object-fit: cover` のトリミングで写真の左右が大きく
  失われるため、縦長側の許容範囲は狭めに設定
- セルが横長な場合は上下が失われるだけで済み実害が小さいため、横長側の許容範囲は広めに設定
  (=同じ「極端」でも縦長より横長を優先)
- この範囲内で使える列数だけを使って枚数を行分割し、行の並び順を変えたバリエーションを
  用意することで、パターン数を増やしている(枚数によって1〜6種類)

詳細な計算式・許容範囲は `public/js/layouts.js` 冒頭のコメントと `ROW_PATTERNS` を参照。
