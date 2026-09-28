# Build & Battle

レギュレーション制のキャラクタービルド × 円・直線測距のSRPG風リアルタイム対戦 Web ゲームです。  
**GitHub Pages はビルド不要**で公開できます（`index.html` + `app/` をそのまま配信）。

## 遊び方

1. **部隊作成** — 初心者 / 通常 / 上級のレギュレーションを選び、4体のキャラをビルド
2. **技能とスキル** — チーム総経験値を技能に割り振り（メインLv = 技能Lvの最大値）
3. **ステータスと装備** — 種族初期値＋メインLv分の振分。チーム総資産でアイテムを持ち込み
4. **対戦** — ルームコード / ランダムマッチ / 練習戦（サーバーレス P2P）
5. **戦闘** — 移動1・主行動1・副行動（回復のみ）は種類ごと1回。ダメージは基準50%±10

## GitHub Pages（ビルド不要）

リポジトリ直下の次を配信するだけです。

- `index.html`
- `app/main.js` / `app/main.css`（ブラウザ実行用の完成バンドル）
- `favicon.svg`
- `.nojekyll`

Settings → Pages → Source を **Deploy from a branch**、branch `main`、folder `/ (root)` に設定してください。

URL 例: `https://<user>.github.io/Build_And_battle/`

> `src/` を編集したあと見た目を更新したいときだけ `npm run build` で `app/` を再生成してコミットしてください。  
> Pages 側で `npm install` / `npm run build` は不要です。

## ローカル開発

```bash
npm install
npm run build      # app/ を生成
npm run preview    # 静的サーバで確認
```

## 技術

- React + TypeScript（開発は `src/`）
- 配布物は esbuild バンドル（`app/`）— React / Trystero 込み
- **サーバーレス P2P**: Trystero（Nostr シグナリング）+ WebRTC
- localStorage（部隊保存）
