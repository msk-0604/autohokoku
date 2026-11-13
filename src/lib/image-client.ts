/**
 * ブラウザ側での画像圧縮。
 * スマホの写真（数MB・HEIC等）を長辺1600pxのJPEGにしてから送るので、通信量と保存容量を抑えられる。
 * EXIF の向きは createImageBitmap の imageOrientation で反映する。
 */
export type Compressed = { main: Blob; thumb: Blob; width: number; height: number };

const MAIN_MAX = 1600;
const THUMB_MAX = 480;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 一部ブラウザでは HEIC 等を createImageBitmap で扱えないので <img> にフォールバック
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function draw(src: ImageBitmap | HTMLImageElement, max: number, quality: number): Promise<{ blob: Blob; w: number; h: number }> {
  const sw = "naturalWidth" in src ? src.naturalWidth : src.width;
  const sh = "naturalHeight" in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を処理できませんでした");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, w, h }) : reject(new Error("画像を変換できませんでした"))), "image/jpeg", quality),
  );
}

export async function compressImage(file: File): Promise<Compressed> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) {
    throw new Error("画像ファイルを選択してください");
  }
  if (file.size > 40 * 1024 * 1024) throw new Error("画像が大きすぎます（40MBまで）");
  const src = await decode(file);
  try {
    let main = await draw(src, MAIN_MAX, 0.82);
    if (main.blob.size > 3.5 * 1024 * 1024) main = await draw(src, 1280, 0.72);
    const thumb = await draw(src, THUMB_MAX, 0.7);
    return { main: main.blob, thumb: thumb.blob, width: main.w, height: main.h };
  } finally {
    if ("close" in src) src.close();
  }
}

/** 進捗付きアップロード（fetch はアップロード進捗を取れないため XHR を使う） */
export function uploadWithProgress(url: string, body: FormData, onProgress: (ratio: number) => void): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve({ status: xhr.status, json: xhr.response });
    xhr.onerror = () => reject(new Error("通信エラーが発生しました"));
    xhr.ontimeout = () => reject(new Error("通信がタイムアウトしました"));
    xhr.timeout = 120_000;
    xhr.send(body);
  });
}
