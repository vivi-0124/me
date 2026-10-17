# pdf-inspector 使い方メモ

[firecrawl/pdf-inspector](https://github.com/firecrawl/pdf-inspector) — Rust 製の PDF 解析ライブラリ（MIT）。
PDF が「テキストベースか / スキャン画像か」を判定し、不要な OCR をスキップできる。

## できること

- **種類判定**: `TextBased` / `Scanned` / `ImageBased` / `Mixed` を 10〜50ms で分類（信頼度スコア付き）
- **テキスト抽出**: 座標・フォント情報付き、マルチカラム自動検出、CID フォント対応
- **Markdown 変換**: 見出し・リスト・テーブル・コードブロック・太字/斜体・リンク・RTL
- **選択的 OCR**: ページ単位で「OCR が必要か」を返す。テキストベースなら OCR ランタイムを読み込まない

## インストール

### CLI（npm）
```bash
npm install -g @firecrawl/pdf-inspector
```
→ `pdf-inspector` コマンドが入る。

> PyPI の `pdf-inspector` には CLI エントリポイントが無いので、`uv tool install` は失敗する。
> CLI は npm 版、Python はライブラリ用途と使い分ける。

### Python ライブラリ
```bash
uv pip install pdf-inspector
```

### Rust
```bash
cargo add pdf-inspector
```

## CLI の使い方

```bash
pdf-inspector document.pdf                 # Markdown に変換して標準出力
pdf-inspector document.pdf -o out.md       # ファイルに書き出し
pdf-inspector document.pdf --pages 1,2,3   # ページ指定
pdf-inspector document.pdf --json          # JSON 出力
pdf-inspector detect document.pdf --json   # 種類判定のみ
cat document.pdf | pdf-inspector -         # 標準入力から
```

オプション:

| オプション | 説明 |
|---|---|
| `--json` | JSON で出力 |
| `--pages <pages>` | 対象ページをカンマ区切りで指定（例 `1,3,5`） |
| `-o, --output <file>` | 標準出力ではなくファイルへ |
| `-h, --help` | ヘルプ |
| `-v, --version` | バージョン |

### 実行例

```bash
$ pdf-inspector detect sample.pdf --json
{
  "pdfType": "TextBased",
  "pageCount": 1,
  "pagesNeedingOcr": [],
  "confidence": 1
}

$ pdf-inspector sample.pdf
Hello PDF Inspector
This is a sample document for testing.
```

`pagesNeedingOcr` が空 = OCR 不要。ここが「OCR に投げる前のフィルタ」として効く。

## Python から使う

```python
import pdf_inspector as p

r = p.process_pdf("document.pdf")
print(r.markdown)            # Markdown 本文
print(r.pdf_type)            # 'text_based' / 'scanned' など
print(r.pages_needing_ocr)   # OCR が必要なページ番号
print(r.confidence, r.page_count, r.processing_time_ms)
print(r.pages_with_tables, r.pages_with_columns, r.title)
```

### 主な関数

| 関数 | 用途 |
|---|---|
| `detect_pdf(path)` / `classify_pdf(path)` | 判定だけ（速い） |
| `process_pdf(path)` | 判定 + Markdown 変換 |
| `extract_text(path)` | 生テキスト抽出 |
| `extract_text_with_positions(path)` | 座標付きテキスト抽出 |
| `extract_pages_markdown(path)` | ページごとの Markdown |
| `extract_structure_elements(path)` | 構造要素の抽出 |
| `extract_text_in_regions(path)` | 領域指定でのテキスト抽出 |
| `process_pdf_with_ocr(path)` | OCR 込みの処理 |

いずれも `*_bytes(data)` 版があり、ファイルを経由せずバイト列を直接渡せる（例: `process_pdf_bytes`）。

### PdfResult の属性

`markdown` / `pdf_type` / `confidence` / `page_count` / `title` /
`pages_needing_ocr` / `ocr_reasons_by_page` / `pages_with_tables` /
`pages_with_columns` / `is_complex_layout` / `has_encoding_issues` / `processing_time_ms`

## 典型的な使い方

1. `detect_pdf` で振り分ける
2. テキストベース → そのまま `process_pdf` で抽出
3. スキャン → 該当ページだけ OCR に回す

大量の PDF を扱うときに「全部 OCR に投げる」のを避けられるので、コストと時間が下がる。

## ベンチマーク

opendataloader-bench（200 PDF）で総合スコア 0.875、読み取り順序 0.915、平均 0.470 秒。
