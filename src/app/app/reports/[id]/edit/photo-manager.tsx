"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Trash2, ChevronUp, ChevronDown, X, ChevronLeft, ChevronRight, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { compressImage, uploadWithProgress } from "@/lib/image-client";
import { CATEGORY_LABELS, PHRASES } from "@/lib/phrases";
import { deletePhotoAction, reorderPhotosAction, updatePhotoAction } from "../../actions";
import { cn } from "@/components/ui";

export type PhotoItem = { id: string; category: keyof typeof CATEGORY_LABELS; caption: string | null; width: number | null; height: number | null };
type Upload = { key: string; name: string; progress: number; status: "compressing" | "uploading" | "error"; error?: string; file: File; category: PhotoItem["category"] };

const CATS = Object.keys(CATEGORY_LABELS) as PhotoItem["category"][];
const CAT_STYLE: Record<string, string> = {
  before: "bg-slate-600 text-white",
  during: "bg-brand-600 text-white",
  after: "bg-emerald-600 text-white",
  other: "bg-slate-400 text-white",
};

export function PhotoManager({ reportId, initialPhotos, editable }: { reportId: string; initialPhotos: PhotoItem[]; editable: boolean }) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [category, setCategory] = useState<PhotoItem["category"]>(initialPhotos.length ? "during" : "before");
  const [viewer, setViewer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const busy = uploads.some((u) => u.status !== "error");
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [busy]);

  const patchUpload = (key: string, patch: Partial<Upload>) => setUploads((us) => us.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  const uploadOne = useCallback(
    async (u: Upload) => {
      try {
        patchUpload(u.key, { status: "compressing", progress: 0, error: undefined });
        const c = await compressImage(u.file);
        patchUpload(u.key, { status: "uploading" });
        const fd = new FormData();
        fd.append("file", c.main, "photo.jpg");
        fd.append("thumb", c.thumb, "thumb.jpg");
        fd.append("category", u.category);
        fd.append("width", String(c.width));
        fd.append("height", String(c.height));
        const res = await uploadWithProgress(`/api/reports/${reportId}/photos`, fd, (p) => patchUpload(u.key, { progress: p }));
        const json = res.json as { photo?: PhotoItem; error?: string } | null;
        if (res.status !== 201 || !json?.photo) throw new Error(json?.error ?? `アップロードに失敗しました（${res.status}）`);
        setPhotos((ps) => [...ps, json.photo!]);
        setUploads((us) => us.filter((x) => x.key !== u.key));
      } catch (e) {
        patchUpload(u.key, { status: "error", error: (e as Error).message });
      }
    },
    [reportId],
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).map<Upload>((file) => ({ key: crypto.randomUUID(), name: file.name, progress: 0, status: "compressing", file, category }));
    setUploads((us) => [...us, ...list]);
    // スマホのメモリを使いすぎないよう1枚ずつ順番に処理する
    for (const u of list) await uploadOne(u);
    if (cameraRef.current) cameraRef.current.value = "";
    if (pickerRef.current) pickerRef.current.value = "";
  }

  function update(id: string, patch: Partial<PhotoItem>) {
    const next = photos.map((p) => (p.id === id ? { ...p, ...patch } : p));
    setPhotos(next);
    const p = next.find((x) => x.id === id)!;
    startTransition(async () => {
      const r = await updatePhotoAction(id, { caption: p.caption ?? "", category: p.category });
      if (r.error) setError(r.error);
    });
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[index], next[j]] = [next[j], next[index]];
    setPhotos(next);
    startTransition(async () => {
      const r = await reorderPhotosAction(reportId, next.map((p) => p.id));
      if (r.error) setError(r.error);
    });
  }

  function remove(id: string) {
    if (!confirm("この写真を削除しますか？")) return;
    const prev = photos;
    setPhotos(photos.filter((p) => p.id !== id));
    startTransition(async () => {
      const r = await deletePhotoAction(id);
      if (r.error) {
        setError(r.error);
        setPhotos(prev);
      }
    });
  }

  return (
    <section aria-labelledby="photos-heading">
      <div className="mb-3 flex items-end justify-between">
        <h2 id="photos-heading" className="text-base font-bold text-navy-900">
          写真 <span className="text-sm font-normal text-slate-500">{photos.length}枚</span>
        </h2>
      </div>

      {error && (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </p>
      )}

      {editable && (
        <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-3">
          <p className="mb-2 text-xs font-bold text-slate-600">次に撮る写真の分類</p>
          <div className="mb-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="写真の分類">
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category === c}
                onClick={() => setCategory(c)}
                className={cn("h-10 rounded-lg text-sm font-bold", category === c ? "bg-navy-900 text-white" : "border border-slate-300 bg-white text-slate-700")}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 font-bold text-white shadow-sm active:bg-brand-700">
              <Camera className="size-6" aria-hidden />
              撮影する
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFiles(e.target.files)} data-testid="camera-input" />
            </label>
            <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-bold text-navy-900 active:bg-slate-50">
              <ImagePlus className="size-6" aria-hidden />
              写真を選ぶ
              <input ref={pickerRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} data-testid="photo-input" />
            </label>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="mb-4 space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  {u.status === "error" ? <AlertCircle className="size-4 shrink-0 text-red-600" /> : <Loader2 className="size-4 shrink-0 animate-spin text-brand-600" />}
                  <span className="truncate">{u.status === "compressing" ? "写真を圧縮しています…" : u.status === "uploading" ? `アップロード中 ${Math.round(u.progress * 100)}%` : u.error}</span>
                </span>
                {u.status === "error" && (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => uploadOne(u)} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold">
                      <RotateCcw className="size-3.5" /> 再試行
                    </button>
                    <button type="button" onClick={() => setUploads((us) => us.filter((x) => x.key !== u.key))} className="rounded-lg px-2 py-1 text-xs text-slate-500" aria-label="取り消す">
                      <X className="size-4" />
                    </button>
                  </span>
                )}
              </div>
              {u.status === "uploading" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(u.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${u.progress * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {photos.length === 0 && uploads.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          まだ写真がありません。{editable && "「撮影する」から現場の写真を追加してください。"}
        </div>
      ) : (
        <ol className="space-y-3" data-testid="photo-list">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,42,74,0.04)]">
              <div className="flex flex-col sm:flex-row">
                <button type="button" onClick={() => setViewer(i)} className="relative block aspect-[4/3] w-full shrink-0 bg-slate-100 sm:w-64" aria-label={`写真${i + 1}を拡大表示`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${p.id}?thumb=1`} alt={p.caption ?? `写真${i + 1}`} className="size-full object-cover" loading="lazy" />
                  <span className="absolute top-2 left-2 rounded-md bg-navy-900/85 px-2 py-0.5 text-xs font-bold text-white">{i + 1}</span>
                  <span className={cn("absolute top-2 right-2 rounded-md px-2 py-0.5 text-xs font-bold", CAT_STYLE[p.category])}>{CATEGORY_LABELS[p.category]}</span>
                </button>
                <div className="min-w-0 flex-1 p-3">
                  {editable ? (
                    <PhotoEditor photo={p} onChange={(patch) => update(p.id, patch)} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap text-slate-700">{p.caption || "（コメントなし）"}</p>
                  )}
                  {editable && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                      <div className="flex gap-1">
                        <IconBtn label="上へ移動" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ChevronUp className="size-5" />
                        </IconBtn>
                        <IconBtn label="下へ移動" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                          <ChevronDown className="size-5" />
                        </IconBtn>
                      </div>
                      <button type="button" onClick={() => remove(p.id)} className="flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50">
                        <Trash2 className="size-4" /> 削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editable && photos.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => cameraRef.current?.click()} className="flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg" aria-label="写真を追加で撮影">
            <Camera className="size-6" />
          </button>
        </div>
      )}

      {viewer !== null && photos[viewer] && <Lightbox photos={photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </section>
  );
}

function IconBtn({ label, children, ...props }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30" {...props}>
      {children}
    </button>
  );
}

function PhotoEditor({ photo, onChange }: { photo: PhotoItem; onChange: (patch: Partial<PhotoItem>) => void }) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const phrases = PHRASES[photo.category] ?? [];
  const commit = (value: string) => {
    if (value !== (photo.caption ?? "")) onChange({ caption: value });
  };
  return (
    <div className="space-y-2">
      <select
        value={photo.category}
        onChange={(e) => onChange({ category: e.target.value as PhotoItem["category"] })}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-[16px]"
        aria-label="写真の分類"
      >
        {CATS.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="写真へのコメント（例：エアコン室外機の撤去前）"
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-[16px] leading-relaxed focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none"
        aria-label="写真へのコメント"
      />
      <div className="flex flex-wrap gap-1.5">
        {phrases.map((ph) => (
          <button
            key={ph}
            type="button"
            onClick={() => {
              const v = caption ? `${caption}${/[。\n]$/.test(caption) ? "" : "。"}${ph}` : ph;
              setCaption(v);
              commit(v);
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 active:bg-brand-50"
          >
            {ph}
          </button>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ photos, index, onIndex, onClose }: { photos: PhotoItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const p = photos[index];
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, photos.length, onClose, onIndex]);
  return (
    <div role="dialog" aria-modal="true" aria-label="写真の拡大表示" className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm">
          {index + 1} / {photos.length}　{CATEGORY_LABELS[p.category]}
        </span>
        <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full bg-white/10" aria-label="閉じる">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/photos/${p.id}`} alt={p.caption ?? ""} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {index > 0 && (
          <button type="button" onClick={(e) => (e.stopPropagation(), onIndex(index - 1))} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/15 text-white" aria-label="前の写真">
            <ChevronLeft className="size-7" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button type="button" onClick={(e) => (e.stopPropagation(), onIndex(index + 1))} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/15 text-white" aria-label="次の写真">
            <ChevronRight className="size-7" />
          </button>
        )}
      </div>
      {p.caption && <p className="max-h-32 overflow-auto p-4 text-sm whitespace-pre-wrap text-white/90">{p.caption}</p>}
    </div>
  );
}
