#!/bin/sh
# Rebuild ../index.html (single self-contained page) from index.src.html + data.json + engine.js
cd "$(dirname "$0")" && python3 -I - <<'PY'
src=open('index.src.html').read()
data=open('data.json').read().replace('</','<\\/'); eng=open('engine.js').read()
body=src.replace('/*DATA*/',data).replace('/*ENGINE*/',eng)
he=body.index('</style>')+len('</style>')
doc=('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
 + body[:he] + '\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)} body{margin:0} [hidden]{display:none!important} img{max-width:100%}</style>\n</head>\n<body>\n'
 + body[he:] + '\n</body>\n</html>\n')
open('../index.html','w').write(doc); print('built ../index.html', len(doc))
PY
