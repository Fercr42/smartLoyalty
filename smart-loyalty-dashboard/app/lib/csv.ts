// Celda de CSV para Excel (separador ";").
// Un texto que empieza con = + - @ lo ejecuta Excel como fórmula (un cliente puede poner eso de nombre).
// Se antepone un apóstrofo para que se vea como texto.
export const cell = (value: unknown) => {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
