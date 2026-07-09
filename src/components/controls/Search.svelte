<script lang="ts">
  import I18nKey from "@i18n/i18nKey";
  import { i18n } from "@i18n/translation";
  import Icon from "@iconify/svelte";
  import { url } from "@utils/url-utils.ts";
  import { onMount } from "svelte";
  import type { SearchResult } from "@/global";

  let keywordDesktop = $state("");
  let keywordMobile = $state("");
  let result = $state<SearchResult[]>([]);
  let isSearching = $state(false);
  let initialized = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  const MAX_INLINE_RESULTS = 5;

  const fakeResult: SearchResult[] = [
    {
      url: url("/"),
      meta: { title: "This Is a Fake Search Result" },
      excerpt: "Because Pagefind cannot work in the <mark>dev</mark> environment.",
    },
    {
      url: url("/"),
      meta: { title: "If You Want to Test the Search" },
      excerpt: "Try running <mark>pnpm build && pnpm preview</mark> instead.",
    },
  ];

  const togglePanel = () => {
    const panel = document.getElementById("search-panel");
    panel?.classList.toggle("float-panel-closed");
  };

  const closePanel = () => {
    document.getElementById("search-panel")?.classList.add("float-panel-closed");
  };

  const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
    const panel = document.getElementById("search-panel");
    if (!panel) return;
    if (isDesktop) {
      show ? panel.classList.remove("float-panel-closed") : panel.classList.add("float-panel-closed");
    }
  };

  const doSearch = async (keyword: string, isDesktop: boolean): Promise<void> => {
    if (!keyword.trim()) {
      setPanelVisibility(false, isDesktop);
      result = [];
      return;
    }
    if (!initialized) return;

    isSearching = true;

    try {
      let searchResults: SearchResult[] = [];

      if (import.meta.env.PROD && window.pagefind) {
        const response = await window.pagefind.search(keyword);
        searchResults = await Promise.all(
          response.results.map((item) => item.data()),
        );
      } else if (import.meta.env.DEV) {
        searchResults = fakeResult;
      }

      result = searchResults;
      if (searchResults.length > 0) {
        setPanelVisibility(true, isDesktop);
      }
    } catch (error) {
      console.error("Search error:", error);
      result = [];
    } finally {
      isSearching = false;
    }
  };

  const search = (keyword: string, isDesktop: boolean) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(keyword, isDesktop), 300);
  };

  onMount(() => {
    if (import.meta.env.DEV) {
      console.log("Pagefind mock enabled in development mode.");
      initialized = true;
      return;
    }

    if (typeof window !== "undefined" && window.pagefind?.search) {
      console.log("Pagefind already loaded, initializing search immediately.");
      initialized = true;
      return;
    }

    document.addEventListener("pagefindready", () => {
      console.log("Pagefind ready event received.");
      initialized = true;
    }, { once: true });

    document.addEventListener("pagefindloaderror", () => {
      console.warn("Pagefind load error. Search will be limited.");
      initialized = true;
    }, { once: true });

    setTimeout(() => {
      if (!initialized) {
        console.log("Fallback: Initializing search after timeout.");
        initialized = true;
      }
    }, 3000);
  });

  $effect(() => {
    if (initialized) search(keywordDesktop, true);
  });

  $effect(() => {
    if (initialized) search(keywordMobile, false);
  });
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop} onfocus={() => search(keywordDesktop, true)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button onclick={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute z-50 md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder={i18n(I18nKey.search)} bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#if isSearching}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-black/50 dark:text-white/50">
            {i18n(I18nKey.searchLoading)}
        </div>
    {:else if result.length > 0}
        {#each result.slice(0, MAX_INLINE_RESULTS) as item}
            <a href={item.url}
               onclick={() => closePanel()}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
           rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
                <div class="transition inline-flex font-bold group-hover:text-[var(--primary)]">
                    {@html item.meta.title}
                    <Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
                </div>
                {#if item.excerpt.includes('<mark>')}
                    <div class="transition text-sm text-black/50 dark:text-white/50 mt-0.5">
                        {@html item.excerpt}
                    </div>
                {/if}
                {#if item.content?.includes('<mark>')}
                    <div class="transition text-sm mt-0.5 flex items-start gap-1.5">
                        <span class="inline-block rounded-md px-1.5 py-px text-xs font-semibold shrink-0"
                              style="background: var(--btn-plain-bg-active); color: var(--primary)">
                            {i18n(I18nKey.searchContent)}
                        </span>
                        <span class="text-black/30 dark:text-white/30">
                            {@html item.content}
                        </span>
                    </div>
                {/if}
            </a>
        {/each}
        {#if result.length > MAX_INLINE_RESULTS}
            <a href="/search?q={encodeURIComponent(keywordDesktop || keywordMobile)}"
               onclick={() => closePanel()}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)] text-[var(--primary)] font-bold text-center">
                {i18n(I18nKey.searchViewMore).replace('{count}', (result.length - MAX_INLINE_RESULTS).toString())}
                <Icon icon="fa6-solid:arrow-right" class="transition text-[0.75rem] ml-1 inline"></Icon>
            </a>
        {/if}
    {:else if (keywordDesktop || keywordMobile)}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-black/50 dark:text-white/50">
            {i18n(I18nKey.searchNoResults)}
        </div>
    {:else}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-black/50 dark:text-white/50">
            {i18n(I18nKey.searchTypeSomething)}
        </div>
    {/if}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
