import type { User } from "firebase/auth";

// Actualiza las tarjetas de Wallet que los clientes ya guardaron.
// Devuelve cuántas cambiaron, o null si falló.
export async function syncWalletCards(user: User): Promise<number | null> {
  try {
    const res = await fetch("/api/wallet/google/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    const data = await res.json();
    return res.ok ? data.updated ?? 0 : null;
  } catch {
    return null;
  }
}
