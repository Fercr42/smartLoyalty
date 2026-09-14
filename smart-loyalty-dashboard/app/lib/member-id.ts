// Id de la tarjeta del cliente guardado en este navegador (uno por restaurante).

const key = (companyId: string) => `wallet-member:${companyId}`;

export function getMemberId(companyId: string) {
  let memberId = "";
  try {
    memberId = localStorage.getItem(key(companyId)) ?? "";
  } catch {}
  if (!memberId) {
    memberId = crypto.randomUUID();
    setMemberId(companyId, memberId);
  }
  return memberId;
}

export function setMemberId(companyId: string, memberId: string) {
  try {
    localStorage.setItem(key(companyId), memberId);
  } catch {}
}
