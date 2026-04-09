# LETTRA mock

最小プロトタイプ。4ボタンでサンプルを叩くと、譜面通りのポストに当たれば発音、外せば不発(±60ms判定)。

## 起動

ES Modules + fetch を使うので **HTTPサーバ経由で開く必要あり**(file:// では動かない)。

```sh
cd mock
python3 -m http.server 8000
# → http://localhost:8000/
```

START を押す → ブラウザのオーディオ許可が下りてループ開始。

## 操作

| キー | ボタン | 位置 | サンプル |
|---|---|---|---|
| D | □ | 左 | left  |
| F | × | 下 | down  |
| J | ○ | 右 | right |
| K | △ | 上 | up    |

## 素材を差し替える

`mock/assets/` に以下の wav を置く。無い場合はプレースホルダ音(合成)が自動で鳴る。

- `drums.wav` … ドラム+ベース 8小節ループ(BPM 90 を想定。違うBPMにする場合は `src/chart.js` の `BPM` を合わせる)
- `pad_left.wav` / `pad_down.wav` / `pad_right.wav` / `pad_up.wav` … ウワモノ4種

## 譜面を編集する (MIDI)

`mock/charts/stage01.mid` を DAW から書き出して置く。BPM は MIDI ヘッダから自動取得。

ノート → ボタン マッピング:

| MIDIノート | ボタン |
|---|---|
| C3 (60) | □ 左 (D) |
| D3 (62) | × 下 (F) |
| E3 (64) | ○ 右 (J) |
| F3 (65) | △ 上 (K) |

ノートの長さとベロシティは無視、発音タイミングのみ使用。

譜面切替: `?chart=stage02` のように URL paramで指定可能。MIDI が無ければ `chart.js` の `FALLBACK_CHART` が使われる。

## 構成

- `src/audio.js` — Web Audio ラッパ。`AudioContext.currentTime` を時間基準にする
- `src/input.js` — keydown 時刻を audio time で記録
- `src/chart.js` — 譜面ハードコード
- `src/game.js` — スクロール描画 + 判定(±60ms)
- `src/main.js` — 起動

## 含まれていないもの(意図的)

- ブロック切替 / クオンタイズON / スコア / UI / 失敗演出 / グラフィック作り込み
