import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";

export type Translation = {
	[K in I18nKey]: string;
};

const defaultTranslation = en;

// English-only build: ./languages holds just the English dictionary. The
// lookup stays so `i18n(key)` keeps its existing call signature everywhere.
const map: { [key: string]: Translation } = {
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
};

export function getTranslation(lang: string): Translation {
	return map[lang.toLowerCase()] || defaultTranslation;
}

export function i18n(key: I18nKey): string {
	const lang = siteConfig.lang || "en";
	return getTranslation(lang)[key];
}
