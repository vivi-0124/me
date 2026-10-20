// セトリ入力欄の1行。画面では「曲」「MC」「アンコールの区切り」を1行ずつ並べる
// テスト（node --test）からも読めるよう、エイリアスではなく相対パスで読む
import type { Item } from "../../shared/types.ts";
import { ensureIds, numberItems, parseSetlist } from "../../shared/parse.ts";

export type Row = {
  key: number;
  kind: "song" | "mc" | "encore";
  /** 曲名（曲の行だけ） */
  name: string;
  /** 読み込んだときの項目。id と、前の形式の MC の中身・曲のメモを、保存しても消さないために持っておく */
  item?: Item;
};

let nextKey = 1;
export const newRow = (kind: Row["kind"], name = ""): Row => ({ key: nextKey++, kind, name });

export function rowsFromItems(items: Item[]): Row[] {
  return items.flatMap((item): Row[] => {
    if (item.kind === "song") return [{ ...newRow("song", item.name), item }];
    if (item.kind === "mc") return [{ ...newRow("mc"), item }];
    if (item.kind === "encore") return [newRow("encore")];
    return []; // 前の形式のブロック見出しは使わない
  });
}

/** 貼り付けられた文章を行にする（「MC」「-encore-」も読み取る） */
export function rowsFromText(text: string): Row[] {
  return rowsFromItems(parseSetlist(text));
}

/** 保存する項目にする。曲名が空の行は捨て、番号と id を付ける */
export function itemsFromRows(rows: Row[]): Item[] {
  const items: Item[] = [];
  for (const row of rows) {
    if (row.kind === "song") {
      const name = row.name.trim();
      if (!name) continue;
      const prev = row.item?.kind === "song" ? row.item : undefined;
      items.push({ ...(prev && JSON.parse(JSON.stringify(prev))), kind: "song", no: "", name });
    } else if (row.kind === "mc") {
      // MC が続いたら1つにまとめる
      if (items.at(-1)?.kind === "mc") continue;
      const prev = row.item?.kind === "mc" ? row.item : undefined;
      // 画面の行は Vue のリアクティブなので、JSON で素のオブジェクトにしてから使う
      items.push(prev ? JSON.parse(JSON.stringify(prev)) : { kind: "mc", title: "MC", lines: [] });
    } else if (!items.some((i) => i.kind === "encore")) {
      items.push({ kind: "encore" });
    }
  }
  return ensureIds(numberItems(items));
}

/** 保存用の文章（編集画面には使わないが、あとで見返せるように残す） */
export function sourceFromItems(items: Item[]): string {
  return items
    .map((i) => (i.kind === "song" ? i.name : i.kind === "mc" ? "MC" : i.kind === "encore" ? "-encore-" : ""))
    .filter(Boolean)
    .join("\n");
}
