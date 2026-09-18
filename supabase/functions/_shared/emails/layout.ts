/**
 * Layout e componentes dos e-mails, portados do gerador dos mockups aprovados
 * (openspec/changes/emails-transacionais-pedido/mockups/gerar_mockups.py).
 *
 * HTML de e-mail: tabelas e estilos inline, 600px de largura máxima. Os
 * componentes recebem HTML já escapado; quem monta o conteúdo usa esc().
 */
import { brl, esc } from "./format.ts";

export const SITE_URL = "https://goleirovitor.com.br";

const INK = "#0a0a0a";
const TEXT = "#404040";
const MUTED = "#737373";
const LINE = "#e5e5e5";
const BG = "#f5f5f5";
const CARD = "#ffffff";
const AMBER = "#f59e0b";
const AMBER_SOFT = "#fffbeb";
const AMBER_LINE = "#fde68a";
const FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const strong = (html: string) => `<strong style="color:${INK};">${html}</strong>`;

export function page(opts: {
  subject: string;
  preheader: string;
  body: string;
  footerNote: string;
  helpLine?: string;
}): string {
  const help = opts.helpLine ?? "Dúvidas? É só responder este e-mail.";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(opts.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:${BG}; }
  a { color:${INK}; }
  @media (max-width: 620px) {
    .wrap { padding: 0 !important; }
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
    .h1 { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(opts.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td class="wrap" align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${CARD};border-radius:16px;overflow:hidden;">
    <tr><td style="background:${INK};padding:26px 32px 22px;" class="pad">
      <a href="${SITE_URL}" style="text-decoration:none;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:3px;color:#fafafa;">GOLEIRO VITOR</a>
    </td></tr>
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${AMBER};background-image:linear-gradient(90deg,#f59e0b,#fbbf24,#fde68a);">&nbsp;</td></tr>
    <tr><td class="pad" style="padding:36px 32px 8px;font-family:${FONT};">
${opts.body}
    </td></tr>
    <tr><td class="pad" style="padding:28px 32px 32px;font-family:${FONT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${LINE};padding-top:20px;font-size:12px;line-height:1.6;color:${MUTED};">
        ${help}<br>
        ${opts.footerNote}<br>
        <a href="${SITE_URL}" style="color:${MUTED};">goleirovitor.com.br</a>
      </td></tr></table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
}

export const eyebrow = (t: string) =>
  `<p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b45309;">${t}</p>`;

export const h1 = (t: string) =>
  `<h1 class="h1" style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;color:${INK};">${t}</h1>`;

export const p = (t: string, mb = 16) =>
  `<p style="margin:0 0 ${mb}px;font-size:15px;line-height:1.65;color:${TEXT};">${t}</p>`;

export const small = (t: string) =>
  `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${MUTED};">${t}</p>`;

export function button(label: string, href: string, secondary?: string): string {
  const sec = secondary ? `<p style="margin:0 0 24px;font-size:13px;color:${MUTED};">${secondary}</p>` : "";
  const gap = secondary ? "12px" : "24px";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 ${gap};"><tr>
  <td style="border-radius:10px;background:${AMBER};">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:${INK};text-decoration:none;border-radius:10px;">${label}</a>
  </td></tr></table>${sec}`;
}

export function box(inner: string, soft = true): string {
  const [bg, bd] = soft ? [AMBER_SOFT, AMBER_LINE] : ["#fafafa", LINE];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;"><tr>
  <td style="background:${bg};border:1px solid ${bd};border-radius:12px;padding:20px 22px;font-family:${FONT};">${inner}</td></tr></table>`;
}

/** done: etapas concluídas (0-4); current: índice da etapa em andamento. */
export function progress(done: number, current?: number): string {
  const labels = ["Pedido", "Pagamento", "Envio", "Entrega"];
  const cells: string[] = [];
  labels.forEach((label, i) => {
    let [bg, fg, mark] = ["#e5e5e5", "#a3a3a3", String(i + 1)];
    if (i < done) [bg, fg, mark] = [AMBER, INK, "&#10003;"];
    else if (i === current) [bg, fg, mark] = [INK, "#fbbf24", "&#9679;"];
    const labelColor = i < done || i === current ? INK : "#a3a3a3";
    cells.push(`<td align="center" width="64" style="font-family:${FONT};">
      <div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${bg};color:${fg};font-size:13px;font-weight:700;text-align:center;margin:0 auto;">${mark}</div>
      <div style="margin-top:6px;font-size:11px;font-weight:600;color:${labelColor};">${label}</div></td>`);
    if (i < 3) {
      const line = i + 1 < done || i + 1 === current ? AMBER : LINE;
      cells.push(`<td style="padding-bottom:22px;"><div style="height:2px;background:${line};font-size:0;line-height:0;">&nbsp;</div></td>`);
    }
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;"><tr>${cells.join("")}</tr></table>`;
}

export interface EmailItem {
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
}

export interface EmailAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export function formatAddress(a: EmailAddress): string[] {
  const line1 = [a.street, a.number].filter(Boolean).join(", ") + (a.complement ? `, ${a.complement}` : "");
  const cityState = [a.city, a.state].filter(Boolean).join("/");
  const line2 = [a.neighborhood, cityState, a.zip_code].filter(Boolean).join(" · ");
  return [line1, line2].filter((l) => l.trim());
}

export function itemsTable(opts: {
  items: EmailItem[];
  subtotal: number;
  shippingPrice: number;
  shippingName: string | null;
  total: number;
  address: EmailAddress | null;
}): string {
  const rows = opts.items.map((it) => {
    // Sem capa, um bloco neutro do mesmo tamanho mantém a coluna alinhada.
    const img = it.imageUrl
      ? `<img src="${esc(it.imageUrl)}" width="48" height="64" alt="${esc(it.title)}" style="display:block;width:48px;height:64px;object-fit:cover;border-radius:6px;border:1px solid ${LINE};">`
      : `<div style="width:48px;height:64px;border-radius:6px;background:#f5f5f5;border:1px solid ${LINE};"></div>`;
    return `<tr>
      <td width="60" style="padding:12px 0;vertical-align:top;">${img}</td>
      <td style="padding:12px 12px;vertical-align:top;font-family:${FONT};font-size:14px;line-height:1.45;color:${INK};">${esc(it.title)}<br><span style="font-size:12px;color:${MUTED};">Qtd. ${it.quantity}</span></td>
      <td align="right" style="padding:12px 0;vertical-align:top;font-family:${FONT};font-size:14px;color:${INK};white-space:nowrap;">${brl(it.unitPrice * it.quantity)}</td>
    </tr>`;
  }).join("");

  const tot = (label: string, value: string, isTotal = false) => {
    const w = isTotal ? "700" : "400";
    const sz = isTotal ? "17px" : "14px";
    const c = isTotal ? INK : TEXT;
    return `<tr><td colspan="2" style="padding:5px 0;font-family:${FONT};font-size:${sz};font-weight:${w};color:${c};">${label}</td>
      <td align="right" style="padding:5px 0;font-family:${FONT};font-size:${sz};font-weight:${w};color:${c};white-space:nowrap;">${value}</td></tr>`;
  };

  const freteLabel = opts.shippingName ? `Frete · ${esc(opts.shippingName)}` : "Frete";
  const frete = opts.shippingPrice > 0 ? tot(freteLabel, brl(opts.shippingPrice)) : "";
  const addr = opts.address
    ? `<tr><td colspan="3" style="padding-top:18px;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
      <strong style="color:${INK};font-weight:600;">Entrega em</strong><br>${formatAddress(opts.address).map(esc).join("<br>")}</td></tr>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid ${LINE};">
    ${rows}
    <tr><td colspan="3" style="border-top:1px solid ${LINE};padding-top:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
    ${tot("Subtotal", brl(opts.subtotal))}
    ${frete}
    ${tot("Total", brl(opts.total), true)}
    ${addr}
    </table>`;
}

/** Bloco em fonte monoespaçada (copia e cola do Pix, código de rastreio). */
export const mono = (text: string, size = 12) =>
  `<p style="margin:0 0 14px;padding:12px;background:#fff;border:1px dashed ${AMBER_LINE};border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:${size}px;line-height:1.5;color:${TEXT};word-break:break-all;">${esc(text)}</p>`;

export const label = (t: string) => `<p style="margin:0 0 4px;font-size:13px;color:${MUTED};">${t}</p>`;
export const bigValue = (t: string) => `<p style="margin:0 0 16px;font-size:28px;font-weight:700;color:${INK};">${t}</p>`;
export const alert = (t: string) => `<p style="margin:0;font-size:13px;color:#b45309;font-weight:600;">${t}</p>`;
export const trackingCode = (t: string) =>
  `<p style="margin:0 0 14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:24px;font-weight:700;letter-spacing:1px;color:${INK};">${esc(t)}</p>`;
export const detail = (t: string) => `<p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};">${t}</p>`;
