import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";
import { ja, ko, zh_TW, vi, es } from "./languages/generated";
import { zh_CN } from "./languages/zh_CN";

export type Translation = {
	[K in I18nKey]: string;
};

const defaultTranslation = en;

const map: { [key: string]: Translation } = {
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh_cn: zh_CN,
	zh_tw: zh_TW,
	ja: ja,
	ja_jp: ja,
	ko: ko,
	ko_kr: ko,
	vi: vi,
	vi_vn: vi,
	es: es,
	es_es: es,
};

export function getTranslation(lang: string): Translation {
	return map[lang.toLowerCase()] || defaultTranslation;
}

export function i18n(key: I18nKey): string {
	const lang = siteConfig.lang || "zh_CN";
	return getTranslation(lang)[key];
}
