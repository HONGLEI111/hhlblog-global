<script lang="ts">
import { type IconData, icons } from "@/lib/icons";

let { icon, class: className = "" }: { icon: string; class?: string } =
	$props();
const data: IconData | undefined = $derived(icons[icon]);
</script>

{#if data}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={data.viewBox}
    width="1em"
    height="1em"
    class={className}
    aria-hidden="true"
    focusable="false"
  >
    {@html data.body}
  </svg>
{/if}
