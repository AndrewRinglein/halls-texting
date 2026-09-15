import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {messageKind} from '../lib/message-kind.js';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(await readFile(new URL('../supabase/migrations/202609110001_bingo_monitor.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/202609110001_bingo_monitor.sql',import.meta.url),'utf8'));
const halls=[{id:'a',name:'Hall A'},{id:'b',name:'Hall B'}];
const message=(id,body,hallIds)=>({id,body,sender:'70503',receivedAt:'2026-09-11T18:00:00Z',day:'2026-09-11',kind:messageKind(body),hallIds});
const messages=[message('promo','Bingo tonight! $35 buy-in. Txt STOP to OptOut',['a','b']),message('op','You are now signed up to receive text messages',['a']),message('name','Please reply with your Full Name.',['a']),
 {...message('promo2','Bingo tonight! $35 buy-in. Txt STOP to OptOut',['a']),receivedAt:'2026-09-11T19:00:00Z'},
 {...message('earlier','Saturday bingo! $50 buy-in. Reply STOP to end.',['a']),day:'2026-09-10',receivedAt:'2026-09-10T18:00:00Z'}];
await db.exec('set role service_role');
const ingest=()=>db.query('select public.bingo_ingest($1::jsonb) added',[JSON.stringify({halls,messages})]);
assert.equal((await ingest()).rows[0].added,5);
assert.equal((await ingest()).rows[0].added,0);
const snapshot=(await db.query("select public.bingo_snapshot('2026-09-11') result")).rows[0].result;
assert.equal(snapshot.messages.length,2);assert.equal(snapshot.summaries.length,2);
assert.equal(snapshot.summaries.find(s=>s.hallId==='a').count,3);
assert.equal(snapshot.summaries.find(s=>s.hallId==='a').latest.id,'promo2');
assert.equal(snapshot.summaries.find(s=>s.hallId==='b').count,1);
assert.deepEqual((await db.query("select public.bingo_history('a',0) result")).rows[0].result.messages.map(m=>m.id),['promo2','promo','earlier']);
await db.exec('reset role; set role anon');
assert.equal((await db.query('select * from public.bingo_messages')).rows.length,3);
await assert.rejects(()=>db.query("select public.bingo_ingest('{}'::jsonb)"),/permission denied/);
await assert.rejects(()=>db.query("insert into public.bingo_halls values('c','{}')"),/permission denied/);
await assert.rejects(()=>db.query('select * from public.bingo_state'),/permission denied/);
await assert.rejects(()=>db.query('select * from public.bingo_link_mappings'),/permission denied/);
for(const role of ['anon','authenticated']){
 await db.exec('reset role; set role '+role);
 assert.equal((await db.query("select public.bingo_history('a',0) result")).rows[0].result.messages.length,3);
 await assert.rejects(()=>db.query("select public.bingo_ingest('{}'::jsonb)"),/permission denied/);
 await assert.rejects(()=>db.query("update public.bingo_halls set record='{}' where id='a'"),/permission denied/);
 await assert.rejects(()=>db.query("delete from public.bingo_messages where id='promo'"),/permission denied/);
 await assert.rejects(()=>db.query('select * from public.bingo_state'),/permission denied/);
 await assert.rejects(()=>db.query('select * from public.bingo_link_mappings'),/permission denied/);
}
await db.exec('reset role; set role service_role');
const many=Array.from({length:205},(_,i)=>({...message('page-'+String(i).padStart(3,'0'),'Bingo tonight! $500 prizes',['a']),receivedAt:new Date(Date.UTC(2026,8,12,0,i)).toISOString(),day:'2026-09-12'}));
await db.query('select public.bingo_ingest($1::jsonb)',[JSON.stringify({messages:many})]);
assert.equal((await db.query('select public.bingo_ingest($1::jsonb) added',[JSON.stringify({messages:many})])).rows[0].added,0);
await db.exec('reset role; set role anon');
const paged=[];
for(let offset=0;;offset+=100){const page=(await db.query('select public.bingo_history($1,$2) result',['a',offset])).rows[0].result;paged.push(...page.messages);if(!page.hasMore)break;assert.equal(page.messages.length,100);assert.ok(offset<300);}
assert.equal(paged.length,208);assert.equal(new Set(paged.map(m=>m.id)).size,208);
assert.equal(paged.at(-1).id,'earlier');
assert.equal(messageKind('Thanks so much! We\'ll send you a reminder 24 hours before our upcoming events!'),'subscription');
assert.equal(messageKind('Welcome back for Saturday bingo! $50 buy-in. Reply STOP to end.'),'promotion');
assert.equal(messageKind('Concord Bingo TEXTING Messages will keep you up to date on Special activities.'),'subscription');
await db.close();
console.log('PASS: atomic ingestion, provider-ID deduplication, multiple texts per hall across dates, shared-hall counts, promotion-only history, public read-only permissions and STOP footer retention.');
