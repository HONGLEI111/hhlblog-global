<script lang="ts">
	import I18nKey from "@i18n/i18nKey";
	import { clientI18n } from "@i18n/client";
	import Icon from "@iconify/svelte";

	const languages: { code: string; label: string }[] = [
		{ code: "en", label: "English" },
		{ code: "zh_CN", label: "简体中文" },
		{ code: "zh_TW", label: "繁體中文" },
		{ code: "ja", label: "日本語" },
		{ code: "ko", label: "한국어" },
		{ code: "vi", label: "Tiếng Việt" },
		{ code: "es", label: "Español" },
	];

	function getCurrentLang(): string {
		if (typeof window !== "undefined") {
			return localStorage.getItem("lang") || "en";
		}
		return "en";
	}

	let currentLang = $state("en");

	function switchLanguage(langCode: string) {
		currentLang = langCode;
		// Set both cookie (for SSR middleware) and localStorage (for Svelte components)
		localStorage.setItem("lang", langCode);
		document.cookie = `lang=${langCode};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
		window.location.reload();
	}

	function showPanel() {
		const panel = document.querySelector("#lang-panel");
		panel?.classList.remove("float-panel-closed");
	}

	function hidePanel() {
		const panel = document.querySelector("#lang-panel");
		panel?.classList.add("float-panel-closed");
	}

	import { onMount } from "svelte";
	onMount(() => {
		currentLang = getCurrentLang();
	});
</script>

<div class="relative z-50" onmouseleave={hidePanel}>
	<button
		aria-label="Language"
		class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
		onclick={showPanel}
		onmouseenter={showPanel}
	>
		<Icon icon="material-symbols:translate" class="text-[1.25rem]"></Icon>
	</button>

	<div
		id="lang-panel"
		class="hidden lg:block absolute transition pt-5 -right-2 top-11 float-panel-closed"
	>
		<div class="card-base float-panel p-2 min-w-[160px]">
			{#each languages as lang}
				<button
					class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
					class:current-theme-btn={currentLang === lang.code}
					onclick={() => switchLanguage(lang.code)}
				>
					<span class="text-sm">{lang.label}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
