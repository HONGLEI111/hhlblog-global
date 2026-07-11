<script lang="ts">
	import { onMount } from "svelte";

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

			const locale = mapLocale(lang);
			if (!locale) return;

			for (const collection of ["posts", "read", "technology"]) {
				const titles = data[collection]?.[locale];
				if (!titles) continue;

				const elements = document.querySelectorAll(
					`[data-collection="${collection}"][data-post-slug]`
				);
				elements.forEach((el) => {
					const slug = el.getAttribute("data-post-slug");
					if (!slug || !titles[slug]) return;

					// Title
					const titleEl = el.querySelector("[data-post-title]");
					if (titleEl && titles[slug].title) {
						titleEl.textContent = titles[slug].title;
					}

					// Description
					const descEl = el.querySelector("[data-post-desc]");
					if (descEl && titles[slug].description) {
						descEl.textContent = titles[slug].description;
					}

					// Category
					const catEl = el.querySelector("[data-post-category]");
					if (catEl && titles[slug].category) {
						catEl.textContent = titles[slug].category;
					}

					// Tags (by order — aligned arrays)
					if (titles[slug].tags?.length > 0) {
						const tagEls = el.querySelectorAll("[data-post-tag]");
						tagEls.forEach((tagEl, i) => {
							if (titles[slug].tags[i]) {
								tagEl.textContent = titles[slug].tags[i];
							}
						});
					}
				});
			}
		} catch {
			// Silently fail
		}
	}

	function mapLocale(lang: string): string | null {
		const lower = lang.toLowerCase();
		if (lower === "en" || lower === "en_us") return "en";
		if (lower === "es" || lower === "es_es") return "es";
		return null;
	}
</script>
