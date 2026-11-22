import Image from "next/image";
import Link from "next/link";

import { Flourish } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Image src="/brand/emblem.png" alt="" width={498} height={720} className="h-32 w-auto opacity-90" priority />
        <h1 className="mt-6 font-display text-4xl font-semibold">Страница не найдена</h1>
        <Flourish className="mt-3" />
        <p className="mt-4 text-sm text-muted-foreground">Проверьте адрес или вернитесь на главную панели.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          На главную
        </Link>
      </div>
    </main>
  );
}
