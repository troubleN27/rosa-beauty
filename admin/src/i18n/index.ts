import { enGB, ru as ruLocale } from "date-fns/locale";

import en from "./en.json";
import ru from "./ru.json";

/**
 * Admin panel translations. Texts live in ru.json / en.json; components call t("section.key").
 * Shared by server and client code.
 */

export const LANGS = ["ru", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "ru";
export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return value === "ru" || value === "en";
}

type Plural = { one: string; other: string; few?: string; many?: string };
type Dict = typeof ru;

// "nav.home", "status.confirmed", ... — every leaf of the dictionary; plural objects count as leaves
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends { other: string }
      ? `${P}${K}`
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dict>;
export type Params = Record<string, string | number>;

const DICTIONARIES: Record<Lang, unknown> = { ru, en };

function lookup(lang: Lang, key: string): string | Plural | undefined {
  let node: unknown = DICTIONARIES[lang];
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" || (node && typeof node === "object" && "other" in node)
    ? (node as string | Plural)
    : undefined;
}

function fill(text: string, params?: Params) {
  return params ? text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match)) : text;
}

/** Translate a key; plural entries pick their form by params.count. Falls back to Russian, then to the key. */
export function translate(lang: Lang, key: MessageKey | string, params?: Params): string {
  const value = lookup(lang, key) ?? lookup(DEFAULT_LANG, key);
  if (value === undefined) return key;
  if (typeof value === "string") return fill(value, params);
  const count = Number(params?.count ?? 0);
  const form = new Intl.PluralRules(lang).select(count) as keyof Plural;
  return fill(value[form] ?? value.other, params);
}

/**
 * Messages that travel as data (validation and Server Action errors) are keys with optional
 * parameters: "validation.maxLength|max=120". Anything that is not a known key is shown as is.
 */
export function translateMessage(lang: Lang, message: string | undefined): string {
  if (!message) return "";
  const [key, ...rest] = message.split("|");
  if (lookup(DEFAULT_LANG, key) === undefined) return message;
  const params: Params = {};
  for (const pair of rest) {
    const [name, ...value] = pair.split("=");
    params[name] = value.join("=");
  }
  return translate(lang, key, params);
}

/** Build a message key with parameters, to be translated where it is shown. */
export function messageKey(key: MessageKey, params?: Params): string {
  if (!params) return key;
  return [key, ...Object.entries(params).map(([name, value]) => `${name}=${value}`)].join("|");
}

/** Bilingual data (services, masters): the panel language, falling back to Russian. */
export function pick(lang: Lang, ruText: string, enText: string | null | undefined): string {
  return lang === "en" && enText ? enText : ruText;
}

export function dateLocale(lang: Lang) {
  return lang === "en" ? enGB : ruLocale;
}

export type I18n = {
  lang: Lang;
  t: (key: MessageKey, params?: Params) => string;
  tm: (message: string | undefined) => string;
  pick: (ruText: string, enText: string | null | undefined) => string;
};

export function createI18n(lang: Lang): I18n {
  return {
    lang,
    t: (key, params) => translate(lang, key, params),
    tm: (message) => translateMessage(lang, message),
    pick: (ruText, enText) => pick(lang, ruText, enText),
  };
}
