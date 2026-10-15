// Texto partido en letras o palabras para animarlo. Los lectores de pantalla leen el texto entero
// (una copia oculta) y no las piezas sueltas.

// Letras "visibles" (grafemas): en tailandés una consonante con su vocal y su tono es una sola pieza.
export function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((s) => s.segment);
  }
  return [...text];
}

export function Chars({ text, className = "" }: { text: string; className?: string }) {
  let i = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="nv-chars">
        {text.split(" ").map((word, w) => (
          <span key={w} className="nv-word">
            {graphemes(word).map((ch, c) => (
              <span key={c} className="nv-char-mask">
                <span className="nv-char" style={{ ["--i" as string]: i++ }}>
                  {ch}
                </span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Words({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.split(" ").map((word, i) => (
          <span key={i}>
            <span className="nv-wmask">
              <span className="nv-w" style={{ ["--i" as string]: i }}>
                {word}
              </span>
            </span>{" "}
          </span>
        ))}
      </span>
    </span>
  );
}
