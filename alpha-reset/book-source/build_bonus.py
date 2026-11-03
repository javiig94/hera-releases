"""Render bonus.html (6x9in, margin 0) and split it into the three bonus PDFs.
Uses the same Chrome as build.py (CHROME env var)."""
import asyncio, os
from playwright.async_api import async_playwright
from pypdf import PdfReader, PdfWriter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "bonus.html")
ALL = os.path.join(HERE, "_bonus_all.pdf")
PARTS = [  # (pages 1-based inclusive, output name, title)
    ((1, 9), "ALPHA_RESET_Scripts_Pack.pdf", "ALPHA RESET — The Scripts Pack"),
    ((10, 10), "ALPHA_RESET_2AM_Relapse_Protocol.pdf", "ALPHA RESET — The 2 A.M. Relapse Protocol"),
    ((11, 11), "ALPHA_RESET_7_Mistakes_Checklist.pdf", "ALPHA RESET — The 7 Mistakes Checklist"),
]
DEST = {  # where each bonus is copied
    "ALPHA_RESET_Scripts_Pack.pdf": ["bonus", "tienda/private"],
    "ALPHA_RESET_2AM_Relapse_Protocol.pdf": ["bonus", "tienda/private"],
    "ALPHA_RESET_7_Mistakes_Checklist.pdf": ["bonus", "tienda/public/free"],
}

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        pg = await b.new_page()
        await pg.set_content(open(SRC, encoding="utf-8").read(), wait_until="load")
        await pg.wait_for_timeout(300)
        await pg.pdf(path=ALL, width="6in", height="9in", print_background=True, prefer_css_page_size=True,
                     margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await b.close()
    r = PdfReader(ALL)
    assert len(r.pages) == 11, f"expected 11 pages, got {len(r.pages)}"
    for (a, z), name, title in PARTS:
        w = PdfWriter()
        for i in range(a - 1, z): w.add_page(r.pages[i])
        w.add_metadata({"/Title": title, "/Author": "Alpha Reset Press"})
        for d in DEST[name]:
            out = os.path.join(ROOT, d, name)
            with open(out, "wb") as f: w.write(f)
            print("wrote", os.path.relpath(out, ROOT), z - a + 1, "pages")
    os.remove(ALL)

asyncio.run(main())
