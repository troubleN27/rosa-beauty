/**
 * Telegram messages sent to clients by admin actions, in the client's language.
 * Styled like the bot (bot/app/i18n, SPEC 4.2.1): a rose heading and «🌟» bullets.
 */
import type { Lang } from "@/lib/format";

type Template = (params: Record<string, string>) => string;

const MESSAGES: Record<"cancelled" | "rescheduled", Record<Lang, Template>> = {
  cancelled: {
    ru: (p) =>
      `🌹 <b>Ваш визит отменён</b>\n\n🌟 ${p.service}\n🌟 Мастер — ${p.master}\n🌟 ${p.when}\n\n` +
      `Нам жаль, что встреча не состоится. Выбрать другое время можно в боте через «🌹 Записаться» ` +
      `или по телефону ${p.phone}.`,
    en: (p) =>
      `🌹 <b>Your visit has been cancelled</b>\n\n🌟 ${p.service}\n🌟 Master — ${p.master}\n🌟 ${p.when}\n\n` +
      `We're sorry we won't see you this time. To pick another time, tap «🌹 Book now» in the bot ` +
      `or call us: ${p.phone}.`,
  },
  rescheduled: {
    ru: (p) =>
      `🌹 <b>Ваш визит перенесён</b>\n\n🌟 ${p.service}\n🌟 Мастер — ${p.master}\n` +
      `🌟 Было: ${p.old}\n🌟 Стало: ${p.when}\n🌟 ${p.address}\n\n` +
      `Если новое время вам не подходит, позвоните нам, пожалуйста: ${p.phone}.`,
    en: (p) =>
      `🌹 <b>Your visit has been rescheduled</b>\n\n🌟 ${p.service}\n🌟 Master — ${p.master}\n` +
      `🌟 Was: ${p.old}\n🌟 Now: ${p.when}\n🌟 ${p.address}\n\n` +
      `If the new time doesn't suit you, please call us: ${p.phone}.`,
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
