#!/usr/bin/env python3
"""Primera B de Chile (2014-15 a hoy): todos los partidos de la fase regular, desde Wikipedia en español.

Uso: python3 scripts/primera_b/build.py [--cache DIR] [--no-fetch]
  1. Descarga el wikitext de cada temporada (es.wikipedia.org, con pausas por el límite de la API) a DIR
     (por defecto data/raw/primera_b, que no se versiona).
  2. Lee las tablas "Fecha N" (local, resultado, visita, estadio, día y hora) de cada temporada.
  3. Escribe data/matches/primera-b.csv con todos los partidos jugados (sin los cancelados ni los no disputados).

Antes de 2014-15 Wikipedia solo trae tablas de posiciones, y los Play-Offs/liguillas solo cuadros sin fecha: no se cargan.
Los partidos suspendidos sin marcador no se incluyen. Después: npm run data:ingest.
"""
import argparse,csv,json,os,re,sys,time,urllib.error,urllib.parse,urllib.request

MES={'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,'julio':7,'agosto':8,'septiembre':9,'setiembre':9,'octubre':10,'noviembre':11,'diciembre':12}
def clean(s):
    s=re.sub(r'<ref[^>]*?/>','',s);s=re.sub(r'<ref.*?</ref>','',s,flags=re.S)
    m=re.match(r'^\s*((?:[\w-]+\s*=\s*"?[^"|\[\]]*"?\s*)+)\|(?!\|)(.*)$',s,re.S)
    if m:s=m.group(2)
    s=re.sub(r'\{\{\s*Enlace roto\s*\|\s*1=(.*?)\|\s*2=[^{}]*\}\}',r'\1',s,flags=re.S)
    s=re.sub(r'\[\[(?:Archivo|File|Imagen):[^\]]*\]\]','',s)
    for _ in range(3):s=re.sub(r'\{\{[^{}]*\}\}','',s)
    s=re.sub(r'\[\[([^\]|]*)\|([^\]]*)\]\]',r'\2',s);s=re.sub(r'\[\[([^\]]*)\]\]',r'\1',s)
    s=re.sub(r'\[https?://\S+\s+([^\]]*)\]',r'\1',s);s=re.sub(r'\[https?://\S+\]','',s)
    s=re.sub(r"'{2,}",'',s);s=re.sub(r'<br\s*/?>',' ',s);s=re.sub(r'<[^>]+>','',s)
    return re.sub(r'\s+',' ',s.replace('&nbsp;',' ')).strip()
SC=re.compile(r'^\(?(\d+)\s*[-–−]\s*(\d+)\)?$')
def parse_date(t,y0,split):
    m=re.search(r'(\d{1,2})\s+de\s+([a-záéíóú]+)',t.lower())
    if m and m.group(2) in MES:d,mo=int(m.group(1)),MES[m.group(2)]
    else:
        m=re.search(r'^(\d{1,2})/(\d{1,2})$',t.strip())
        if not m:return None
        d,mo=int(m.group(1)),int(m.group(2))
    y=y0+(1 if split and mo<=6 else 0)
    return f'{y}-{mo:02d}-{d:02d}'
def parse(wt,y0,split):
    out=[];tables=re.findall(r'\{\|.*?\n\|\}',wt,re.S)
    for tb in tables:
        mf=re.search(r'!\s*(?:colspan=\S+\s*)?(?:style="[^"]*"\s*)?(?:align=\S+\s*)?\|?\s*Fecha (\d+)',tb)
        if not mf:continue
        fecha=int(mf.group(1));last=None
        for row in re.split(r'\n\|-[^\n]*',tb):
            cells=[]
            for ln in row.split('\n'):
                if ln.startswith('|') and not ln.startswith(('|}','|+','|-')):
                    cells+=ln[1:].split('||')
            tx=[clean(c) for c in cells]
            si=next((i for i,t in enumerate(tx) if SC.match(t)),None)
            # Partidos cancelados/suspendidos: el marcador es un fallo del tribunal (3-0), no se jugaron.
            if any(re.search(r'cancelad|suspendid|walk\s?over|\bw\.?o\.?\b',t.lower()) for t in tx):continue
            dt=None
            for t in tx:
                dd=parse_date(t,y0,split)
                if dd:dt=dd;break
            if dt:last=dt
            if si is None:continue
            nb=[i for i,t in enumerate(tx) if t and not SC.match(t)]
            bef=[i for i in nb if i<si];aft=[i for i in nb if i>si]
            if not bef or not aft:continue
            home,away=tx[bef[-1]],tx[aft[0]]
            st=''
            for i in aft[1:]:
                t=tx[i]
                if re.fullmatch(r'\d{1,2}:\d\d',t) or parse_date(t,y0,split):break
                st=t;break
            hg,ag=SC.match(tx[si]).groups()
            hour=next((t for t in tx if re.fullmatch(r'\d{1,2}:\d\d',t)),'')
            if not last:continue
            out.append((last,fecha,home,away,int(hg),int(ag),st,hour))
    return out

def get(title):
    q=urllib.parse.urlencode({"action":"parse","page":title,"prop":"wikitext","format":"json","redirects":1})
    for k in range(6):
        try:
            t=urllib.request.urlopen(urllib.request.Request("https://es.wikipedia.org/w/api.php?"+q,headers={"User-Agent":UA}),timeout=60).read().decode()
            d=json.loads(t)
            if 'parse' in d:return d['parse']['wikitext']['*']
            return None
        except urllib.error.HTTPError as e:
            if e.code==429:time.sleep(35);continue
            return None
        except Exception as e:
            time.sleep(10)
    return None

UA="GaluchaStatsDataBot/1.0 (educational football stats)"
NORM={'Iberia':'Deportes Iberia','San Luis':'San Luis de Quillota','San Luis (C)':'San Luis de Quillota','Lota Schwager (D)':'Lota Schwager','|Santiago Morning':'Santiago Morning'}
# Partidos jugados cuyo resultado cambió por fallo del tribunal: se guarda el de la cancha (lo que vio el hincha).
OVERRIDES={('2024-07-31','Deportes La Serena','Santiago Morning'):(1,0,'corregido a 1-0 (gol de L. Altamirano, prensa y Sofascore); el calendario de Wikipedia decía 2-1 y su tabla de posiciones 1-0'),
('2023-09-23','Deportes La Serena','Deportes Iquique'):(0,0,'resultado en cancha 0-0; el Tribunal de Disciplina otorgó 0-3 a Iquique el 05-10-2023')}
# Wikipedia nombra un mismo estadio de varias formas; se unifican con los nombres que ya usa la base.
VENUE_ALIASES={'CAP':'Estadio Huachipato-CAP Acero','Huachipato':'Estadio Huachipato-CAP Acero','Huachipato - CAP':'Estadio Huachipato-CAP Acero','Huachipato-CAP Acero':'Estadio Huachipato-CAP Acero',
'Elías Figueroa':'Estadio Elías Figueroa Brander','Ester Roa':'Estadio Ester Roa Rebolledo','Francisco Sánchez':'Estadio Francisco Sánchez Rumoroso','Federico Schwager':'Estadio Municipal Federico Schwager',
'Germán Becker':'Estadio Germán Becker Baechler','Bicentenario Germán Becker':'Estadio Germán Becker Baechler','Joaquín Muñoz':'Estadio Joaquín Muñoz García','Lucio Fariña':'Estadio Lucio Fariña Fernández','Bicentenario Lucio Fariña':'Estadio Lucio Fariña Fernández',
'Luis Navarro':'Estadio Luis Navarro Avilés','Luis Valenzuela':'Estadio Luis Valenzuela Hermosilla','Nelson Oyarzún Arenas':'Estadio Bicentenario Nelson Oyarzún Arenas','Bicentenario Nelson Oyarzún':'Estadio Bicentenario Nelson Oyarzún Arenas',
'Nicolás Chahuán':'Estadio Nicolás Chahuán Nazar','Bicentenario Fiscal de Talca':'Estadio Fiscal de Talca','Santa Laura':'Estadio Santa Laura-Universidad SEK'}
def venue(v):
    v=v.strip()
    if not v:return ''
    if v in VENUE_ALIASES:return VENUE_ALIASES[v]
    return v if v.startswith(('Estadio','Parque','Complejo')) else 'Estadio '+v
# Ojo 2021: la tabla oficial cuenta como 0-3 los 12 partidos con el jugador mal inscrito de San Marcos de Arica;
# el calendario trae lo que pasó en la cancha, que es lo que se carga aquí.
EXCLUDE={('2021-07-25','San Marcos de Arica','Barnechea')}  # 0-3 por sanción del Tribunal de Disciplina (no se disputó)
SEASONS=[(2014,True,'2014-15','Primera B de Chile 2014-15'),(2015,True,'2015-16','Primera B de Chile 2015-16'),(2016,True,'2016-17','Primera B de Chile 2016-17'),(2017,False,'2017 (Transición)','Torneo de Transición Primera B de Chile 2017'),(2018,False,'2018','Primera B de Chile 2018'),(2019,False,'2019','Primera B de Chile 2019'),(2020,False,'2020','Primera B de Chile 2020'),(2021,False,'2021','Primera B de Chile 2021'),(2022,False,'2022','Primera B de Chile 2022'),(2023,False,'2023','Primera B de Chile 2023'),(2024,False,'2024','Primera B de Chile 2024'),(2025,False,'2025','Primera B de Chile 2025'),(2026,False,'2026','Primera B de Chile 2026')]
def fetch(cache):
    os.makedirs(cache,exist_ok=True)
    for y,_,_,title in SEASONS:
        f=os.path.join(cache,f"{y}.txt")
        if os.path.exists(f):continue
        w=get(title);time.sleep(6)
        if not w:sys.exit(f"No se pudo descargar {title}")
        open(f,'w',encoding='utf-8').write(w)
def build(cache,out):
    rows=[]
    for y,sp,label,title in SEASONS:
        ms=parse(open(os.path.join(cache,f"{y}.txt"),encoding='utf-8').read(),y,sp);seen=set()
        if not sp:
            # Temporadas de un año calendario que terminan en enero/febrero siguiente (p. ej. 2020, por la pandemia):
            # un mes anterior al del inicio del torneo pertenece al año siguiente.
            start=min(int(m[0][5:7]) for m in ms if m[1]==1)
            ms=[(f"{int(m[0][:4])+1}{m[0][4:]}" if int(m[0][5:7])<start else m[0],)+tuple(m[1:]) for m in ms]
        # Si la numeración de fechas reinicia (p. ej. 2015-16: Apertura y Clausura, ambos 1-15), se continúa la secuencia.
        fixed=[];prev=0;top=0;off=0
        for m in ms:
            if m[1]<prev:off=top
            prev=m[1];top=max(top,m[1]+off if off==0 else top);fixed.append(m[:1]+(m[1]+off,)+m[2:])
        ms=fixed
        for d,f,h,a,hg,ag,st,hr in ms:
            h=NORM.get(h,h);a=NORM.get(a,a);st=st.lstrip('| ').strip()
            if (d,h,a) in EXCLUDE:continue
            if (d,h,a) in seen:continue
            seen.add((d,h,a))
            note=''
            if (d,h,a) in OVERRIDES:hg,ag,note=OVERRIDES[(d,h,a)];note=f'; {note}'
            rows.append([d,'primera-b',y,f'Primera B {label}',f'Fecha {f}',h,a,hg,ag,'','',0,venue(st),f'wikipedia:es:{title} (resultado, fecha y estadio; revisado 2026-11-20){note}'])
    rows.sort(key=lambda r:(r[0],r[5]))
    with open(out,'w',newline='',encoding='utf-8') as fh:
        w=csv.writer(fh,lineterminator='\n');w.writerow(['date','competition_id','season','tournament','stage','home','away','home_goals','away_goals','home_pens','away_pens','is_final','venue','source']);w.writerows(rows)
    print(len(rows),'partidos en',out)
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--cache',default='data/raw/primera_b');ap.add_argument('--no-fetch',action='store_true');a=ap.parse_args()
    if not a.no_fetch:fetch(a.cache)
    build(a.cache,'data/matches/primera-b.csv')
