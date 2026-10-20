import { toast } from "vue-sonner";

/** スマホなら共有メニュー、PC ならコピー */
export async function shareOrCopy(url: string, title: string) {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }
  await copyText(url);
}

export async function copyText(text: string, message = "リンクをコピーしました") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    prompt("このリンクをコピーしてください", text);
  }
}
