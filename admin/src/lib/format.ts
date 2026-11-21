import { formatInTimeZone } from "date-fns-tz";
import { enGB, ru } from "date-fns/locale";

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", RUB: "₽" };
const SYMBOL_AFTER = new Set(["RUB"]);

/** $45, $45.50, 1 500 ₽ — same rules as the bot. */
export function formatPrice(amount: string | number, currency: string): string {
  const value = Number(amount);
  const digits = Number.isInteger(value) ? 0 : 2;
  const number = value
    .toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    .replace(/,/g, " ");
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code];
  if (!symbol) return `${number} ${code}`;
  return SYMBOL_AFTER.has(code) ? `${number} ${symbol}` : `${symbol}${number}`;
}

const LOCALES = { ru, en: enGB };
export type Lang = keyof typeof LOCALES;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Пт, 28 ноября, 14:30" in the salon timezone. */
export function formatDateTime(moment: Date, timezone: string, lang: Lang = "ru"): string {
  return capitalize(formatInTimeZone(moment, timezone, "EEEEEE, d MMMM, HH:mm", { locale: LOCALES[lang] }));
}

/** "Пт, 28 ноября" */
export function formatDay(moment: Date, timezone: string, lang: Lang = "ru"): string {
  return capitalize(formatInTimeZone(moment, timezone, "EEEEEE, d MMMM", { locale: LOCALES[lang] }));
}

export function formatTime(moment: Date, timezone: string): string {
  return formatInTimeZone(moment, timezone, "HH:mm");
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** Digits only, for comparing phone numbers typed in different formats. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}
