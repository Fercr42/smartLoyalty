// Cuentas de la calculadora de la página principal. Se usa en el navegador y en las pruebas.
// Mide la GANANCIA extra (no las ventas): el dueño paga el plan con la ganancia, no con lo que vende.

export const WEEKS_PER_MONTH = 4.3;

export type RoiInput = {
  customers: number; // clientes distintos por semana
  ticket: number; // gasto promedio por visita, en moneda local
  returning: number; // de cada 100, cuántos vuelven una vez más al mes gracias al programa
  margin: number; // % de ganancia sobre cada venta
  planLocal: number; // precio del plan en moneda local
};

export function roi({ customers, ticket, returning, margin, planLocal }: RoiInput) {
  const visits = Math.round(customers * WEEKS_PER_MONTH * (returning / 100));
  const sales = visits * ticket;
  const profit = Math.round(sales * (margin / 100));
  const profitPerVisit = ticket * (margin / 100);
  return {
    visits,
    sales,
    profit,
    net: profit - planLocal,
    // Visitas extra al mes que pagan el plan.
    breakEven: profitPerVisit > 0 ? Math.ceil(planLocal / profitPerVisit) : Infinity,
  };
}
