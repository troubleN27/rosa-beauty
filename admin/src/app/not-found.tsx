import Image from "next/image";
import Link from "next/link";

import { Flourish } from "@/components/brand";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Image src="/brand/emblem.png" alt="" width={498} height={720} className="h-32 w-auto opacity-90" priority />
        <h1 className="mt-6 font-display text-4xl font-semibold">{t("notFound.title")}</h1>
        <Flourish className="mt-3" />
        <p className="mt-4 text-sm text-muted-foreground">{t("notFound.rootText")}</p>
        <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          {t("common.toHome")}
        </Link>
      </div>
    </main>
  );
}
