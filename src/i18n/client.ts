/**
 * Client-side i18n utility.
 *
 * Reads the user's language preference from localStorage and returns
 * translated strings. Used by Svelte components that run in the browser.
 *
 * For server-rendered pages, use i18n() from ./translation.ts.
 */

import type I18nKey from "./i18nKey";
import { getTranslation } from "./translation";

export function getClientLang(): string {
	if (typeof window !== "undefined") {
		return localStorage.getItem("lang") || "en";
	}
	return "en";
}

export function clientI18n(key: I18nKey): string {
	return getTranslation(getClientLang())[key];
}

export function setClientLang(lang: string): void {
	localStorage.setItem("lang", lang);
}
