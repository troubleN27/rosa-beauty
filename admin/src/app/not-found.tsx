import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-sm text-muted-foreground">Rosa Beauty</p>
        <h1 className="mt-2 text-xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-sm text-muted-foreground">Проверьте адрес или вернитесь на главную панели.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          На главную
        </Link>
      </div>
    </main>
  );
}
