// Texto partido en letras o palabras para animarlo. Los lectores de pantalla leen el texto entero
// (una copia oculta) y no las piezas sueltas.

export function Chars({ text, className = "" }: { text: string; className?: string }) {
  let i = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="nv-chars">
        {text.split(" ").map((word, w) => (
          <span key={w} className="nv-word">
            {[...word].map((ch, c) => (
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
