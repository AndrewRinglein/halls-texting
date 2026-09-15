import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMessage,eventRows,hallZip,milesBetween,sizeCategory,validCutoffs} from '../lib/prize-analysis.ts';
import {inspectPage,vendorForUrl} from '../lib/vendor-research.ts';
const parse=body=>analyzeMessage({body,receivedAt:'2026-09-15T02:00:00Z'}); // Monday evening Pacific.
test('Hotball aliases, dollar shorthand, and conditional jackpots',()=>{
 for(const alias of ['HB','H.B.','Hotball','hot ball','HOT-BALL']){
  const r=parse(`${alias} $25k tonight!`);assert.equal(r.hotball,true,alias);assert.equal(r.conditional,25000,alias);assert.equal(r.advertised,null);
 }
 assert.equal(parse('Thanks HBR members').hotball,false);
 assert.equal(parse('HB 5 grand tonite').conditional,5000);
});
test('Entry costs, discounts, and unexplained amounts are not prizes',()=>{
 for(const body of ['$50 buy-in tonight','$10 off admission tonight','Bingo $500 tonight','Tickets $30 tonight'])assert.equal(parse(body).advertised,null,body);
 const r=parse('Tonight! $50 buy-in; $10,000 in prizes; HB $5,000');assert.equal(r.advertised,10000);assert.equal(r.conditional,5000);
});
test('Game multipliers and totals avoid doubling component amounts',()=>{
 const r=parse('Tonight! 20 games paying $250');assert.equal(r.advertised,5000);assert.equal(r.games,20);
 assert.equal(parse('Tonight! $10,000 total prizes; 20 games paying $250').advertised,10000);
 assert.equal(parse('Tonight! Games pay $500 each').advertised,null);
 assert.equal(parse('Tonight! $500 prizes; $1000 prizes').advertised,null);
});
test('Pacific dates, advance notice, explicit dates, and unknown dates',()=>{
 assert.equal(parse('Tonight bingo').eventDate,'2026-09-14');
 assert.equal(parse('Tomorrow bingo starts 6:30 pm').leadDays,1);
 assert.equal(parse('Tomorrow bingo starts 6:30 pm').eventTime,'6:30 pm');
 assert.equal(parse('Friday bingo').leadDays,4);
 assert.equal(parse('Bingo Sep 18 at 7pm').eventDate,'2026-09-18');
 assert.equal(parse('Bingo 9/18/26').eventDate,'2026-09-18');
 assert.equal(parse('Bingo 2/30').eventDate,null);
 assert.equal(parse('Bingo this weekend').eventDate,null);
 assert.equal(parse('Bingo Friday and Saturday').eventDate,null);
 assert.equal(parse('Next Friday bingo').eventDate,null);
 assert.equal(parse('Come play bingo').eventDate,null);
 assert.equal(parse('Every Friday bingo').eventDate,null);
});
test('Categories remain unassigned until valid cutoffs are chosen',()=>{
 assert.equal(sizeCategory(10000,null),'Unassigned');assert.equal(sizeCategory(null,null),'Unknown');
 assert.equal(sizeCategory(10000,[5000,10000,25000]),'Large');
 assert.equal(validCutoffs([10000,5000,25000]),false);
});
test('Event reminders keep latest prize and earliest advance notice without double counting',()=>{
 const hall={id:'a',name:'Hall A'};
 const first={id:'1',hallIds:['a'],kind:'promotion',body:'Friday bingo! $10,000 total prizes',receivedAt:'2026-09-15T02:00:00Z'};
 const last={...first,id:'2',body:'Tonight! $12,000 total prizes',receivedAt:'2026-09-19T02:00:00Z'};
 const rows=eventRows([first,last,first],[hall]);assert.equal(rows.length,1);assert.equal(rows[0].analysis.advertised,12000);assert.equal(rows[0].firstLeadDays,4);assert.equal(rows[0].textCount,2);
 const cancellation={...last,id:'3',body:'Tonight bingo cancelled',receivedAt:'2026-09-19T03:00:00Z'};
 assert.equal(eventRows([first,last,cancellation],[hall])[0].analysis.cancelled,true);
 assert.equal(parse('Saturday 9/18/26 bingo').eventDate,null);
});
test('ZIP matching and geographic distances',()=>{
 assert.equal(hallZip('123 Main, CA 95035-1234'),'95035');assert.equal(hallZip('12345 Main Street'),null);
 assert.equal(milesBetween({lat:37,lng:-122},{lat:37,lng:-122}),0);
 assert.ok(Math.abs(milesBetween({lat:0,lng:0},{lat:1,lng:0})-69.09)<.1);
});
test('Vendor evidence uses exact domain boundaries and purchase links',()=>{
 assert.equal(vendorForUrl('https://stripe.com.evil.test/pay'),null);
 const report=inspectPage('<a href="https://plus.bingomenow.com/hall">Reserve seats</a><script src="https://js.stripe.com/v3/"></script>','https://hall.example/');
 assert.equal(report.findings.find(f=>f.name==='BingoMeNow')?.role,'Online ordering');
 assert.equal(report.findings.find(f=>f.name==='Stripe')?.confidence,'Page signal');
 assert.equal(report.findings.some(f=>f.role==='POS'),false);
});
test('Real Salinas wording preserves named amounts without counting packages as games',()=>{
 const r=parse('Salinas Park n Play:2000 Strips 2nite! 50 Buyin 2 Strips, Level 2 90 Buyin 4 Strips+ 4 DA, 4 Mgrs & 2LC 5K Pink, 11K FBs & 20K TTT Txt STOP to OptOut &#x20;');
 assert.deepEqual(r.prizes.map(p=>[p.amount,p.kind]),[[2000,'per_game'],[50,'price'],[90,'price'],[5000,'conditional'],[11000,'conditional'],[20000,'conditional']]);
 assert.deepEqual(r.prizes.filter(p=>p.label).map(p=>p.label),['Strips','Pink','Fireball (FB)','TTT / Tik-Tak-Tow (site match)']);
 assert.equal(r.eventDate,'2026-09-14');assert.equal(r.games,null);assert.equal(r.advertised,null);assert.equal(r.hotball,true);
});
test('Real HouseBingoLAX wording recognizes numbered Hotballs and a credit promotion',()=>{
 const r=parse('HouseBingoLAX!  HB 1\\@5500 HB 2\\@8000  Cry Baby Monday!  Ball In The Monitor Gets U $250  Utility Promo: B!ngo On Sharks- Get 1K Toward Utilty/Credit Card');
 assert.deepEqual(r.prizes.map(p=>[p.amount,p.kind]),[[5500,'conditional'],[8000,'conditional'],[250,'conditional'],[1000,'credit']]);
 assert.equal(r.prizes[0].label,'HB 1');assert.equal(r.prizes[1].label,'HB 2');assert.equal(r.hotball,true);assert.equal(r.games,null);assert.equal(r.advertised,null);assert.equal(r.conditional,null);
 assert.equal(r.eventDate,'2026-09-14');
});
test('Learned terminology stays distinct from Facebook and other halls',()=>{
 assert.equal(parse('Find us on FB tonight').hotball,false);
 assert.equal(parse('11K FBs tonight').hotball,true);
 assert.equal(parse('Fireball $11k tonight').prizes[0].kind,'conditional');
 assert.equal(parse('5K Pink tonight').prizes[0].kind,'conditional');
 assert.equal(parse('20K TTT tonight').prizes[0].kind,'unknown');
 const r=analyzeMessage({body:'2000 Strips tonight; 20K TTT',receivedAt:'2026-09-15T02:00:00Z',hallIds:['scout-salinas-park-n-play-bingo']});
 assert.equal(r.prizes[0].kind,'per_game');assert.equal(r.prizes[1].kind,'conditional');assert.equal(r.advertised,null);
});
