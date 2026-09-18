/** Formatação e escape dos dados que entram nos e-mails. */

const TZ = "America/Sao_Paulo";

/** Escapa texto dinâmico antes de ir para o HTML. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function brl(value: number | string | null | undefined): string {
  // Espaço comum no lugar do NBSP: alguns clientes de e-mail o exibem como "Â".
  return money.format(Number(value ?? 0)).replace(/ /g, " ");
}

/** "18/09 às 23:53", sempre no horário de Brasília. */
export function dateTimeBR(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month} às ${parts.hour}:${parts.minute}`;
}

export function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "";
}
