import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_minmax(420px,40%)]">
      <section className="relative hidden overflow-hidden bg-[#2a2124] lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,#c9707d55,transparent_60%),radial-gradient(90%_70%_at_90%_90%,#f6e6e833,transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-[#f6e6e8]">
          <p className="text-lg font-semibold tracking-tight">Rosa Beauty</p>
          <blockquote className="max-w-md text-3xl leading-tight font-medium text-balance">
            Записи, мастера и расписание салона — в одном окне.
          </blockquote>
          <p className="text-sm text-[#f6e6e8]/70">Москва, ул. Пятницкая, 37</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-8 text-lg font-semibold tracking-tight lg:hidden">Rosa Beauty</p>
          <h1 className="text-2xl font-semibold tracking-tight">Вход в панель</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Используйте email и пароль администратора салона.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
