const {chromium}=require('playwright');(async()=>{
const W=375,H=252,WRAP=18,BW=151,BH=216; const mm=96/25.4;
const dir='/home/user/ismail/cover', S='/tmp/claude-0/-home-user-ismail/d8bd8f2b-17f5-5a96-b9d6-5fd1b661814e/scratchpad';
const b=await chromium.launch();
async function page(cls,scale=1){const p=await b.newPage({viewport:{width:Math.ceil(W*mm),height:Math.ceil(H*mm)},deviceScaleFactor:scale});
 await p.goto('file://'+dir+'/cover.html');await p.evaluate(c=>{if(c)document.body.classList.add(c)},cls);await p.waitForTimeout(800);return p}
let p=await page('');await p.pdf({path:dir+'/cover-print.pdf',preferCSSPageSize:true,printBackground:true});
await p.screenshot({path:S+'/wrap.png'});
p=await page('mask');await p.pdf({path:dir+'/cover-emboss-mask.pdf',preferCSSPageSize:true,printBackground:true});
await p.screenshot({path:S+'/mask.png'});
p=await page('preview',1600/(BW*mm));
await p.screenshot({path:dir+'/cover-front.png',clip:{x:WRAP*mm,y:WRAP*mm,width:BW*mm,height:BH*mm}});
p=await page('preview',2);await p.screenshot({path:dir+'/cover-preview-emboss.png',clip:{x:WRAP*mm,y:WRAP*mm,width:(W-2*WRAP)*mm,height:BH*mm}});
await b.close();})();
