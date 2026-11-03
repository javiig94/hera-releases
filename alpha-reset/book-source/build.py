"""Build ALPHA_RESET.pdf: fixed full-bleed pages (cover, openers, closing, front matter)
rendered at margin 0; body sections rendered as flowing text with @page margins; then
merged and stamped with running head + page numbers."""
import asyncio, re, io, os, sys
from playwright.async_api import async_playwright
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "book.html")
OUT = os.path.join(HERE, "ALPHA_RESET.pdf")
TMP = os.path.join(HERE, "_tmp"); os.makedirs(TMP, exist_ok=True)

html = open(SRC, encoding="utf-8").read()
head, body = html.split("<body>", 1)
body = body.rsplit("</body>", 1)[0]
sections = re.findall(r'<section class="page[^>]*>.*?</section>', body, flags=re.S)

def is_fixed(sec):
    first = sec.split(">", 1)[0]
    return any(k in first for k in ("cover", "opener", "closing")) or any(k in sec[:400] for k in ('class="tp"', 'class="copy"', 'class="dedic"'))

# group: list of (kind, html)
groups = []
for s in sections:
    if is_fixed(s):
        groups.append(("fixed", s))
    else:
        if re.match(r'<section class="page">\s*<div class="body(?: toc)?">\s*<span class="kicker">(?!Tools · The Daily Scorecard \(cont)', s):
            s = s.replace('<section class="page">', '<section class="page newch">', 1)
        if groups and groups[-1][0] == "flow":
            groups[-1] = ("flow", groups[-1][1] + s)
        else:
            groups.append(("flow", s))

FLOW_CSS = """
<style>
@page{size:6in 9in;margin:0.8in 0.7in 0.82in 0.7in}
html,body{background:transparent}
.page{width:auto;height:auto;overflow:visible;background:transparent;page-break-after:auto;break-after:auto}
.page.newch{break-before:page}
.page .body{padding-bottom:6px}
.body{padding:0}
.page .body:before,.page .body:after{display:none}
h2{break-after:avoid}
table{break-inside:auto}
tr{break-inside:avoid}
</style>
"""

async def render(p, html_str, path, flow):
    pg = await p.new_page()
    await pg.set_content(html_str, wait_until="load")
    await pg.wait_for_timeout(300)
    await pg.pdf(path=path, width="6in", height="9in", print_background=True,
                 prefer_css_page_size=True, margin={"top":"0","bottom":"0","left":"0","right":"0"})
    await pg.close()

async def main():
    parts = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        for i, (kind, h) in enumerate(groups):
            doc = head + ("" if kind == "fixed" else FLOW_CSS) + "<body>" + h + "</body></html>"
            path = os.path.join(TMP, f"part{i:02d}.pdf")
            await render(b, doc, path, kind == "flow")
            parts.append((kind, path))
        await b.close()

    # merge + stamp
    pdfmetrics.registerFont(TTFont("InterM", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
    writer = PdfWriter()
    pageno = 0
    W, H = 6*72, 9*72
    for kind, path in parts:
        r = PdfReader(path)
        for pg in r.pages:
            pageno += 1
            if kind == "flow":
                bg = io.BytesIO(); c = canvas.Canvas(bg, pagesize=(W, H))
                c.setFillColorRGB(0.984, 0.973, 0.949); c.rect(0, 0, W, H, stroke=0, fill=1); c.save(); bg.seek(0)
                pg.merge_page(PdfReader(bg).pages[0], over=False)
            if kind == "flow" and pageno > 5:  # no running head on front matter / dark pages
                buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(W, H))
                c.setFillColorRGB(0.62, 0.49, 0.17); c.setFont("InterM", 7.5)
                c.drawCentredString(W/2, 0.5*72, str(pageno))
                c.setFillColorRGB(0.71, 0.68, 0.61); c.setFont("InterM", 6.3)
                t = "A L P H A   R E S E T"
                c.drawCentredString(W/2, H-0.5*72, t)
                c.save(); buf.seek(0)
                pg.merge_page(PdfReader(buf).pages[0])
            writer.add_page(pg)
    writer.add_metadata({"/Title": "ALPHA RESET — The 30-Day Protocol for Men", "/Author": "Alpha Reset Press"})
    with open(OUT, "wb") as f: writer.write(f)
    print("pages:", pageno)

asyncio.run(main())
