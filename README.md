# 東京駅の謎解き — 四つの物語

第1〜4作を、**作品ごとの独立したフォルダ**に分けています。統合版の修正を反映し、2026年11月9日に独立版の検査339件と各作品の起動、第1作の2人参加を確認しました。

| 作品 | タイトルとソース | 人数 | 公開版で遊ぶ |
| --- | --- | --- | --- |
| 第1作 | [時を超えた一通](episodes/01-tokiwo-koeta-ittsu/) | 1〜4人 | [第1作を開く](https://tokyo-station-game-noriko.workspace-397612.chatgpt.site/play?episode=1) |
| 第2作 | [さよならを言わない待ち合わせ](episodes/02-sayonara-wo-iwanai-machiawase/) | 1人 | [第2作を開く](https://tokyo-station-game-noriko.workspace-397612.chatgpt.site/play?episode=2) |
| 第3作 | [写真に写らなかった君](episodes/03-shashin-ni-utsuranakatta-kimi/) | 1人 | [第3作を開く](https://tokyo-station-game-noriko.workspace-397612.chatgpt.site/play?episode=3) |
| 第4作 | [あの日の約束を、もう一度](episodes/04-anohino-yakusokuwo-mouichido/) | 1人 | [第4作を開く](https://tokyo-station-game-noriko.workspace-397612.chatgpt.site/play?episode=4) |

各作品に、専用の物語・画面・謎の判定・説明書と必要な3D素材を同梱しています。ほかの作品のフォルダを参照せずに起動できます。各フォルダのREADMEに、起動方法と検証方法があります。

## フォルダの使い分け

- **[episodes/](episodes/)**：1作品ずつ使うための独立版です。
- **[nazotoki/](nazotoki/)**：公開中の4作品をまとめて選べる統合版のソースです。
- リポジトリ直下の`dist/`：従来のゲーム制作の土台を保存しています。

第2〜4作は、作品のフォルダで`npm start`を実行して起動します。第1作の協力プレイには、同梱したサーバーとデータベースを使います。第1作のREADMEに準備手順があります。HTMLを直接ダブルクリックするのではなく、各作品のサーバーを起動してブラウザで開いてください。

## オリジナルの保存

この開発版は`game-development`ブランチに保存しています。完成した散策版の**[mainブランチ](https://github.com/non-light/toukyou/tree/main)**は変更しません。

- 保存版のタグ：`tokyo-station-original-v0.6-20261105`
- 保存版のコミット：`314300f107a5674b849cd5fdb88f5aa4f0cdec1d`
- [保存済みの散策版を開く](https://tokyo-station-walk-noriko.workspace-397612.chatgpt.site)

各独立版は、元の駅の建物・通路・階層・列車・改札・目印のデータを同じまま使います。公開中の統合版のSite設定は独立版に入れていません。

## 開発時の確認

```sh
# 統合版の確認
cd nazotoki
npm run check
npm test
```

作品ごとの確認は、各作品フォルダの`npm run check`と`npm test`で行えます。

独立版を統合版から更新する場合は、リポジトリ直下で`node scripts/export-episodes.mjs --replace`を実行します。独立版への編集は置き換わるため、必要な変更を先に統合版へ反映してください。生成後は各独立版の検証も実行してください。

## ライセンス

3D人物素材のライセンスは各作品の`dist/game/avatars/LICENSE.txt`、Three.jsのライセンスは`dist/vendor/THREE-LICENSE.txt`にあります。コードを配布・改変する場合も、同梱ライセンスを残してください。
