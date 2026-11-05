# 東京駅さんぽ｜ゲーム制作版

## 謎解きゲーム（最新版）

今回の謎解きゲームは、専用フォルダ **[nazotoki/](nazotoki/)** に分けて保存しています。4色の3D人物、肩越し視点、切符で読む昔の案内、やさしい謎3つ、最大4人の協力プレイを含みます。

- **オリジナルマップ**：[main ブランチ](https://github.com/non-light/toukyou/tree/main)（変更しません）
- **謎解きゲーム**：[game-development / nazotoki](nazotoki/)
- **遊ぶ**：[ゲーム制作版](https://tokyo-station-game-noriko.workspace-397612.chatgpt.site)

以下は、従来のゲーム制作用の土台についての説明です。


完成した東京駅3Dをそのまま残し、人物・会話・謎解きを追加するための独立した制作版です。初期状態では人物と謎は空です。駅の8階層、46地点、14改札、14編成、4つの待ち合わせ目印は引き継いでいます。

## まず使う

1. 散策を始め、画面下の「制作」を開きます。
2. 登場人物や謎を追加し、登場場所・会話・問題・正解を設定します。
3. 散策に戻り、近くに表示される人物や謎を選んで動作を確かめます。

制作した内容はこの端末のブラウザに保存します。「書き出し」でJSONを保存し、「読み込み」で別端末へ引き継げます。ブラウザのデータ削除に備えて、制作後は書き出したファイルも保管してください。

## オリジナルの保存先

- 完成版の公開URL：https://tokyo-station-walk-noriko.workspace-397612.chatgpt.site
- 完成版GitHubタグ：`tokyo-station-original-v0.6-20261105`
- 完成版コミット：`314300f107a5674b849cd5fdb88f5aa4f0cdec1d`
- 完成版フォルダ：`/Users/noriko/Workspace/toukyoukarano`
- ZIP・Git履歴バックアップ：`/Users/noriko/Workspace/toukyoukarano-backups/2026-11-05-original-v0.6`

制作はこのゲーム版で進めます。GitHubでは `game-development` ブランチを使用し、完成版の `main` は変更しません。完成版のサイトIDを制作版の公開先に指定すると、`npm run check` が停止します。

## 制作版の構成

| 場所 | 内容 |
| --- | --- |
| `dist/game/content.js` | 初期の人物・謎データ。初期状態は空 |
| `dist/game/state.js` | 内容の検証、正解判定、条件解放、保存 |
| `dist/game/characters.js` | 登場人物の3D表示 |
| `dist/game/addon.js` | 制作画面・会話・謎の操作 |
| `dist/game/studio.css` | 制作画面の見た目 |
| `protected-original.json` | 保存版と制作版を識別する記録 |
| `scripts/check-original.mjs` | 保存版への誤った公開を止める確認 |

人物と謎は既存の駅の地点IDを使って配置します。原則として駅の模型や改札・階層の定義を変更せず、ゲーム側のデータと動作を追加します。人物の追加は元の歩行経路や衝突判定を変更しません。

人物には名前・会話・色・場所・関連する謎を設定できます。謎には問題・複数の正解・ヒント・正解後の表示・先に解く謎を設定できます。正解は全角／半角や英字の大文字／小文字、空白の違いを吸収して判定します。存在しない場所や謎、循環する解放条件は読み込み時に拒否します。

制作画面から読み込んだ内容はブラウザ側に保存されます。アプリ自体の初期データとして組み込む場合は、書き出したJSONと同じ形式の内容を `GAME_CONTENT` に反映して制作版を更新します。元の散策版へは反映しません。

## 起動と確認

```sh
npm start
```

`http://localhost:4175` を開きます。完成版のプレビューとは別のポートを使います。

```sh
npm run check
npm test
```

制作版のサイトは `appgprj_6aec2c90b13c8191bb14c9c12644b58d` です。`.openai/hosting.json` を原本のIDへ変更しないでください。公開時もこの独立した制作版だけを更新します。

駅自体の操作や模式モデルの範囲、公式参考資料は [駅の説明](docs/STATION_BASE.md) に残しています。
