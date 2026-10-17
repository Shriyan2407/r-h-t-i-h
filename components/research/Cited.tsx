/** Render text with [Q3]/[N1] citations as links to the matching evidence rows (#ev-ID). */
export function Cited({ text }: { text: string }) {
  const parts = text.split(/(\[[A-Z]\d+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[([A-Z]\d+)\]$/.exec(p);
        return m ? (
          <a key={i} href={`#ev-${m[1]}`} aria-label={`evidence ${m[1]}`} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--primary)", textDecoration: "none" }}>[{m[1]}]</a>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}
