import directory from '@/lib/directory.json';
import type {Hall} from '@/lib/types';
import {inspectPage,vendorDomains,type VendorReport} from '@/lib/vendor-research';
const cache=new Map<string,VendorReport>();
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('hall');const hall=(directory.halls as Hall[]).find(h=>h.id===id);
 if(!hall)return Response.json({error:'Unknown hall.'},{status:404});
 const prior=cache.get(hall.id);if(prior&&Date.now()-Date.parse(prior.checkedAt)<3600000)return Response.json(prior);
 const report:VendorReport={checkedAt:new Date().toISOString(),pages:[],findings:[],notes:[]};
 const queue=[hall.website,hall.presales?.url].filter((s):s is string=>!!s);
 const hosts=new Set(queue.flatMap(s=>{try{return [new URL(s).hostname]}catch{return []}}));
 const allowed=(u:URL)=>u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!/^\d|:|localhost$/i.test(u.hostname)&&(hosts.has(u.hostname)||vendorDomains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))&&!/(?:unsubscribe|optout|logout|delete|add.to.cart|\/cart\/add|payment_intent)/i.test(u.pathname+u.search);
 const seen=new Set<string>();let attempts=0;
 while(queue.length&&attempts<5){
  const raw=queue.shift()!;if(seen.has(raw))continue;seen.add(raw);attempts++;
  try{
   const u=new URL(raw);if(!allowed(u)){report.notes.push('Destination needs manual review: '+raw);continue;}
   const r=await fetch(u.href,{redirect:'manual',signal:AbortSignal.timeout(6000),headers:{Accept:'text/html'}});
   if(r.status>=300&&r.status<400){const location=r.headers.get('location');if(location)queue.unshift(new URL(location,u).href);continue;}
   if(!r.ok||!r.headers.get('content-type')?.includes('text/html')){report.notes.push('Page unavailable or not readable HTML: '+raw);continue;}
   const reader=r.body?.getReader();if(!reader)continue;let html='',size=0;const decoder=new TextDecoder();
   try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>500000)throw Error('Page too large');html+=decoder.decode(part.value,{stream:true});}}finally{await reader.cancel();}
   report.pages.push(raw);const result=inspectPage(html,raw);report.findings.push(...result.findings);queue.push(...result.links.slice(0,3).map(l=>l.url));
  }catch{report.notes.push('Could not inspect: '+raw);}
 }
 report.findings=report.findings.filter((f,i,a)=>a.findIndex(x=>x.name===f.name&&x.role===f.role&&x.url===f.url)===i);
 report.notes.push('Public links can identify ordering and payment services. Merchant processor contracts and in-hall POS remain unknown without explicit evidence. No orders are placed.');
 if(!report.pages.length)report.notes.push('No pages could be inspected. This is not evidence that no vendor exists.');
 if(report.pages.length)cache.set(hall.id,report);
 return Response.json(report,{headers:{'Cache-Control':'private, no-store'}});
}
