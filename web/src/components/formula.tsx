import katex from "katex";

/**
 * Renders a LaTeX expression via KaTeX. renderToString is pure — safe to call
 * during SSR, no useEffect/client-only dance needed (unlike our canvas components).
 */
export function Formula({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return (
    <span
      className={block ? "my-3 block overflow-x-auto" : "inline-block"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
