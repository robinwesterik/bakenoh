const {sample}=require('./sample.js');
function rng(seed){ let s=(seed*7919)>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
module.exports.sample2=function(seed){
  const R=rng(seed), ri=n=>Math.floor(R()*n);
  const n=5+ri(14); const s=sample(seed*31+1,n);
  s.race.raceIdx=[45,46,ri(45)][ri(3)]; s.race.lowClass=s.race.raceIdx===46;
  s.cfg.simple=R()<0.25; s.cfg.weights=s.cfg.weights.map(()=>R()<0.5?5:ri(11));
  for(const k of Object.keys(s.cfg.questions)) if(R()<0.15) s.cfg.questions[k]=false;
  if(R()<0.3) s.horses[ri(n)].age=0;
  let scr=0; for(const h of s.horses) if(R()<0.12 && n-scr>5){h.scratched=true;scr++;}
  for(const h of s.horses){ if(R()<0.2) h.odds=s.horses[0].odds; if(R()<0.1) h.form[3].c=10; if(R()<0.2) h.style=0; h.jockeyIdx=ri(62); h.jockey='j'+h.jockeyIdx; }
  return s;
};
