import Image from "next/image";
import Link from "next/link";

import { Flourish } from "@/components/brand";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <Image src="/brand/rose.png" alt="" width={167} height={240} className="h-20 w-auto opacity-80" />
      <h1 className="mt-5 font-display text-3xl font-semibold">Страница не найдена</h1>
      <Flourish className="mt-3" />
      <p className="mt-4 text-sm text-muted-foreground">Возможно, запись была удалена или ссылка устарела.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
        На главную
      </Link>
    </div>
  );
}
