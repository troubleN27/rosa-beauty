"use client";

import { upload } from "@vercel/blob/client";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { removePhotoAction, savePhotoAction } from "@/app/(dashboard)/masters/actions";
import { MasterAvatar } from "@/components/masters/master-avatar";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function PhotoUploader({
  masterId,
  name,
  photoUrl,
  configured,
}: {
  masterId: string;
  name: string;
  photoUrl: string | null;
  configured: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = progress !== null || pending;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error("Подойдёт фото в формате JPG, PNG или WebP.");
    if (file.size > MAX_BYTES) return void toast.error("Фото больше 5 МБ. Уменьшите его и попробуйте снова.");
    setProgress(0);
    try {
      const blob = await upload(`masters/${masterId}.${EXTENSIONS[file.type]}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/master-photo",
        contentType: file.type,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      startTransition(async () => {
        const result = await savePhotoAction(masterId, blob.url);
        if (!result.ok) return void toast.error(result.error);
        toast.success("Фото обновлено");
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      toast.error("Не удалось загрузить фото. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  function remove() {
    startTransition(async () => {
      const result = await removePhotoAction(masterId);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Фото удалено");
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5 rounded-xl border bg-card p-4 sm:flex-row sm:items-center md:p-5">
      <MasterAvatar name={name} photoUrl={photoUrl} size={128} className="rounded-2xl" />
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Фото видно клиентам в разделе «Мастера» в боте. JPG, PNG или WebP, до 5 МБ. Лучше всего — портрет с лицом по центру.
        </p>
        {!configured && (
          <p className="text-sm text-destructive">Хранилище фото не подключено — загрузка недоступна.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={TYPES.join(",")}
            className="sr-only"
            id="master-photo"
            onChange={(event) => onFile(event.target.files?.[0])}
            disabled={busy || !configured}
          />
          <Button onClick={() => input.current?.click()} disabled={busy || !configured}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ImageUp aria-hidden />}
            {progress !== null ? `Загрузка ${progress}%` : photoUrl ? "Заменить фото" : "Загрузить фото"}
          </Button>
          {photoUrl && (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={remove} disabled={busy}>
              <Trash2 aria-hidden />
              Удалить
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
