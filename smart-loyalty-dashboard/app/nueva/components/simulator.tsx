"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { confettiPop } from "../../lib/fun";
import { formatColones } from "../../lib/format-money";
import { QRCodeSVG } from "qrcode.react";
import CafeLunaLogo from "./cafeLunaLogo";

// Simulador: el visitante elige cómo premia su negocio, "escanea" compras y ve lo que vive su cliente:
// la tarjeta que se llena y la notificación que llega a la pantalla de bloqueo. Nada se guarda.

type Mode = "sellos" | "puntos" | "cashback";
type Notif = { title: string; body: string; key: number };

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "sellos", label: "Sellos", hint: "1 sello por visita. Con 10, café gratis." },
  { id: "puntos", label: "Puntos", hint: "2 puntos por cada ₡100. Con 400, café gratis." },
  { id: "cashback", label: "Cashback", hint: "5% de cada compra vuelve como saldo." },
];
const AMOUNTS = [4000, 8000, 12000];
const GOAL = { sellos: 10, puntos: 400 };

export default function Simulator() {
  const [mode, setMode] = useState<Mode>("puntos");
  const [amount, setAmount] = useState(12000);
  const [value, setValue] = useState(0); // sellos, puntos o colones de saldo
  const [shown, setShown] = useState(0); // valor que se ve mientras cuenta
  const [notif, setNotif] = useState<Notif | null>(null);
  const [scanning, setScanning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const counter = useRef({ v: 0 });

  // El número de la tarjeta cuenta hasta el valor nuevo.
  useEffect(() => {
    const tween = gsap.to(counter.current, {
      v: value,
      duration: 0.9,
      ease: "power3.out",
      onUpdate: () => setShown(Math.round(counter.current.v)),
    });
    return () => {
      tween.kill();
    };
  }, [value]);

  const choose = (m: Mode) => {
    setMode(m);
    setValue(0);
    counter.current.v = 0;
    setShown(0);
    setNotif(null);
    setLog([]);
  };

  const push = (title: string, body: string) => setNotif({ title, body, key: Date.now() });

  const scan = () => {
    if (scanning) return;
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      const before = value;
      let after = before;
      let line = "";
      if (mode === "sellos") {
        after = Math.min(GOAL.sellos, before + 1);
        line = `+1 sello`;
        if (after === GOAL.sellos && before < GOAL.sellos) push("¡Tu café gratis está listo! ☕", "Muéstralo en caja en tu próxima visita.");
        else if (after === GOAL.sellos - 2) push("Ya casi lo logras", "Te faltan 2 sellos para tu café gratis.");
      } else if (mode === "puntos") {
        const earned = Math.round(amount * 0.02);
        after = before + earned;
        line = `${formatColones(amount)} · +${earned} puntos`;
        if (after >= GOAL.puntos && before < GOAL.puntos) push("¡Tu café gratis está listo! ☕", "Tienes 400 puntos. Muéstralo en caja.");
        else if (after >= GOAL.puntos * 0.7 && before < GOAL.puntos * 0.7) push("Ya casi lo logras", `Te faltan ${GOAL.puntos - after} puntos para tu café gratis.`);
      } else {
        const back = Math.round(amount * 0.05);
        after = before + back;
        line = `${formatColones(amount)} · +${formatColones(back)} de saldo`;
      }
      setValue(after);
      setLog((l) => [line, ...l].slice(0, 4));
      const goal = mode === "cashback" ? Infinity : GOAL[mode];
      if (after >= goal && before < goal) window.setTimeout(() => confettiPop(cardRef.current, 60), 250);
      gsap.fromTo(cardRef.current, { scale: 0.97 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)" });
    }, 520);
  };

  const redeem = () => {
    if (mode === "sellos") setValue(0);
    if (mode === "puntos") setValue((v) => v - GOAL.puntos);
    setLog((l) => ["Premio canjeado en caja", ...l].slice(0, 4));
    setNotif(null);
  };

  const goal = mode === "cashback" ? 0 : GOAL[mode];
  const progress = mode === "cashback" ? 1 : Math.min(1, shown / goal);
  const ready = mode !== "cashback" && value >= goal;
  const status =
    mode === "cashback"
      ? `Saldo para tu próxima compra: ${formatColones(shown)}`
      : ready
        ? "Premio listo: café gratis"
        : mode === "sellos"
          ? `Te faltan ${goal - shown} sellos para tu café gratis`
          : `Te faltan ${Math.max(0, goal - shown)} puntos para tu café gratis`;

  return (
    <div className="nv-sim-grid">
      <div className="nv-sim-controls">
        <p className="nv-sim-step">Elige cómo premias</p>
        <div className="nv-seg" role="group" aria-label="Tipo de programa">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => choose(m.id)} className="nv-seg-btn">
              {m.label}
            </button>
          ))}
        </div>
        <p className="nv-sim-hint">{MODES.find((m) => m.id === mode)!.hint}</p>

        {mode !== "sellos" && (
          <>
            <p className="nv-sim-step">Monto de la compra</p>
            <div className="nv-chips" role="group" aria-label="Monto de la compra">
              {AMOUNTS.map((a) => (
                <button key={a} type="button" aria-pressed={amount === a} onClick={() => setAmount(a)} className="nv-chip">
                  {formatColones(a)}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="nv-sim-actions">
          <button type="button" onClick={scan} className="nv-btn nv-btn-primary" data-cursor="Escanear" disabled={scanning}>
            {scanning ? "Escaneando…" : "Escanear compra"}
          </button>
          {ready && (
            <button type="button" onClick={redeem} className="nv-btn nv-btn-ghost">
              Canjear premio
            </button>
          )}
        </div>

        <ul className="nv-sim-log" aria-label="Últimas compras">
          {log.length === 0 && <li className="nv-sim-log-empty">Todavía no hay compras. Escanea la primera.</li>}
          {log.map((l, i) => (
            <li key={`${l}-${i}`}>{l}</li>
          ))}
        </ul>
        <p className="nv-sim-note">Es una demostración: nada de esto se guarda.</p>
      </div>

      <div className="nv-phone" aria-label="Celular del cliente">
        <div className="nv-phone-screen">
          <div className="nv-phone-top" aria-hidden>
            <span>9:41</span>
            <span className="nv-phone-island" />
            <span>100%</span>
          </div>
          <p className="nv-phone-date" aria-hidden>
            sábado
          </p>

          <div className="nv-notif-slot" aria-live="polite">
            {notif && (
              <div key={notif.key} className="nv-notif">
                <span className="nv-notif-icon" aria-hidden>
                  <CafeLunaLogo size={26} />
                </span>
                <div>
                  <p className="nv-notif-head">
                    Café Luna <span>ahora</span>
                  </p>
                  <p className="nv-notif-title">{notif.title}</p>
                  <p className="nv-notif-body">{notif.body}</p>
                </div>
              </div>
            )}
          </div>

          {/* Pase al estilo Wallet: encabezado, franja con sellos o barra, campos y código. */}
          <div ref={cardRef} className={`nv-wallet ${scanning ? "is-scanning" : ""}`}>
            <div className="nv-wallet-head">
              <CafeLunaLogo size={30} />
              <p className="nv-wallet-name">Café Luna</p>
              <p className="nv-wallet-field nv-wallet-field-right" aria-live="polite">
                <span>{mode === "sellos" ? "SELLOS" : mode === "puntos" ? "PUNTOS" : "SALDO"}</span>
                {mode === "cashback" ? formatColones(shown) : shown.toLocaleString("es-CR")}
              </p>
            </div>

            <div className="nv-wallet-strip">
              {mode === "sellos" ? (
                <div className="nv-wallet-stamps" aria-hidden>
                  {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className={i < shown ? (i === 9 ? "is-on is-gold" : "is-on") : ""} />
                  ))}
                </div>
              ) : (
                <div className="nv-wallet-bar" aria-hidden>
                  <i style={{ transform: `scaleX(${progress})` }} />
                </div>
              )}
              <p className="nv-wallet-status">{status}</p>
            </div>

            <div className="nv-wallet-fields">
              <p className="nv-wallet-field">
                <span>MIEMBRO</span>Ana Solís
              </p>
              <p className="nv-wallet-field">
                <span>PREMIO</span>
                {mode === "cashback" ? "5% de vuelta" : "Café gratis"}
              </p>
            </div>

            <div className="nv-wallet-qr" aria-hidden>
              <QRCodeSVG value="https://smartloyalty.app" size={74} level="M" bgColor="#ffffff" fgColor="#1b120d" />
            </div>
            <p className="nv-wallet-caption">Muestra este código en caja</p>
          </div>
          <p className="nv-phone-foot" aria-hidden>
            Se actualiza sola en Google Wallet
          </p>
        </div>
      </div>
    </div>
  );
}
