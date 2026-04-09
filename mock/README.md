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

URL paramで曲切替: `http://localhost:8000/?song=stage01`

## 操作

| キー | ボタン | レーン | サンプル |
|---|---|---|---|
| D | □ | 上から3 | sample1 |
| F | × | 下     | sample2 |
| J | ○ | 上から2 | sample3 |
| K | △ | 上     | sample4 |

## 曲を追加する

1曲 = 1フォルダ。`mock/songs/<id>/` を作って中に必要ファイルを置く。

```
mock/songs/stage01/
  song.json     ← 設定
  drums.mp3     ← オケ(ドラム+ベース、ループ前提)
  sample1.mp3   ← □ 左 (D)
  sample2.mp3   ← × 下 (F)
  sample3.mp3   ← ○ 右 (J)
  sample4.mp3   ← △ 上 (K)
  chart.mid     ← 譜面 (任意)
```

`song.json`:

```json
{
  "title": "Stage 01",
  "bpm": 90,
  "drums": "drums.mp3",
  "samples": ["sample1.mp3", "sample2.mp3", "sample3.mp3", "sample4.mp3"],
  "chart": "chart.mid"
}
```

ファイル名は `song.json` で指定するので自由(`drums.wav` でも可)。BPM もここで指定。MIDI があればヘッダのBPMが優先される。

## 譜面 (MIDI)

DAW から書き出した `.mid` を `chart` に指定。マッピング:

| MIDIノート | ボタン |
|---|---|
| C3 (60) | □ 左 (D) |
| D3 (62) | × 下 (F) |
| E3 (64) | ○ 右 (J) |
| F3 (65) | △ 上 (K) |

ノートの長さとベロシティは無視、発音タイミングのみ使用。

## 構成

- `src/audio.js` — Web Audio ラッパ。`AudioContext.currentTime` を時間基準にする
- `src/input.js` — keydown 時刻を audio time で記録
- `src/song.js`  — 曲マニフェスト + MIDI 譜面ローダ
- `src/game.js`  — レーン描画 + 判定(±60ms) + パッドHUD
- `src/main.js`  — 起動

## 含まれていないもの(意図的)

- ブロック切替 / クオンタイズON / スコア / UI / 失敗演出 / グラフィック作り込み
