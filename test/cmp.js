const E=require('../src/engine.js'), d=require('../src/data.json');
const s=JSON.parse(require('fs').readFileSync(process.argv[2])), rom=JSON.parse(require('fs').readFileSync(process.argv[3]));
s.cfg.narrow=rom.narrow; const r=E.predict(s.race,s.horses,s.cfg,d,{});
const me={p0:r.pass0.sorted,p0ids:r.pass0.order,p1:r.pass1.sorted,p1ids:r.pass1.order,cat:r.commentary.cat,picks:r.picks.map(p=>[p.lo,p.hi]),fav:r.favCount};
let ok=true; for(const k of Object.keys(me)){ const a=JSON.stringify(me[k]), b=JSON.stringify(rom[k]); if(a!==b){ok=false; console.log('MISMATCH',k,'\n engine',a,'\n rom   ',b);} }
console.log(ok?'MATCH':'DIFF');
