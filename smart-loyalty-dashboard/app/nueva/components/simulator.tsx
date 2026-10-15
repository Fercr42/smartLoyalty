"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { confettiPop } from "../../lib/fun";
import { QRCodeSVG } from "qrcode.react";
import CafeLunaLogo from "./cafeLunaLogo";
import { useNvCopy } from "../lib/use-copy";

// Simulador: el visitante elige cómo premia su negocio, "escanea" compras y ve lo que vive su cliente:
// la tarjeta que se llena y la notificación que llega a la pantalla de bloqueo. Nada se guarda.

type Mode = "sellos" | "puntos" | "cashback";
type Notif = { title: string; body: string; key: number };

const MODE_IDS: Mode[] = ["sellos", "puntos", "cashback"];
const GOAL = { sellos: 10, puntos: 400 };

export default function Simulator() {
  const c = useNvCopy();
  const t = c.sim;
  // Montos en la moneda del idioma: colones en español, dólares en los otros.
  const money = (units: number) => c.money(units * t.minor);
  const [mode, setMode] = useState<Mode>("sellos");
  const [amount, setAmount] = useState(t.amounts[t.amounts.length - 1]);
  const [value, setValue] = useState(0); // sellos, puntos o saldo (en colones o centavos)
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
        line = t.lineStamp;
        if (after === GOAL.sellos && before < GOAL.sellos) push(t.readyTitle, t.readyStamps);
        else if (after === GOAL.sellos - 2) push(t.almostTitle, t.almostStamps);
      } else if (mode === "puntos") {
        const earned = Math.round(amount * t.pointsPerUnit);
        after = before + earned;
        line = t.linePoints(money(amount), earned);
        if (after >= GOAL.puntos && before < GOAL.puntos) push(t.readyTitle, t.readyPoints);
        else if (after >= GOAL.puntos * 0.7 && before < GOAL.puntos * 0.7) push(t.almostTitle, t.almostPoints(GOAL.puntos - after));
      } else {
        const back = Math.round(amount * t.minor * 0.05); // 5% en la unidad menor (colón o centavo)
        after = before + back;
        line = t.lineCash(money(amount), c.money(back));
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
    setLog((l) => [t.redeemed, ...l].slice(0, 4));
    setNotif(null);
  };

  const goal = mode === "cashback" ? 0 : GOAL[mode];
  const progress = mode === "cashback" ? 1 : Math.min(1, shown / goal);
  const ready = mode !== "cashback" && value >= goal;
  const status =
    mode === "cashback"
      ? t.statusCash(c.money(shown))
      : ready
        ? t.statusReady
        : mode === "sellos"
          ? t.statusStamps(goal - shown)
          : t.statusPoints(Math.max(0, goal - shown));

  return (
    <div className="nv-sim-grid">
      <div className="nv-sim-controls">
        <p className="nv-sim-step">{t.choose}</p>
        <div className="nv-seg" role="group" aria-label={t.programLabel}>
          {MODE_IDS.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => choose(m)} className="nv-seg-btn">
              {t.modes[m]}
            </button>
          ))}
        </div>
        <p className="nv-sim-hint">{t.hints[mode]}</p>

        {mode !== "sellos" && (
          <>
            <p className="nv-sim-step">{t.amount}</p>
            <div className="nv-chips" role="group" aria-label={t.amount}>
              {t.amounts.map((a) => (
                <button key={a} type="button" aria-pressed={amount === a} onClick={() => setAmount(a)} className="nv-chip">
                  {money(a)}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="nv-sim-actions">
          <button type="button" onClick={scan} className="nv-btn nv-btn-primary" data-cursor={t.cursorScan} disabled={scanning}>
            {scanning ? t.scanning : t.scan}
          </button>
          {ready && (
            <button type="button" onClick={redeem} className="nv-btn nv-btn-ghost">
              {t.redeem}
            </button>
          )}
        </div>

        <ul className="nv-sim-log" aria-label={t.logLabel}>
          {log.length === 0 && <li className="nv-sim-log-empty">{t.logEmpty}</li>}
          {log.map((l, i) => (
            <li key={`${l}-${i}`}>{l}</li>
          ))}
        </ul>
        <p className="nv-sim-note">{t.note}</p>
      </div>

      <div className="nv-phone" aria-label={t.phone}>
        <div className="nv-phone-screen">
          <div className="nv-phone-top" aria-hidden>
            <span>9:41</span>
            <span className="nv-phone-island" />
            <span>100%</span>
          </div>
          <p className="nv-phone-date" aria-hidden>
            {t.day}
          </p>

          <div className="nv-notif-slot" aria-live="polite">
            {notif && (
              <div key={notif.key} className="nv-notif">
                <span className="nv-notif-icon" aria-hidden>
                  <CafeLunaLogo size={26} />
                </span>
                <div>
                  <p className="nv-notif-head">
                    Café Luna <span>{t.now}</span>
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
                <span>{t.head[mode]}</span>
                {mode === "cashback" ? c.money(shown) : shown.toLocaleString(c.numberLocale)}
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
                <span>{t.member}</span>Ana Solís
              </p>
              <p className="nv-wallet-field">
                <span>{t.reward}</span>
                {mode === "cashback" ? t.rewardCash : t.rewardFree}
              </p>
            </div>

            <div className="nv-wallet-qr" aria-hidden>
              <QRCodeSVG value="https://smartloyalty.app" size={74} level="M" bgColor="#ffffff" fgColor="#1b120d" />
            </div>
            <p className="nv-wallet-caption">{t.showCode}</p>
          </div>
          <p className="nv-phone-foot" aria-hidden>
            {t.foot}
          </p>
        </div>
      </div>
    </div>
  );
}
