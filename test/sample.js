// deterministic pseudo-random sample race for engine <-> ROM comparison
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1103515245+12345)>>>0; return (s>>>8)/16777216; }; }
function sample(seed, nRunners){
  const R=rng(seed), ri=n=>Math.floor(R()*n);
  const race={ raceIdx: 45, course:'c'+ri(10), courseIdx:0, dist:ri(3), surface:ri(2), dir:ri(2), circuit:ri(3), wcond:ri(4), lowClass:false };
  race.courseIdx=+race.course.slice(1);
  const horses=[];
  for(let i=0;i<nRunners;i++){
    const rec=()=>[ri(4),ri(4),ri(4),ri(6)];
    horses.push({ name:'H'+(i+1), sex:ri(2), age:1+ri(5), jockey:'j'+ri(61), jockeyIdx:0, weight:48+ri(12), style:ri(5),
      distRec:[rec(),rec(),rec(),rec()], courseRec:[rec(),rec(),rec(),rec()], trackRec:rec(),
      form:[0,1,2,3].map(()=>({c:ri(11),f:ri(18),m:ri(16)})), freshRec:rec(), training:ri(5),
      bwLast:0, bwLow:0, bwHigh:0, bwToday:0, mark:ri(5), excite:ri(3), sweat:ri(3), coat:ri(3),
      odds:10+ri(600), scratched:false });
    horses[i].jockeyIdx=+horses[i].jockey.slice(1);
    if(R()<0.6){ const w=440+ri(80); horses[i].bwLast=w; horses[i].bwToday=w-10+ri(21); horses[i].bwLow=w-8; horses[i].bwHigh=w+8; }
  }
  const cfg={ simple:false, track:ri(4), narrow:ri(2), weights:Array(13).fill(5),
    questions:{names:true,sexage:true,distance:true,course:true,track:true,fresh:true,training:true,body:true,marks:true,paddock:true} };
  return {race,horses,cfg};
}
module.exports={sample};
