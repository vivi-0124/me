export function timeAgo(iso: string) {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return "たった今";
  if (sec < 3600) return `${Math.floor(sec / 60)}分前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}時間前`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}日前`;
  return new Date(iso).toLocaleDateString("ja-JP");
}

/** 2026-10-15 → 2026.10.15 THU */
export function formatDate(iso: string) {
  if (!iso) return "";
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(`${iso}T00:00:00`).getDay()];
  return `${iso.replaceAll("-", ".")} ${dow}`;
}

export function colorFor(name: string) {
  const palette = ["#f4c06a", "#f08aa0", "#8ec5ff", "#a8e6a1", "#d3a4ff", "#ffb38a"];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return palette[hash % palette.length];
}

export function eventName(e: { artist: string; title: string }) {
  return [e.artist, e.title].filter(Boolean).join(" ");
}
