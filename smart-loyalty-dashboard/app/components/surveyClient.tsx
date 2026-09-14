"use client";
import { useState } from "react";
import { textOn } from "../lib/colors";

// Encuesta de 1 a 5 estrellas después de la visita.

const LABELS = ["", "Muy mal", "Mal", "Regular", "Bien", "¡Excelente!"];

export default function SurveyClient({
  companyId,
  companyName,
  logoUrl,
  brand,
  bg,
  memberId,
}: {
  companyId: string;
  companyName: string;
  logoUrl: string;
  brand: string;
  bg: string;
  memberId: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [askReview, setAskReview] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError("Toca las estrellas para calificar.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, memberId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data.error ?? "No se pudo enviar");
      setAskReview(Boolean(data.askReview));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar. Inténtalo de nuevo.");
      setStatus("idle");
    }
  };

  const shown = hover || rating;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: bg }}>
      <div className="bg-white shadow-sm border rounded-2xl p-7 max-w-sm w-full text-center flex flex-col items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
        ) : null}

        {status === "done" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 text-balance">¡Gracias por tu opinión!</h1>
            {askReview ? (
              <>
                <p className="text-gray-700">
                  Nos alegra que te haya gustado. ¿Nos ayudas con una reseña en Google? Toma menos de un minuto.
                </p>
                <a
                  href={`/r/${companyId}`}
                  className="w-full py-3 rounded-xl font-semibold hover:opacity-90"
                  style={{ background: brand, color: textOn(brand) }}
                >
                  Dejar reseña en Google
                </a>
              </>
            ) : (
              <p className="text-gray-700">{companyName} leerá tu comentario para mejorar. ¡Te esperamos pronto!</p>
            )}
          </>
        ) : (
          <form onSubmit={submit} className="w-full flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 text-balance">¿Cómo te fue en {companyName}?</h1>
            <div className="flex gap-1" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  className="p-1 rounded-lg focus-visible:outline focus-visible:outline-2"
                >
                  <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden>
                    <path
                      d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.5 6.6-.8z"
                      fill={n <= shown ? "#f5b301" : "#e5e7eb"}
                    />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 h-5">{LABELS[shown]}</p>
            {rating > 0 && (
              <textarea
                id="survey-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={rating <= 3 ? "¿Qué podemos mejorar?" : "¿Qué fue lo que más te gustó? (opcional)"}
                className="w-full border rounded-lg p-2 text-sm"
              />
            )}
            <button
              disabled={status === "sending"}
              className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
              style={{ background: brand, color: textOn(brand) }}
            >
              {status === "sending" ? "Enviando..." : "Enviar"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
