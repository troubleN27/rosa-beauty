import type { Metadata } from "next";
import { Cormorant_Garamond, Golos_Text } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

import "./globals.css";

const golos = Golos_Text({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: "Rosa Beauty", template: "%s · Rosa Beauty" },
    description: t("meta.description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getI18n();
  return (
    <html lang={lang} className={`${golos.variable} ${cormorant.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <I18nProvider lang={lang}>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="top-right" richColors={false} />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
