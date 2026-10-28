"""Genera data/catalog/ticketing.json desde el JSON verificado de ticketeras por club.
Uso: python3 -I scripts/build-ticketing.py <verificado.json> <temporada>"""
import json, re, sys

PROVIDERS = [
    ("ohipass", r"ohipass"), ("tienda-everton", r"tienda\s*everton|tiendaeverton"), ("ticketplus", r"ticket\s*plus"),
    ("passline", r"passline"), ("ticketmaster", r"ticketmaster"), ("puntoticket", r"punto\s*ticket"),
]
src, season = sys.argv[1], int(sys.argv[2])
out = []
for c in json.load(open(src, encoding="utf-8")):
    if not c.get("en_primera_2026"):
        continue
    label = c.get("ticketera") or ""
    provider = next((pid for pid, pat in PROVIDERS if re.search(pat, label, re.I)), None)
    url = re.match(r"https?://\S+", c.get("url_compra") or "")
    out.append({
        "clubId": c["club_id"],
        "provider": provider,
        "buyUrl": url.group(0).rstrip(").,") if url else None,
        "ownPortal": bool(c.get("portal_propio")),
        "verified": (c.get("verificacion") or c.get("confianza") or "sin confirmar").split(":")[0],
    })
doc = {"season": season, "clubs": out}
with open("data/catalog/ticketing.json", "w", encoding="utf-8") as f:
    f.write(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
print(len(out), "clubes")
