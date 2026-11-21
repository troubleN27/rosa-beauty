/**
 * Telegram messages sent to clients by admin actions, in the client's language.
 * Tone matches the bot (bot/app/i18n): short, friendly, a few emoji.
 */
import type { Lang } from "@/lib/format";

type Template = (params: Record<string, string>) => string;

const MESSAGES: Record<"cancelled" | "rescheduled", Record<Lang, Template>> = {
  cancelled: {
    ru: (p) =>
      `❌ <b>Ваша запись отменена</b>\n\n💇‍♀️ ${p.service}\n👩‍🎨 ${p.master}\n📅 ${p.when}\n\n` +
      `Если хотите выбрать другое время — запишитесь в боте через «✨ Записаться» или позвоните нам: ${p.phone}`,
    en: (p) =>
      `❌ <b>Your booking has been cancelled</b>\n\n💇‍♀️ ${p.service}\n👩‍🎨 ${p.master}\n📅 ${p.when}\n\n` +
      `To pick another time, tap «✨ Book now» in the bot or call us: ${p.phone}`,
  },
  rescheduled: {
    ru: (p) =>
      `🔁 <b>Ваша запись перенесена</b>\n\n💇‍♀️ ${p.service}\n👩‍🎨 ${p.master}\n` +
      `📅 Было: ${p.old}\n📅 Стало: ${p.when}\n📍 ${p.address}\n\nЕсли новое время не подходит — позвоните нам: ${p.phone}`,
    en: (p) =>
      `🔁 <b>Your booking has been rescheduled</b>\n\n💇‍♀️ ${p.service}\n👩‍🎨 ${p.master}\n` +
      `📅 Was: ${p.old}\n📅 Now: ${p.when}\n📍 ${p.address}\n\nIf the new time doesn't work for you, please call us: ${p.phone}`,
  },
};

export function clientMessage(
  kind: keyof typeof MESSAGES,
  lang: string,
  params: Record<string, string>,
): string {
  const language: Lang = lang === "en" ? "en" : "ru";
  return MESSAGES[kind][language](params);
}
