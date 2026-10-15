// Id de la tarjeta del cliente guardado en este navegador (uno por restaurante).

const key = (companyId: string) => `wallet-member:${companyId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// En iPhone, Safari y el ícono de la pantalla de inicio guardan datos por separado. El enlace que se agrega
// a la pantalla de inicio lleva ?m={tarjeta} para que el ícono use la misma tarjeta y no cree otra.
export const memberIdFromUrl = (search: string) => {
  const m = new URLSearchParams(search).get("m") ?? "";
  return UUID.test(m) ? m.toLowerCase() : "";
};

export function getMemberId(companyId: string) {
  let memberId = "";
  try {
    memberId = localStorage.getItem(key(companyId)) ?? "";
  } catch {}
  if (!memberId) {
    memberId = (typeof location !== "undefined" && memberIdFromUrl(location.search)) || crypto.randomUUID();
    setMemberId(companyId, memberId);
  }
  return memberId;
}

export function setMemberId(companyId: string, memberId: string) {
  try {
    localStorage.setItem(key(companyId), memberId);
  } catch {}
}
