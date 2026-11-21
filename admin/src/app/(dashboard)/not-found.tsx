import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold">Страница не найдена</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Возможно, запись была удалена или ссылка устарела.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
        На главную
      </Link>
    </div>
  );
}
