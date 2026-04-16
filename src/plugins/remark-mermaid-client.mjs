import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts mermaid fenced code blocks into
 * <pre class="mermaid"> HTML nodes for client-side rendering.
 * This must run before astro-expressive-code so that mermaid blocks
 * are converted to raw HTML before expressive-code processes code nodes.
 */
export function remarkMermaidClient() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid') return;

      const escaped = node.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      parent.children[index] = {
        type: 'html',
        value: `<pre class="mermaid">${escaped}</pre>`,
      };
    });
  };
}
