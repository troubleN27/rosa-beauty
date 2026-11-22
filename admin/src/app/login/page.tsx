import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Flourish } from "@/components/brand";
import { auth } from "@/lib/auth";

import salonEvening from "../../../public/brand/salon-evening.jpg";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(440px,1fr)]">
      {/* The evening salon, framed like the arched vanity mirror */}
      <section
        aria-hidden
        className="relative flex justify-center overflow-hidden bg-[#170e13] px-6 pt-10 pb-8 lg:items-center lg:p-14"
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_45%,#d8aa6233,transparent_70%),radial-gradient(80%_60%_at_100%_100%,#5a1f3a66,transparent_70%)]" />
        <div className="relative aspect-[3/4] w-full max-w-[200px] sm:max-w-[240px] lg:max-w-[440px]">
          <div className="arch absolute -inset-2.5 border border-[#d8aa62]/40 lg:-inset-4" />
          <div className="arch absolute inset-0 overflow-hidden shadow-[0_0_60px_-10px_#d8aa6288] ring-1 ring-[#d8aa62]/70">
            <Image
              src={salonEvening}
              alt=""
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 440px, 240px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="flex items-start justify-center px-4 pt-10 pb-12 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image src="/brand/emblem.png" alt="" width={498} height={720} priority className="hidden h-28 w-auto lg:block" />
            <p className="font-display text-3xl font-semibold tracking-wide lg:mt-5">Rosa Beauty</p>
            <Flourish className="mt-3" />
            <h1 className="mt-6 font-display text-2xl font-medium italic">Вход в панель салона</h1>
            <p className="mt-2 text-sm text-muted-foreground">Email и пароль администратора.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
