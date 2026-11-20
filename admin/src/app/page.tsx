import { Flower2 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
          <Flower2 className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Rosa Beauty</h1>
        <p className="text-sm text-muted-foreground">
          Панель администратора салона. Разделы появятся здесь после настройки входа.
        </p>
      </div>
    </main>
  );
}
