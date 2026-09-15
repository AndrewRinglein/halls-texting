import assert from 'node:assert/strict';
const origin='https://frontier-bingo-text-monitor.andrew595321.chatgpt.site';
async function read(path){const r=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return r.json();}
const snapshot=await read('/api/monitor');
assert.ok(snapshot.halls.length>0,'Hall directory unavailable');
const result=[];
for(const summary of snapshot.summaries){
 const messages=[];let offset=0;
 for(let page=0;;page++){
  assert.ok(page<1000,'History pagination did not finish');
  const data=await read('/api/monitor?hall='+encodeURIComponent(summary.hallId)+'&offset='+offset);
  assert.ok(Array.isArray(data.messages));messages.push(...data.messages);
  if(!data.hasMore)break;
  assert.ok(data.messages.length>0,'Pagination stalled');offset+=data.messages.length;
 }
 assert.ok(messages.length>=summary.count,'History is shorter than its starting all-date count');
 assert.equal(new Set(messages.map(m=>m.id)).size,messages.length,'Duplicate history IDs');
 assert.ok(messages.every(m=>m.kind==='promotion'),'Procedural messages exposed');
 assert.ok(messages.every((m,i)=>i===0||messages[i-1].receivedAt>=m.receivedAt),'History order incorrect');
 result.push({hallId:summary.hallId,summaryCount:summary.count,historyCount:messages.length,dates:new Set(messages.map(m=>m.day)).size});
}
const denied=await fetch(origin+'/api/monitor',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(30000)});
assert.equal(denied.status,401,'Unauthenticated sync must be denied');
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin,halls:snapshot.halls.length,lastSync:snapshot.lastSync,connected:snapshot.connected,history:result,unauthenticatedSync:denied.status},null,2));
