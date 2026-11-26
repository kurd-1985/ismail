const {chromium}=require('playwright');(async()=>{
const b=await chromium.launch();const mm=96/25.4;
const p=await b.newPage({viewport:{width:Math.ceil(375*mm),height:Math.ceil(252*mm)}});
await p.goto('file:///home/user/ismail/cover/cover.html');await p.waitForTimeout(800);
const r=await p.evaluate((mm)=>{
 const body=document.body.getBoundingClientRect(); const X=v=>(v-body.left)/mm, Y=v=>(v-body.top)/mm;
 const items=[];
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){ if(!n.textContent.trim()||n.parentElement.closest('style,script,defs'))continue;
   const rg=document.createRange();rg.selectNodeContents(n);const R=rg.getBoundingClientRect(); if(!R.width)continue;
   items.push({what:n.textContent.trim().slice(0,28),l:X(R.left),r:X(R.right),t:Y(R.top),b:Y(R.bottom)});}
 for(const e of document.querySelectorAll('img,.isbn,svg.art use[fill]')){const R=e.getBoundingClientRect();
   items.push({what:e.tagName==='use'?'map':e.className||e.tagName,l:X(R.left),r:X(R.right),t:Y(R.top),b:Y(R.bottom)});}
 return items;},mm);
// regions (mm): front board 18..169, spine core 177..198, back board 206..357, board y 18..234
const rows=[];let bad=0;
for(const i of r){const cx=(i.l+i.r)/2;let reg,edges;
 if(cx<169){reg='FRONT';edges={outer:i.l-18,hinge:169-i.r,top:i.t-18,bottom:234-i.b};}
 else if(cx<206){reg='SPINE';edges={side1:i.l-177,side2:198-i.r,top:i.t-18,bottom:234-i.b};}
 else {reg='BACK';edges={hinge:i.l-206,outer:357-i.r,top:i.t-18,bottom:234-i.b};}
 const min=Object.entries(edges).sort((a,b)=>a[1]-b[1])[0];
 const need=reg==='SPINE'?(min[0].startsWith('side')?2.5:12):(min[0]==='hinge'?15:12);
 const ok=min[1]>=need; if(!ok)bad++;
 rows.push(`${ok?'OK ':'BAD'} ${reg.padEnd(5)} ${min[0].padEnd(6)} ${min[1].toFixed(1).padStart(5)}mm (need ${need})  ${i.what}`);}
console.log(rows.join('\n'));console.log('problems:',bad);await b.close();})();
