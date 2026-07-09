<script lang="ts">
  import I18nKey from "@i18n/i18nKey";
  import { i18n } from "@i18n/translation";
  import Icon from "@iconify/svelte";
  import { onMount } from "svelte";
  import type { SearchResult } from "@/global";

  let keyword = $state("");
  let results = $state<SearchResult[]>([]);
  let isSearching = $state(false);
  let initialized = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Read ?q= from URL on mount
  const getInitialKeyword = (): string => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("q") || "";
    }
    return "";
  };

  const search = async () => {
    if (!initialized || !keyword.trim()) {
      results = [];
      return;
    }
    isSearching = true;

    try {
      if (import.meta.env.PROD && window.pagefind) {
        const response = await window.pagefind.search(keyword);
        results = await Promise.all(
          response.results.map((item) => item.data()),
        );
      } else if (import.meta.env.DEV) {
        results = [
          {
            url: "/",
            meta: { title: "Dev Mode Search Result 1" },
            excerpt: "This is a <mark>mock</mark> result for development.",
          },
          {
            url: "/",
            meta: { title: "Dev Mode Search Result 2" },
            excerpt: "Pagefind only works in <mark>production</mark> build.",
          },
        ].filter(
          (item) =>
            item.excerpt.toLowerCase().includes(keyword.toLowerCase()) ||
            item.meta.title.toLowerCase().includes(keyword.toLowerCase()),
        ) as SearchResult[];
      }
    } catch (error) {
      console.error("Search error:", error);
      results = [];
    } finally {
      isSearching = false;
    }
  };

  const handleInput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(search, 300);
  };

  onMount(() => {
    const init = () => {
      initialized = true;
      const q = getInitialKeyword();
      if (q) {
        keyword = q;
        search();
      }
    };

    if (import.meta.env.DEV) {
      init();
    } else if (window.pagefind) {
      init();
    } else {
      document.addEventListener("pagefindready", init, { once: true });
    }
  });
</script>

<div class="card-base px-6 py-6 md:px-9 md:py-6 mb-4 rounded-[var(--radius-large)]">
    <!-- Title -->
    <div class="mb-4">
        <div class="flex items-center gap-3 mb-3">
            <div class="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white dark:text-black/70">
                <Icon icon="material-symbols:search" class="text-[1.5rem]"></Icon>
            </div>
            <div class="text-3xl font-bold">
                {i18n(I18nKey.search)}
            </div>
        </div>
    </div>

    <!-- Search Input -->
    <div class="relative flex">
        <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icon icon="material-symbols:search" class="text-2xl text-black/50 dark:text-white/50" />
            </div>
            <input
                type="text"
                class="block w-full p-4 pl-10 text-sm bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] hover:border-black/20 dark:hover:border-white/20 text-black/75 dark:text-white/75 placeholder:opacity-50 transition-colors outline-hidden"
                placeholder={i18n(I18nKey.search)}
                bind:value={keyword}
                oninput={handleInput}
            >
        </div>
    </div>
</div>

<div class="grid grid-cols-1 gap-4">
    {#if isSearching}
        <div class="flex justify-center py-10">
            <Icon icon="svg-spinners:ring-resize" class="text-4xl text-[var(--primary)]" />
        </div>
    {:else if results.length > 0}
        <div class="space-y-4">
            {#each results as item}
                <div class="card-base p-6 block rounded-[var(--radius-large)]">
                    <a href={item.url} class="block group">
                        <h5 class="mb-2 text-2xl font-bold tracking-tight group-hover:text-[var(--primary)] transition-colors">
                            {@html item.meta.title}
                        </h5>
                        <p class="font-normal text-black/75 dark:text-white/75">
                            {@html item.excerpt}
                        </p>
                    </a>
                </div>
            {/each}
        </div>
    {:else if keyword}
        <div class="card-base p-10 text-center text-black/50 dark:text-white/50 rounded-[var(--radius-large)]">
            {i18n(I18nKey.searchNoResults)}
        </div>
    {:else}
        <div class="card-base p-10 text-center text-black/50 dark:text-white/50 rounded-[var(--radius-large)]">
            {i18n(I18nKey.searchTypeSomething)}
        </div>
    {/if}
</div>

<style>
  :global(mark) {
    background: transparent;
    color: var(--primary);
    font-weight: 600;
    padding: 0 0.1em;
  }
</style>
