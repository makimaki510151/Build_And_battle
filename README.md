# Build & Battle

レギュレーション制のキャラビルド × 円・直線測距のSRPG風リアルタイム対戦 Web ゲームです。  
GitHub Pages での公開を前提に、PeerJS（WebRTC）で P2P マルチプレイします。

## 遊び方

1. **部隊作成** — 初心者 / 通常 / 上級のレギュレーションを選び、4体のキャラをビルド
2. **技能とスキル** — チーム総経験値を技能に割り振り（メインLv = 技能Lvの最大値）。スキルラインからスキルを取得
3. **ステータスと装備** — 種族初期値＋メインLv分の振分。チーム総資産でアイテムを持ち込み
4. **対戦** — ルームコード / ランダムマッチ / 練習戦
5. **戦闘** — プレイヤー単位ターン。マス目ではなく移動円＋スナップ座標。スキルは単体・円・直線・扇

## 開発

```bash
npm install
npm run dev
```

## GitHub Pages へデプロイ

```bash
npm run deploy
```

リポジトリ名が `Build_And_battle` のため、`vite.config.ts` の `base` は `/Build_And_battle/` です。  
Pages の Source を `gh-pages` ブランチに設定してください。

## 技術

- Vite + React + TypeScript
- PeerJS（マッチング / 同期）
- localStorage（部隊保存）
