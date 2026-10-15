// ₡35.900 (formato de Costa Rica, punto de miles). Se usa en el navegador y en el servidor.
export const formatColones = (amount: number) => `₡${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
