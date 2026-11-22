"use client";

import { upload } from "@vercel/blob/client";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { removePhotoAction, savePhotoAction } from "@/app/(dashboard)/masters/actions";
import { MasterAvatar } from "@/components/masters/master-avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

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
  const { t, tm } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = progress !== null || pending;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error(t("masters.photo.badType"));
    if (file.size > MAX_BYTES) return void toast.error(t("masters.photo.tooBig"));
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
        if (!result.ok) return void toast.error(tm(result.error));
        toast.success(t("masters.photo.updated"));
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      toast.error(t("masters.photo.failed"));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  function remove() {
    startTransition(async () => {
      const result = await removePhotoAction(masterId);
      if (!result.ok) return void toast.error(tm(result.error));
      toast.success(t("masters.photo.deleted"));
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5 rounded-xl border bg-card p-4 sm:flex-row sm:items-center md:p-5">
      <MasterAvatar name={name} photoUrl={photoUrl} size={128} className="rounded-2xl" />
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("masters.photo.hint")}
        </p>
        {!configured && (
          <p className="text-sm text-destructive">{t("masters.photo.notConfigured")}</p>
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
            {progress !== null ? t("masters.photo.uploading", { percent: progress }) : photoUrl ? t("masters.photo.replace") : t("masters.photo.upload")}
          </Button>
          {photoUrl && (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={remove} disabled={busy}>
              <Trash2 aria-hidden />
              {t("common.delete")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
