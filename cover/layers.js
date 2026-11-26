// Render each part of the cover as a transparent 300-dpi PNG layer (for a layered PSD).
const {chromium}=require('playwright');
const OUT=process.argv[2];
const LAYERS=[
 ['Spine band','.spine','.spine *{visibility:hidden!important}'],
 ['Front image - village','svg.art'],
 ['Front - vertical title','.vtitle'],
 ['Front - gold line','.vrule'],
 ['Front - subtitle and years','.subblock'],
 ['Front - author','.front .author'],
 ['Spine - title','.spine .st'],
 ['Spine - author','.spine .sa'],
 ['Spine - publisher logo','.spine .plogo'],
 ['Back - quote and blurb','.q, .blurb'],
 ['Back - English title','.eng'],
 ['Back - gold line','.erule'],
 ['Back - author photo and name','.authorbox'],
 ['Back - price','.price'],
];
(async()=>{const W=377,H=252,mm=96/25.4;
 const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:Math.ceil(W*mm),height:Math.ceil(H*mm)},deviceScaleFactor:300/96});
 await p.goto('file:///home/user/ismail/cover/cover.html');await p.waitForTimeout(800);
 await p.screenshot({path:OUT+'/00-composite.png'});
 const st=await p.addStyleTag({content:'html,body{background:transparent!important} body *{visibility:hidden}'});
 let i=1;
 for(const [name,sel,extra] of LAYERS){
  const h=await p.addStyleTag({content:`${sel.split(',').map(x=>x.trim()+','+x.trim()+' *').join(',')}{visibility:visible!important} ${extra||''}`});
  await p.waitForTimeout(150);
  await p.screenshot({path:`${OUT}/${String(i).padStart(2,'0')}-${name}.png`,omitBackground:true});
  await h.evaluate(e=>e.remove()); i++;
 }
 await b.close();})();
