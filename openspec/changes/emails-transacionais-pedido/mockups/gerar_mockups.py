"""Gera os mockups HTML dos e-mails a partir de um layout compartilhado."""
import os, html

OUT = os.path.dirname(os.path.abspath(__file__))  # grava ao lado deste script
os.makedirs(OUT, exist_ok=True)

# ---- identidade (mesma da loja: Inter, neutros, acento âmbar) ----
INK = "#0a0a0a"; TEXT = "#404040"; MUTED = "#737373"; LINE = "#e5e5e5"
BG = "#f5f5f5"; CARD = "#ffffff"; AMBER = "#f59e0b"; AMBER_SOFT = "#fffbeb"; AMBER_LINE = "#fde68a"
FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
SITE = "https://goleirovitor.com.br"

# ---- dados de exemplo (fictícios) ----
ORDER = "#A7F3C2"; ORDER_URL = f"{SITE}/pedido/3f1c9a2e-7d4b-4e8a-9c1f-2b6d8e0a5f13"
NAME = "Mariana"
CAPA1 = "https://cxdxgfwlqdzczwwhdhyz.supabase.co/storage/v1/object/public/products/7628538b-139b-4c03-a26f-f10e0522f805/img1.webp"
CAPA2 = "https://cxdxgfwlqdzczwwhdhyz.supabase.co/storage/v1/object/public/products/f15db26a-7698-43d8-ac4d-7305d3b12063/img01.webp"
ITEMS = [("Verdade de Campeão - Vol. 2: O Sétimo Sobrevivente", 1, "R$ 39,90", CAPA2),
         ("Verdade de Campeão - Vol. 1", 1, "R$ 35,00", CAPA1)]
SUBTOTAL, FRETE_NOME, FRETE, TOTAL = "R$ 74,90", "SEDEX · Correios", "R$ 21,40", "R$ 96,30"
ENDERECO = "Rua das Palmeiras, 120, Apto 34<br>Centro · Jacareí/SP · 12308-200"
PRAZO = "18/09 às 23:53"
PIX = "00020126580014br.gov.bcb.pix0136a1f4c2e8-9b3d-4f7a-8e21-6c5d0b9a7f415204000053039865406096.305802BR5913GOLEIRO VITOR6008JACAREI62070503***6304A1B2"
RASTREIO = "AB123456789BR"; RASTREIO_URL = f"https://www.melhorrastreio.com.br/rastreio/{RASTREIO}"


def page(subject, preheader, body, footer_note, help_line="Dúvidas? É só responder este e-mail."):
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>{html.escape(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body {{ margin:0; padding:0; background:{BG}; }}
  a {{ color:{INK}; }}
  @media (max-width: 620px) {{
    .wrap {{ padding: 0 !important; }}
    .pad {{ padding-left: 20px !important; padding-right: 20px !important; }}
    .h1 {{ font-size: 22px !important; }}
    .stack {{ display:block !important; width:100% !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{BG};">
<!-- preheader: aparece na prévia da caixa de entrada -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{html.escape(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};">
<tr><td class="wrap" align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:{CARD};border-radius:16px;overflow:hidden;">
    <tr><td style="background:{INK};padding:26px 32px 22px;" class="pad">
      <a href="{SITE}" style="text-decoration:none;font-family:{FONT};font-size:13px;font-weight:700;letter-spacing:3px;color:#fafafa;">GOLEIRO VITOR</a>
    </td></tr>
    <tr><td style="height:3px;line-height:3px;font-size:0;background:{AMBER};background-image:linear-gradient(90deg,#f59e0b,#fbbf24,#fde68a);">&nbsp;</td></tr>
    <tr><td class="pad" style="padding:36px 32px 8px;font-family:{FONT};">
{body}
    </td></tr>
    <tr><td class="pad" style="padding:28px 32px 32px;font-family:{FONT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid {LINE};padding-top:20px;font-size:12px;line-height:1.6;color:{MUTED};">
        {help_line}<br>
        {footer_note}<br>
        <a href="{SITE}" style="color:{MUTED};">goleirovitor.com.br</a>
      </td></tr></table>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
"""


def eyebrow(t): return f'<p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#b45309;">{t}</p>'
def h1(t): return f'<h1 class="h1" style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:700;color:{INK};">{t}</h1>'
def p(t, mb=16): return f'<p style="margin:0 0 {mb}px;font-size:15px;line-height:1.65;color:{TEXT};">{t}</p>'
def small(t): return f'<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:{MUTED};">{t}</p>'


def button(label, href, secondary=None):
    sec = f'<p style="margin:0 0 24px;font-size:13px;color:{MUTED};">{secondary}</p>' if secondary else ""
    gap = "12px" if secondary else "24px"
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 {gap};"><tr>
  <td style="border-radius:10px;background:{AMBER};">
    <a href="{href}" style="display:inline-block;padding:14px 28px;font-family:{FONT};font-size:15px;font-weight:700;color:{INK};text-decoration:none;border-radius:10px;">{label}</a>
  </td></tr></table>{sec}"""


def box(inner, soft=True):
    bg, bd = (AMBER_SOFT, AMBER_LINE) if soft else ("#fafafa", LINE)
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;"><tr>
  <td style="background:{bg};border:1px solid {bd};border-radius:12px;padding:20px 22px;font-family:{FONT};">{inner}</td></tr></table>"""


def progress(done, current=None):
    """done: quantas etapas concluídas (0-4). current: índice da etapa em andamento."""
    labels = ["Pedido", "Pagamento", "Envio", "Entrega"]
    cells = []
    for i, lab in enumerate(labels):
        if i < done:
            bg, fg, mark = AMBER, INK, "&#10003;"
        elif i == current:
            bg, fg, mark = INK, "#fbbf24", "&#9679;"
        else:
            bg, fg, mark = "#e5e5e5", "#a3a3a3", str(i + 1)
        lab_color = INK if (i < done or i == current) else "#a3a3a3"
        cells.append(f"""<td align="center" width="64" style="font-family:{FONT};">
      <div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:{bg};color:{fg};font-size:13px;font-weight:700;text-align:center;margin:0 auto;">{mark}</div>
      <div style="margin-top:6px;font-size:11px;font-weight:600;color:{lab_color};">{lab}</div></td>""")
        if i < 3:
            line = AMBER if (i + 1 < done or i + 1 == current) else LINE
            cells.append(f'<td style="padding-bottom:22px;"><div style="height:2px;background:{line};font-size:0;line-height:0;">&nbsp;</div></td>')
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;"><tr>{"".join(cells)}</tr></table>'


def items_table(show_address=True):
    rows = "".join(f"""<tr>
      <td width="60" style="padding:12px 0;vertical-align:top;"><img src="{capa}" width="48" height="64" alt="" style="display:block;width:48px;height:64px;object-fit:cover;border-radius:6px;border:1px solid {LINE};"></td>
      <td style="padding:12px 12px;vertical-align:top;font-family:{FONT};font-size:14px;line-height:1.45;color:{INK};">{t}<br><span style="font-size:12px;color:{MUTED};">Qtd. {q}</span></td>
      <td align="right" style="padding:12px 0;vertical-align:top;font-family:{FONT};font-size:14px;color:{INK};white-space:nowrap;">{pr}</td>
    </tr>""" for t, q, pr, capa in ITEMS)

    def tot(lab, val, strong=False):
        w = "700" if strong else "400"; sz = "17px" if strong else "14px"; c = INK if strong else TEXT
        return f"""<tr><td colspan="2" style="padding:5px 0;font-family:{FONT};font-size:{sz};font-weight:{w};color:{c};">{lab}</td>
      <td align="right" style="padding:5px 0;font-family:{FONT};font-size:{sz};font-weight:{w};color:{c};white-space:nowrap;">{val}</td></tr>"""

    addr = f"""<tr><td colspan="3" style="padding-top:18px;font-family:{FONT};font-size:13px;line-height:1.6;color:{MUTED};">
      <strong style="color:{INK};font-weight:600;">Entrega em</strong><br>{ENDERECO}</td></tr>""" if show_address else ""
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid {LINE};">
    {rows}
    <tr><td colspan="3" style="border-top:1px solid {LINE};padding-top:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
    {tot("Subtotal", SUBTOTAL)}
    {tot(f"Frete · {FRETE_NOME}", FRETE)}
    {tot("Total", TOTAL, strong=True)}
    {addr}
    </table>"""


FOOT_PEDIDO = f"Você recebeu este e-mail por causa do pedido {ORDER} na loja Goleiro Vitor."
FOOT_CONTA = "Você recebeu este e-mail por causa de uma ação na sua conta da loja Goleiro Vitor."

EMAILS = []

# 1 — Pedido criado
EMAILS.append(("01-pedido-criado", "Pedido criado", "create_order grava o pedido",
  f"Recebemos seu pedido {ORDER}",
  f"Obrigado, {NAME}! Seu pedido está reservado por 12 horas enquanto aguardamos o pagamento.",
  eyebrow(f"Pedido {ORDER}") + h1(f"Recebemos seu pedido, {NAME}!")
  + p("Os livros já estão reservados para você. Assim que o pagamento for confirmado, começamos a preparar o envio.")
  + progress(done=1, current=1) + items_table()
  + box(p(f'<strong style="color:{INK};">Pague até {PRAZO}.</strong> Depois disso o pedido é cancelado automaticamente e os livros voltam para o estoque.', 0))
  + button("Ver meu pedido", ORDER_URL), FOOT_PEDIDO))

# 2 — Aguardando pagamento
pix_box = (f'<p style="margin:0 0 4px;font-size:13px;color:{MUTED};">Valor</p>'
           f'<p style="margin:0 0 16px;font-size:28px;font-weight:700;color:{INK};">{TOTAL}</p>'
           f'<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:{INK};">Pix copia e cola</p>'
           f'<p style="margin:0 0 14px;padding:12px;background:#fff;border:1px dashed {AMBER_LINE};border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:{TEXT};word-break:break-all;">{PIX}</p>'
           f'<p style="margin:0;font-size:13px;color:#b45309;font-weight:600;">&#9201; Vence em {PRAZO}</p>')
EMAILS.append(("02-aguardando-pagamento", "Aguardando pagamento", "Pix gerado (mp_payment_status = pending)",
  f"Seu Pix de {TOTAL} vence {PRAZO} — pedido {ORDER}",
  "Copie o código Pix ou abra o QR Code para concluir a compra.",
  eyebrow(f"Pedido {ORDER}") + h1("Seu Pix está pronto")
  + p("Copie o código abaixo no app do seu banco, ou abra o QR Code. A confirmação é automática — você recebe outro e-mail assim que o pagamento cair.")
  + box(pix_box) + button("Abrir QR Code", "https://www.mercadopago.com.br/payments/000/ticket", f'ou <a href="{ORDER_URL}" style="color:{INK};">veja o pedido na loja</a>')
  + small(f"Se o Pix não for pago até {PRAZO}, o pedido é cancelado e os livros voltam para o estoque. Você pode fazer um novo pedido quando quiser."),
  FOOT_PEDIDO))

# 3 — Pagamento recebido
EMAILS.append(("03-pagamento-recebido", "Pagamento recebido", "status → paid",
  f"Pagamento confirmado — pedido {ORDER}",
  "Recebemos seu pagamento. Agora é com a gente: vamos preparar e enviar seus livros.",
  eyebrow(f"Pedido {ORDER}") + h1("Pagamento confirmado!")
  + p(f"Tudo certo, {NAME}. Recebemos <strong style='color:{INK};'>{TOTAL}</strong> via <strong style='color:{INK};'>Pix</strong>. Agora vamos separar e embalar seus livros.")
  + progress(done=2, current=2) + items_table()
  + box(p(f'<strong style="color:{INK};">Próximo passo:</strong> quando o pacote for postado, você recebe o código de rastreio por e-mail.', 0))
  + button("Acompanhar pedido", ORDER_URL), FOOT_PEDIDO))

# 4 — Pagamento cancelado (variante: prazo expirado)
motivos = (f'<p style="margin:0 0 10px;font-size:13px;font-weight:600;color:{INK};">O texto muda conforme o motivo:</p>'
           f'<p style="margin:0 0 6px;font-size:13px;line-height:1.55;color:{TEXT};"><strong>Prazo expirado</strong> — “O pagamento não foi identificado em 12 horas e os livros voltaram para o estoque.”</p>'
           f'<p style="margin:0 0 6px;font-size:13px;line-height:1.55;color:{TEXT};"><strong>Estorno</strong> — “Estornamos R$ 96,30. No Pix o valor volta na hora; no cartão, em até 2 faturas.”</p>'
           f'<p style="margin:0;font-size:13px;line-height:1.55;color:{TEXT};"><strong>Cancelado pela loja</strong> — “Seu pedido foi cancelado pela nossa equipe. Se tiver dúvidas, responda este e-mail.”</p>')
EMAILS.append(("04-pagamento-cancelado", "Pagamento cancelado", "status → cancelled (expirado, estorno ou loja)",
  f"Pedido {ORDER} cancelado",
  "O prazo de pagamento terminou e o pedido foi cancelado. Você pode fazer um novo quando quiser.",
  eyebrow(f"Pedido {ORDER}") + h1("Seu pedido foi cancelado")
  + p(f"Oi, {NAME}. Não identificamos o pagamento do pedido {ORDER} dentro de 12 horas, então ele foi cancelado e os livros voltaram para o estoque.")
  + box(p(f"<strong style='color:{INK};'>Já pagou?</strong> Se o dinheiro saiu da sua conta, responda este e-mail com o comprovante que resolvemos na hora.", 0))
  + button("Fazer um novo pedido", SITE)
  + box(motivos, soft=False), FOOT_PEDIDO))

# 5 — Pedido enviado
track = (f'<p style="margin:0 0 4px;font-size:13px;color:{MUTED};">Código de rastreio</p>'
         f'<p style="margin:0 0 14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:24px;font-weight:700;letter-spacing:1px;color:{INK};">{RASTREIO}</p>'
         f'<p style="margin:0;font-size:14px;line-height:1.6;color:{TEXT};">{FRETE_NOME}<br>Prazo estimado: <strong style="color:{INK};">3 a 5 dias úteis</strong></p>')
EMAILS.append(("05-pedido-enviado", "Pedido enviado", "status → shipped com tracking_code",
  f"Seu pedido {ORDER} está a caminho",
  f"Rastreio {RASTREIO} — acompanhe a entrega dos seus livros.",
  eyebrow(f"Pedido {ORDER}") + h1("Seu pedido está a caminho!")
  + p(f"Boa notícia, {NAME}: seus livros foram postados.") + progress(done=3, current=3)
  + box(track) + button("Rastrear meu pedido", RASTREIO_URL)
  + small("O rastreio pode levar algumas horas para mostrar as primeiras movimentações depois da postagem.")
  + items_table(), FOOT_PEDIDO))

# 6 — Pedido concluído
EMAILS.append(("06-pedido-concluido", "Pedido concluído", "status → delivered",
  f"Pedido {ORDER} entregue",
  "Seus livros chegaram. Boa leitura!",
  eyebrow(f"Pedido {ORDER}") + h1("Seus livros chegaram! 📚")
  + p(f"{NAME}, o pedido {ORDER} foi entregue. Obrigado por comprar com a gente — esperamos que a história te inspire dentro e fora de campo.")
  + progress(done=4)
  + box(p(f"<strong style='color:{INK};'>Algo errado com a entrega?</strong> Se o pacote chegou danificado ou faltando algum item, responda este e-mail em até 7 dias.", 0))
  + button("Ver outros livros", SITE) + items_table(show_address=False), FOOT_PEDIDO))

# 7 — Confirmar cadastro (template do Supabase Auth)
EMAILS.append(("07-confirmar-cadastro", "Confirmar cadastro", "Supabase Auth · signup",
  "Confirme seu cadastro — Goleiro Vitor",
  "Falta só um passo para ativar sua conta.",
  eyebrow("Sua conta") + h1("Confirme seu e-mail")
  + p("Que bom ter você por aqui! Para ativar sua conta e acompanhar seus pedidos, confirme seu e-mail pelo botão abaixo.")
  + button("Confirmar meu e-mail", "{{ .ConfirmationURL }}")
  + small('Se o botão não funcionar, copie e cole este link no navegador:<br><span style="word-break:break-all;color:#404040;">{{ .ConfirmationURL }}</span>')
  + small("Não criou uma conta na loja Goleiro Vitor? Pode ignorar este e-mail."), FOOT_CONTA))

# 8 — Redefinir senha (template do Supabase Auth)
EMAILS.append(("08-redefinir-senha", "Esqueceu a senha", "Supabase Auth · recovery",
  "Redefina sua senha — Goleiro Vitor",
  "Recebemos um pedido para redefinir a senha da sua conta.",
  eyebrow("Sua conta") + h1("Redefinir sua senha")
  + p("Recebemos um pedido para redefinir a senha da conta <strong style='color:#0a0a0a;'>{{ .Email }}</strong>. Clique no botão abaixo para escolher uma nova.")
  + button("Criar nova senha", "{{ .ConfirmationURL }}")
  + box(p("<strong style='color:#0a0a0a;'>O link vale por 1 hora</strong> e só pode ser usado uma vez.", 0))
  + small('Se o botão não funcionar, copie e cole este link no navegador:<br><span style="word-break:break-all;color:#404040;">{{ .ConfirmationURL }}</span>')
  + small("Não pediu para trocar a senha? Ignore este e-mail — sua senha atual continua valendo."), FOOT_CONTA))

# E-mails de conta saem pelo SMTP do Auth, com remetente sem caixa de entrada:
# responder não chegaria a ninguém.
AJUDA_CONTA = 'Dúvidas? Fale com a gente pelo <a href="mailto:vitor1selecao@hotmail.com" style="color:#737373;">vitor1selecao@hotmail.com</a>.'
for slug, label, trigger, subject, preheader, body, foot in EMAILS:
    with open(os.path.join(OUT, f"{slug}.html"), "w") as f:
        help_line = AJUDA_CONTA if foot == FOOT_CONTA else "Dúvidas? É só responder este e-mail."
        f.write(page(subject, preheader, body, foot, help_line))

# ---- galeria para revisão (não é e-mail) ----
def nav_item(i, e):
    s, lab, trg, sub, pre, _b, _f = e
    return f"""<button class="item{' active' if i == 0 else ''}" data-src="{s}.html" data-subject="{html.escape(sub)}" data-pre="{html.escape(pre)}">
  <span class="n">{i+1}</span><span class="t"><strong>{html.escape(lab)}</strong><small>{html.escape(trg)}</small></span></button>"""
nav_pedido = "".join(nav_item(i, e) for i, e in enumerate(EMAILS[:6]))
nav_conta = "".join(nav_item(i + 6, e) for i, e in enumerate(EMAILS[6:]))
first = EMAILS[0]
gallery = f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>E-mails · Goleiro Vitor</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#fafafa;--panel:#fff;--ink:#0a0a0a;--muted:#737373;--line:#e5e5e5;--amber:#f59e0b;--sel:#fffbeb}}
@media (prefers-color-scheme: dark){{:root:not([data-theme=light]){{--bg:#0a0a0a;--panel:#171717;--ink:#fafafa;--muted:#a3a3a3;--line:#262626;--sel:#292211}}}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif}}
.app{{display:grid;grid-template-columns:300px 1fr;min-height:100vh}}
aside{{border-right:1px solid var(--line);background:var(--panel);padding:24px 16px;position:sticky;top:0;height:100vh;overflow:auto}}
aside h1{{font-size:15px;margin:0 8px 4px;letter-spacing:.5px}} aside p{{font-size:12px;color:var(--muted);margin:0 8px 18px;line-height:1.5}}
.group{{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:16px 8px 6px}}
.item{{all:unset;display:flex;gap:10px;align-items:flex-start;width:100%;padding:10px;border-radius:10px;cursor:pointer;box-sizing:border-box}}
.item:hover{{background:var(--bg)}} .item.active{{background:var(--sel);box-shadow:inset 3px 0 0 var(--amber)}}
.n{{flex:none;width:22px;height:22px;border-radius:11px;background:var(--line);font-size:11px;font-weight:700;display:grid;place-items:center}}
.item.active .n{{background:var(--amber);color:#0a0a0a}}
.t{{display:flex;flex-direction:column;gap:2px;font-size:13px}} .t small{{color:var(--muted);font-size:11px}}
main{{padding:24px;display:flex;flex-direction:column;gap:14px;min-width:0}}
.bar{{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}}
.meta{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px;font-size:13px;flex:1;min-width:260px}}
.meta div{{margin:2px 0}} .meta span{{color:var(--muted);display:inline-block;width:78px}}
.seg{{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--panel)}}
.seg button{{all:unset;padding:8px 14px;font-size:13px;cursor:pointer}} .seg button.on{{background:var(--amber);color:#0a0a0a;font-weight:600}}
.stage{{display:flex;justify-content:center;background:repeating-conic-gradient(var(--line) 0 25%,transparent 0 50%) 0/20px 20px;border-radius:14px;padding:24px 12px;border:1px solid var(--line)}}
iframe{{border:0;width:680px;max-width:100%;height:1500px;background:#f5f5f5;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.15);transition:width .2s}}
@media (max-width:820px){{.app{{grid-template-columns:1fr}} aside{{position:static;height:auto}} main{{padding:16px}}}}
</style></head><body><div class="app">
<aside><h1>E-MAILS · GOLEIRO VITOR</h1><p>Mockups da change <code>emails-transacionais-pedido</code>. Dados fictícios.</p>
<div class="group">Pedido</div>{nav_pedido}
<div class="group">Conta (Supabase Auth)</div>{nav_conta}
</aside>
<main><div class="bar"><div class="meta"><div><span>Assunto</span><strong id="subj">{html.escape(first[3])}</strong></div><div><span>Prévia</span><em id="pre">{html.escape(first[4])}</em></div></div>
<div class="seg"><button class="on" data-w="680">Desktop</button><button data-w="375">Celular</button></div></div>
<div class="stage"><iframe id="f" src="{first[0]}.html" title="Pré-visualização"></iframe></div></main></div>
<script>
const f=document.getElementById('f');
document.querySelectorAll('.item').forEach(b=>b.onclick=()=>{{document.querySelectorAll('.item').forEach(x=>x.classList.remove('active'));b.classList.add('active');f.src=b.dataset.src;document.getElementById('subj').textContent=b.dataset.subject;document.getElementById('pre').textContent=b.dataset.pre;}});
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{{document.querySelectorAll('.seg button').forEach(x=>x.classList.remove('on'));b.classList.add('on');f.style.width=b.dataset.w+'px';}});
f.onload=()=>{{try{{f.style.height=(f.contentDocument.body.scrollHeight+40)+'px'}}catch(e){{}}}};
</script></body></html>"""
with open(os.path.join(OUT, "index.html"), "w") as fh:
    fh.write(gallery)
print("gerados:", sorted(os.listdir(OUT)))
