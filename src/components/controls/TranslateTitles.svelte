<script lang="ts">
	import { onMount } from "svelte";

	let applied = false;

	onMount(() => {
		const lang = localStorage.getItem("lang");
		if (!lang || lang === "zh_CN" || lang === "zh_cn") return;

		applyTranslations(lang);
	});

	async function applyTranslations(lang: string) {
		try {
			const resp = await fetch("/translated-titles.json");
			if (!resp.ok) return;
			const data = await resp.json();

			// Map language code
			const locale = mapLocale(lang);
			if (!locale) return;

			// Walk all collections
			for (const collection of ["posts", "read", "technology"]) {
				const titles = data[collection]?.[locale];
				if (!titles) continue;

				// Find all elements with data-post-slug in this collection
				const elements = document.querySelectorAll(`[data-collection="${collection}"][data-post-slug]`);
				elements.forEach((el) => {
					const slug = el.getAttribute("data-post-slug");
					if (!slug || !titles[slug]) return;

					// Replace title
					const titleEl = el.querySelector("[data-post-title]");
					if (titleEl && titles[slug].title) {
						titleEl.textContent = titles[slug].title;
					}

					// Replace description
					const descEl = el.querySelector("[data-post-desc]");
					if (descEl && titles[slug].description) {
						descEl.textContent = titles[slug].description;
					}
				});
			}

			applied = true;
		} catch (e) {
			// Silently fail — keep original Chinese titles
		}
	}

	function mapLocale(lang: string): string | null {
		const lower = lang.toLowerCase();
		if (lower === "en" || lower === "en_us") return "en";
		if (lower === "es" || lower === "es_es") return "es";
		return null;
	}
</script>

<!-- This component renders nothing — it's logic-only -->
