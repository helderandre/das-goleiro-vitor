/**
 * Os seis e-mails do pedido. Cada um devolve assunto, prévia, HTML e texto.
 * O conteúdo segue os mockups aprovados em
 * openspec/changes/emails-transacionais-pedido/mockups/.
 */
import { brl, dateTimeBR, esc } from "./format.ts";
import {
  alert, bigValue, box, button, detail, type EmailAddress, type EmailItem, eyebrow, formatAddress,
  h1, itemsTable, label, mono, p, page, progress, SITE_URL, small, strong, trackingCode,
} from "./layout.ts";

export type EmailKind =
  | "pedido_criado"
  | "aguardando_pagamento"
  | "pagamento_recebido"
  | "pagamento_cancelado"
  | "pedido_enviado"
  | "pedido_concluido";

export interface OrderEmailData {
  shortId: string;
  orderUrl: string;
  customerName: string;
  items: EmailItem[];
  subtotal: number;
  shippingPrice: number;
  shippingName: string | null;
  total: number;
  address: EmailAddress | null;
  hasPhysical: boolean;
  /**
   * Pedido já pago. O "pedido criado" enviado manualmente depois do pagamento
   * não pode pedir para o cliente pagar.
   */
  isPaid: boolean;
  /** Prazo de pagamento: criação + 12h. */
  expiresAt: Date;
  paymentLabel: string | null;
  pix?: { qrCode: string | null; ticketUrl: string | null };
  cancel?: { reason: "expired" | "refund" | "store"; refundAmount?: number };
  shipping?: { trackingCode: string; trackingUrl: string; deliveryDays: number | null };
}

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

const footerNote = (d: OrderEmailData) =>
  `Você recebeu este e-mail por causa do pedido ${esc(d.shortId)} na loja Goleiro Vitor.`;

/** Linhas de texto puro do resumo do pedido. */
function textSummary(d: OrderEmailData): string[] {
  const lines = d.items.map((i) => `- ${i.title} (qtd. ${i.quantity}): ${brl(i.unitPrice * i.quantity)}`);
  lines.push(`Subtotal: ${brl(d.subtotal)}`);
  if (d.shippingPrice > 0) lines.push(`Frete${d.shippingName ? ` (${d.shippingName})` : ""}: ${brl(d.shippingPrice)}`);
  lines.push(`Total: ${brl(d.total)}`);
  if (d.address) lines.push("", "Entrega em:", ...formatAddress(d.address));
  return lines;
}

function textEmail(lines: (string | null | undefined)[], d: OrderEmailData): string {
  return [
    ...lines.filter((l) => l !== null && l !== undefined),
    "",
    "—",
    "Dúvidas? É só responder este e-mail.",
    `Você recebeu este e-mail por causa do pedido ${d.shortId} na loja Goleiro Vitor.`,
    SITE_URL,
  ].join("\n");
}

const greet = (d: OrderEmailData, fallback: string) => (d.customerName ? `${fallback}, ${esc(d.customerName)}` : fallback);

function table(d: OrderEmailData, withAddress = true): string {
  return itemsTable({
    items: d.items,
    subtotal: d.subtotal,
    shippingPrice: d.shippingPrice,
    shippingName: d.shippingName,
    total: d.total,
    address: withAddress ? d.address : null,
  });
}

// ---------------------------------------------------------------------------

function pedidoCriado(d: OrderEmailData): RenderedEmail {
  const prazo = dateTimeBR(d.expiresAt);
  const subject = `Recebemos seu pedido ${d.shortId}`;
  const thanks = d.customerName ? `Obrigado, ${d.customerName}! ` : "Obrigado! ";
  const preheader = d.isPaid
    ? `${thanks}Seu pedido está confirmado e o pagamento já foi recebido.`
    : `${thanks}Seu pedido está reservado por 12 horas enquanto aguardamos o pagamento.`;

  const lead = d.isPaid
    ? `Seu pedido está confirmado e o pagamento já foi recebido.${d.hasPhysical ? " Agora vamos preparar o envio dos seus livros." : ""}`
    : d.hasPhysical
    ? "Os livros já estão reservados para você. Assim que o pagamento for confirmado, começamos a preparar o envio."
    : "Seu pedido já está registrado. Assim que o pagamento for confirmado, avisamos você.";

  const deadline = d.isPaid
    ? ""
    : box(p(`${strong(`Pague até ${prazo}.`)} Depois disso o pedido é cancelado automaticamente${d.hasPhysical ? " e os livros voltam para o estoque" : ""}.`, 0));

  const body = eyebrow(`Pedido ${esc(d.shortId)}`)
    + h1(`${greet(d, "Recebemos seu pedido")}!`)
    + p(lead)
    + (d.isPaid ? progress(2, 2) : progress(1, 1)) + table(d)
    + deadline
    + button("Ver meu pedido", d.orderUrl);
  const text = textEmail([
    `${d.customerName ? `${d.customerName}, r` : "R"}ecebemos seu pedido ${d.shortId}!`, "",
    ...textSummary(d), "",
    d.isPaid
      ? "Seu pedido está confirmado e o pagamento já foi recebido."
      : `Pague até ${prazo}. Depois disso o pedido é cancelado automaticamente.`,
    `Ver meu pedido: ${d.orderUrl}`,
  ], d);
  return { subject, preheader, html: page({ subject, preheader, body, footerNote: footerNote(d) }), text };
}

function aguardandoPagamento(d: OrderEmailData): RenderedEmail {
  const prazo = dateTimeBR(d.expiresAt);
  const subject = `Seu Pix de ${brl(d.total)} vence ${prazo} — pedido ${d.shortId}`;
  const qr = d.pix?.qrCode ?? null;
  const ticket = d.pix?.ticketUrl ?? null;
  const preheader = qr
    ? "Copie o código Pix ou abra o QR Code para concluir a compra."
    : "Conclua o pagamento pela página do pedido.";

  const pixBox = label("Valor") + bigValue(brl(d.total))
    + (qr ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Pix copia e cola</p>` + mono(qr) : "")
    + alert(`&#9201; Vence em ${prazo}`);

  const cta = qr && ticket
    ? button("Abrir QR Code", ticket, `ou <a href="${esc(d.orderUrl)}" style="color:#0a0a0a;">veja o pedido na loja</a>`)
    : button("Pagar pelo pedido", d.orderUrl);

  const body = eyebrow(`Pedido ${esc(d.shortId)}`) + h1("Seu Pix está pronto")
    + p(qr
      ? "Copie o código abaixo no app do seu banco, ou abra o QR Code. A confirmação é automática — você recebe outro e-mail assim que o pagamento cair."
      : "Conclua o pagamento pela página do pedido. A confirmação é automática — você recebe outro e-mail assim que o pagamento cair.")
    + box(pixBox) + cta
    + small(`Se o Pix não for pago até ${prazo}, o pedido é cancelado${d.hasPhysical ? " e os livros voltam para o estoque" : ""}. Você pode fazer um novo pedido quando quiser.`);

  const text = textEmail([
    `Seu Pix do pedido ${d.shortId} está pronto.`, "",
    `Valor: ${brl(d.total)}`,
    `Vence em: ${prazo}`,
    qr ? "" : null,
    qr ? "Pix copia e cola:" : null,
    qr,
    ticket ? `QR Code: ${ticket}` : null,
    `Pedido: ${d.orderUrl}`, "",
    `Se o Pix não for pago até ${prazo}, o pedido é cancelado.`,
  ], d);
  return { subject, preheader, html: page({ subject, preheader, body, footerNote: footerNote(d) }), text };
}

function pagamentoRecebido(d: OrderEmailData): RenderedEmail {
  const subject = `Pagamento confirmado — pedido ${d.shortId}`;
  const preheader = d.hasPhysical
    ? "Recebemos seu pagamento. Agora é com a gente: vamos preparar e enviar seus livros."
    : "Recebemos seu pagamento.";
  const via = d.paymentLabel ? ` via ${strong(esc(d.paymentLabel))}` : "";
  const body = eyebrow(`Pedido ${esc(d.shortId)}`) + h1("Pagamento confirmado!")
    + p(`Tudo certo${d.customerName ? `, ${esc(d.customerName)}` : ""}. Recebemos ${strong(brl(d.total))}${via}.${d.hasPhysical ? " Agora vamos separar e embalar seus livros." : ""}`)
    + progress(2, 2) + table(d)
    + (d.hasPhysical
      ? box(p(`${strong("Próximo passo:")} quando o pacote for postado, você recebe o código de rastreio por e-mail.`, 0))
      : "")
    + button("Acompanhar pedido", d.orderUrl);
  const text = textEmail([
    `Pagamento confirmado — pedido ${d.shortId}.`,
    `Recebemos ${brl(d.total)}${d.paymentLabel ? ` via ${d.paymentLabel}` : ""}.`, "",
    ...textSummary(d), "",
    d.hasPhysical ? "Quando o pacote for postado, você recebe o código de rastreio por e-mail." : null,
    `Acompanhar pedido: ${d.orderUrl}`,
  ], d);
  return { subject, preheader, html: page({ subject, preheader, body, footerNote: footerNote(d) }), text };
}

function pagamentoCancelado(d: OrderEmailData): RenderedEmail {
  const reason = d.cancel?.reason ?? "store";
  const subject = `Pedido ${d.shortId} cancelado`;
  const oi = d.customerName ? `Oi, ${esc(d.customerName)}. ` : "";
  let lead: string;
  let extra = "";
  let preheader: string;
  let textLead: string;

  if (reason === "expired") {
    lead = `${oi}Não identificamos o pagamento do pedido ${esc(d.shortId)} dentro de 12 horas, então ele foi cancelado${d.hasPhysical ? " e os livros voltaram para o estoque" : ""}.`;
    extra = box(p(`${strong("Já pagou?")} Se o dinheiro saiu da sua conta, responda este e-mail com o comprovante que resolvemos na hora.`, 0));
    preheader = "O prazo de pagamento terminou e o pedido foi cancelado. Você pode fazer um novo quando quiser.";
    textLead = `Não identificamos o pagamento do pedido ${d.shortId} dentro de 12 horas, então ele foi cancelado. Se você já pagou, responda este e-mail com o comprovante.`;
  } else if (reason === "refund") {
    const amount = brl(d.cancel?.refundAmount ?? d.total);
    const prazo = d.paymentLabel?.startsWith("Pix")
      ? "No Pix, o valor volta para a conta de origem em instantes."
      : d.paymentLabel?.startsWith("Crédito")
      ? "No cartão de crédito, o valor pode levar até 2 faturas para aparecer."
      : "O prazo para o valor aparecer depende da forma de pagamento.";
    lead = `${oi}O pedido ${esc(d.shortId)} foi cancelado e estornamos ${strong(amount)}. ${prazo}`;
    preheader = `Estornamos ${amount} do pedido ${d.shortId}.`;
    textLead = `O pedido ${d.shortId} foi cancelado e estornamos ${amount}. ${prazo}`;
  } else {
    lead = `${oi}Seu pedido ${esc(d.shortId)} foi cancelado pela nossa equipe. Se tiver dúvidas, é só responder este e-mail.`;
    preheader = `O pedido ${d.shortId} foi cancelado.`;
    textLead = `Seu pedido ${d.shortId} foi cancelado pela nossa equipe. Se tiver dúvidas, responda este e-mail.`;
  }

  const body = eyebrow(`Pedido ${esc(d.shortId)}`) + h1("Seu pedido foi cancelado") + p(lead) + extra
    + button(reason === "expired" ? "Fazer um novo pedido" : "Voltar à loja", SITE_URL);
  const text = textEmail([textLead, "", `Loja: ${SITE_URL}`], d);
  return { subject, preheader, html: page({ subject, preheader, body, footerNote: footerNote(d) }), text };
}

function pedidoEnviado(d: OrderEmailData): RenderedEmail {
  const s = d.shipping!;
  const subject = `Seu pedido ${d.shortId} está a caminho`;
  const preheader = `Rastreio ${s.trackingCode} — acompanhe a entrega dos seus livros.`;
  const prazo = s.deliveryDays ? `Prazo estimado: ${strong(`${s.deliveryDays} dia(s) úteis`)}` : "";
  const trackBox = label("Código de rastreio") + trackingCode(s.trackingCode)
    + detail([d.shippingName ? esc(d.shippingName) : "", prazo].filter(Boolean).join("<br>"));
  const body = eyebrow(`Pedido ${esc(d.shortId)}`) + h1("Seu pedido está a caminho!")
    + p(`Boa notícia${d.customerName ? `, ${esc(d.customerName)}` : ""}: seus livros foram postados.`)
    + progress(3, 3) + box(trackBox) + button("Rastrear meu pedido", s.trackingUrl)
    + small("O rastreio pode levar algumas horas para mostrar as primeiras movimentações depois da postagem.")
    + table(d);
  const text = textEmail([
    `Seu pedido ${d.shortId} foi postado.`, "",
    `Código de rastreio: ${s.trackingCode}`,
    d.shippingName ? `Serviço: ${d.shippingName}` : null,
    s.deliveryDays ? `Prazo estimado: ${s.deliveryDays} dia(s) úteis` : null,
    `Rastrear: ${s.trackingUrl}`, "",
    ...textSummary(d),
  ], d);
  return { subject, preheader, html: page({ subject, preheader, body, footerNote: footerNote(d) }), text };
}

function pedidoConcluido(d: OrderEmailData): RenderedEmail {
  const subject = `Pedido ${d.shortId} entregue`;
  const preheader = "Seus livros chegaram. Boa leitura!";
  const body = eyebrow(`Pedido ${esc(d.shortId)}`) + h1("Seus livros chegaram! 📚")
    + p(`${d.customerName ? `${esc(d.customerName)}, o` : "O"} pedido ${esc(d.shortId)} foi entregue. Obrigado por comprar com a gente — esperamos que a história te inspire dentro e fora de campo.`)
    + progress(4)
    + box(p(`${strong("Algo errado com a entrega?")} Se o pacote chegou danificado ou faltando algum item, responda este e-mail em até 7 dias.`, 0))
    + button("Ver outros livros", SITE_URL) + table(d, false);
  const text = textEmail([
    `O pedido ${d.shortId} foi entregue. Obrigado por comprar com a gente!`, "",
    "Se o pacote chegou danificado ou faltando algum item, responda este e-mail em até 7 dias.", "",
    `Loja: ${SITE_URL}`,
  ], d);
  return { subject, preheader, html: page({ subject, preheader, body, footerNote: footerNote(d) }), text };
}

export function renderOrderEmail(kind: EmailKind, data: OrderEmailData): RenderedEmail {
  switch (kind) {
    case "pedido_criado": return pedidoCriado(data);
    case "aguardando_pagamento": return aguardandoPagamento(data);
    case "pagamento_recebido": return pagamentoRecebido(data);
    case "pagamento_cancelado": return pagamentoCancelado(data);
    case "pedido_enviado": return pedidoEnviado(data);
    case "pedido_concluido": return pedidoConcluido(data);
  }
}
