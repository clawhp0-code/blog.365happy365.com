import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "./ko";
import ko from "./ko";
import en from "./en";

const dictionaries: Record<Locale, Dictionary> = { ko, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
