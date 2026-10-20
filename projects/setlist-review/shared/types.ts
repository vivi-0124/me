// 画面と API で共通の型

export type Song = {
  kind: "song";
  id?: string;
  no: string;
  name: string;
  notes?: string[];
  encore?: boolean;
  tag?: string;
};

export type Quote = { who: string; text: string };

export type McLine = {
  id?: string;
  text?: string;
  quotes?: Quote[];
  subs?: string[];
  toSong?: boolean;
  news?: string;
};

/** MC。lines は前の形式（MC の中身を1行ずつ書いた）のページだけで使う */
export type Mc = { kind: "mc"; id?: string; title: string; lines: McLine[] };
export type Block = { kind: "block"; label?: string };
export type Encore = { kind: "encore" };
export type Item = Song | Mc | Block | Encore;

/** コメントを付けられる単位（曲か MC。前の形式では MC の1行） */
export type Commentable = Song | Mc | McLine;

export type EventInfo = {
  slug: string;
  artist: string;
  title: string;
  date: string;
  venue: string;
  source: string;
  items: Item[];
  created_at: string;
  updated_at: string;
};

export type EventInput = Pick<EventInfo, "artist" | "title" | "date" | "venue" | "source" | "items">;

export type Comment = {
  id: number;
  target_id: string;
  author: string;
  body: string;
  created_at: string;
  mine: boolean;
};
