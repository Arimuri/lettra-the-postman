# LETTRA the Postman

ビブリボン的な横スクロール × MPC的チョップ&フリップのリズムゲーム。
主人公は配達員。リズムに合わせて道中のポストに手紙を投函していく。

開発中・公開制作。

## コンセプト

- **オケ(ドラム+ベース)は固定で常時再生**、プレイヤーは4ボタンでウワモノサンプルを叩く
- 押せば曲が彩られ、外せばドラムだけが寂しく続く(**死なない設計**)
- MPC のように 4or8小節単位でサンプルバンクが切り替わる = 1ステージ=1ビートキット
- グラフィックはローポリ幾何 + 活版印刷の手触り

詳細は [lettra_game_design.md](lettra_game_design.md) と [lettra_the_postman_title_notes.md](lettra_the_postman_title_notes.md)。

## ディレクトリ

| | |
|---|---|
| [lettra_the_postman_title_notes.md](lettra_the_postman_title_notes.md) | タイトル決定までの経緯・ブランド設計 |
| [lettra_game_design.md](lettra_game_design.md) | ゲーム設計仕様(随時更新) |
| [mock/](mock/) | プロトタイプ(Web / Vanilla JS + Web Audio) |

## モックを動かす

```sh
cd mock
python3 -m http.server 8000
```

ブラウザで http://localhost:8000/ を開いて START。詳細は [mock/README.md](mock/README.md)。

操作: **D / F / J / K** = □ × ○ △

## ステータス

- [x] タイトル / ブランド方針確定
- [x] ゲーム設計の主要仕様確定
- [x] プレイアブルモック(MIDI譜面読込・±60ms判定・サンプルチョーク)
- [ ] クオンタイズON実装
- [ ] ブロック切替演出
- [ ] グラフィック作り込み
- [ ] 第1ステージ完成
- [ ] 無料配布開始(itch.io 想定)
- [ ] 10曲到達 → Steam展開

## ライセンス

未定(制作公開中)。
