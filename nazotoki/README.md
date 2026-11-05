# 東京駅 謎解きゲーム — 時をこえた一通

この `nazotoki/` が謎解きゲーム専用フォルダです。オリジナルは [main ブランチ](https://github.com/non-light/toukyou/tree/main) に残しています。

東京駅のオリジナル3Dマップを保存したまま、独立したゲーム制作版に追加した第1話です。古い切符の窓から昔の案内を読み、銀の鈴・SQUARE ZERO・赤レンガ駅舎型ポストをたどって、宛先の消えた手紙を届けます。

## 遊び方

「物語をはじめる」から開始します。切符が光る場所で「切符をかざす」を押し、目印の方を見て「昔の案内を読む」を選びます。謎は案内を読む・同じ絵を選ぶ・三つの印を順に並べるの3段階です。最後は手紙を開いて投函します。

制限時間や失敗のペナルティはありません。発見は手帳に記録され、ヒントを段階的に表示できます。「道案内」から歩いて案内させたり、目印の前へ移動したりできます。ソロの進行はブラウザ内に保存されます。

「仲間」から最大4人の部屋を作成できます。合言葉または招待リンクで参加し、発見・謎の進行・手帳を共有します。同じ階の仲間は3D表示されます。部屋は24時間有効で、しばらく接続していない人の席は新規参加時に解放されます。部屋の再接続情報はそのタブに保存します。ゲームの公開範囲は従来のままで、参加者にもサイトを開く権限が必要です。

赤・青・緑・黄の4人の3D旅人を選べます。ゲーム中は人物の右肩の後方から追従する肩越し視点です。壁がカメラに近づくと距離を詰め、近すぎる自分の人物は透過します。開始画面や「自分の旅人を選ぶ」で、選んだ姿が立体表示されます。協力プレイでは他の参加者と色が重ならず、同じ階の仲間の歩行・走行も表示します。オリジナルのGLBとCC0ライセンスは `dist/game/avatars` に同梱しています。

既存の自由散策、マップ、階移動、設定、制作画面も利用できます。制作画面で追加した人物や謎のデータは、このエピソードの進行とは別に保存します。

## オリジナルの保護

- 保存済みの散策版: https://tokyo-station-walk-noriko.workspace-397612.chatgpt.site
- ゲーム制作版: https://tokyo-station-game-noriko.workspace-397612.chatgpt.site
- オリジナルのフォルダ `/Users/noriko/Documents/HP作成/tokyo-station-walk` と `/Users/noriko/Workspace/toukyoukarano` は編集しません。
- `protected-map.json` に駅の建物、通路、階層、地図、電車、改札、目印のファイルのSHA-256を記録し、`npm run check` で変更がないことを検証します。
- `protected-original.json` と `scripts/check-original.mjs` が、元のサイトへの誤った公開を防ぎます。

物語、切符、手帳、謎の判定は `dist/game/ticket*.js` と `ticket.css` に分離しています。元の駅の見た目や衝突判定は変更していません。駅自体の説明は [docs/STATION_BASE.md](docs/STATION_BASE.md) を参照してください。

## 開発と検証

初回の準備（Node.js 22.13以上）：

```sh
cd nazotoki/server-app
npm ci
cd ..
npm start
```

Sitesのビルド補助がない環境では、同梱のビルドスクリプトを使用します。ゲームの操作や謎の内容は、公開中の制作版と同じです。


```sh
npm run check
npm test
npm start
```

`npm start` はゲームのファイルを `server-app/public` へコピーし、協力APIをビルドし、ローカルのDBに未適用の変更を反映してから `http://127.0.0.1:4175` で起動します。別のポートは `npm start -- --port 4188` で指定できます。Node.js 22.13以降を使用し、初回は `nazotoki/server-app` で `npm ci` を実行してください。その後 `nazotoki` に戻って `npm start` を実行します。

著作ファイルは引き続き `dist/` 直下にあります。`dist/server`・`dist/client`・`dist/.openai` はビルド生成物で、直接編集しません。協力APIとDB定義は `server-app`、公開用DB変更は `drizzle` にあります。オンライン協力にはサーバー接続が必要です。

```sh
npm run build
```

公開先は独立したゲーム制作版 `appgprj_6aec2c90b13c8191bb14c9c12644b58d` です。オリジナルのサイトIDへ変更しないでください。GitHubのオリジナルmainブランチには反映しません。
