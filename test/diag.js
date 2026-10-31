const E=require('../src/engine.js'), d=require('../src/data.json');
const s=JSON.parse(require('fs').readFileSync(process.argv[2])), rom=JSON.parse(require('fs').readFileSync(process.argv[3]));
s.cfg.narrow=rom.narrow; const r=E.predict(s.race,s.horses,s.cfg,d,{});
for (const [pn,P,ids,sc] of [['p0',r.pass0,rom.p0ids,rom.p0],['p1',r.pass1,rom.p1ids,rom.p1]]){
  const romBy={}; ids.forEach((id,k)=>romBy[id]=sc[k]);
  console.log(pn,'scale',P.scale, s.horses.map((h,i)=>h.scratched?'x':(romBy[i]-P.score[i])).join(' '));
}
