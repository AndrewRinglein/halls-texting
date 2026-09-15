import type {Hall,Message} from './types';

export type Prize = {amount:number; kind:'prize'|'conditional'|'price'|'credit'|'per_game'|'unknown'; evidence:string; total:boolean; label:string|null};
export type Analysis = {hotball:boolean; prizes:Prize[]; advertised:number|null; conditional:number|null; games:number|null; eventDate:string|null; eventTime:string|null; leadDays:number|null; dateBasis:string; cancelled:boolean; warnings:string[]};
export type Cutoffs = [number,number,number];
const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const money=/\$\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(k|grand|thousand)?\b|\b(\d+(?:\.\d+)?)\s*(k|grand|thousand|dollars|bucks)\b/gi;
function iso(date:Date){return date.toISOString().slice(0,10)}
function shift(day:string,n:number){return iso(new Date(Date.parse(day+'T12:00:00Z')+n*86400000))}
function dateOf(text:string,receivedAt:string){
 const received=new Date(receivedAt);
 if(!/(Z|[+-]\d{2}:\d{2})$/.test(receivedAt)||Number.isNaN(received.getTime()))return {date:null,lead:null,basis:'Received timestamp with a time zone is needed to determine the event date and advance notice.'};
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(received);
 const candidates=new Set<string>(); const basis:string[]=[];
 const add=(date:string,why:string)=>{candidates.add(date);basis.push(why)};
 if(/\b(tonight|today|this evening|2nite|2night|tonite)\b/i.test(text))add(day,'Explicit same-day wording');
 if(/\b(tomorrow|tmrw|tmr)\b/i.test(text))add(shift(day,1),'Tomorrow');
 const names=['january','february','march','april','may','june','july','august','september','october','november','december'];
 const explicit=[...text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?\b/g)].map(m=>({month:+m[1],date:+m[2],year:m[3]?+(m[3].length===2?'20'+m[3]:m[3]):null}));
 for(const m of text.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/gi))explicit.push({month:names.findIndex(n=>n.startsWith(m[1].slice(0,3).toLowerCase()))+1,date:+m[2],year:m[3]?+m[3]:null});
 for(const e of explicit){let year=e.year||+day.slice(0,4);let value=new Date(Date.UTC(year,e.month-1,e.date,12));if(!e.year&&Date.parse(day+'T12:00:00Z')-value.getTime()>180*86400000){year++;value=new Date(Date.UTC(year,e.month-1,e.date,12));}if(value.getUTCMonth()===e.month-1&&value.getUTCDate()===e.date)add(iso(value),'Explicit calendar date');else basis.push('Invalid calendar date');}
 const weekdayMatches=[...text.matchAll(/\b(?:(this|next)\s+)?(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi)];
 if(!explicit.length&&!candidates.size)for(const m of weekdayMatches){const n=days.findIndex(d=>d.startsWith(m[2].slice(0,3).toLowerCase()));const offset=(n-new Date(day+'T12:00:00Z').getUTCDay()+7)%7;if(m[1]?.toLowerCase()==='next'){basis.push('“Next” weekday needs review');continue;}add(shift(day,offset),'Next occurrence of named weekday (inferred)');}
 // Multiple dates, recurring schedules and date ranges cannot support a single-night total.
 const onlyDate=[...candidates][0];
 const weekdayConflict=explicit.length>0&&weekdayMatches.some(m=>days.findIndex(d=>d.startsWith(m[2].slice(0,3).toLowerCase()))!==new Date(onlyDate+'T12:00:00Z').getUTCDay());
 const ambiguous=candidates.size!==1||weekdayConflict||/\b(every|daily|weekend|through|thru)\b/i.test(text)||/\d\s*[-–]\s*\d/.test(text)&&explicit.length>0||weekdayMatches.length>1;
 const date=ambiguous?null:[...candidates][0];
 return {date,lead:date?Math.round((Date.parse(date)-Date.parse(day))/86400000):null,basis:date?basis.join('; '):basis.length?'Multiple or ambiguous event dates':'No event date stated; same-day not assumed'};
}

/** Conservative, explainable text rules. Unknown dollars never become prizes. */
export function analyzeMessage(message:Pick<Message,'body'|'receivedAt'>&Partial<Pick<Message,'hallId'|'hallIds'>>):Analysis{
 const text=message.body.replace(/https?:\/\/\S+/gi,' ').replace(/\r/g,'').replace(/&#(?:x20|32);|&nbsp;/gi,' ').replace(/\\@/g,'@').replace(/\bB!ngo\b/gi,'Bingo');
 const warnings:string[]=[];const prizes:Prize[]=[];
 const salinas=/\bSalinas\s+Park\s*(?:n|and|&)\s*Play\b/i.test(text)||[message.hallId,...(message.hallIds||[])].includes('scout-salinas-park-n-play-bingo');
 const hotball=/\b(?:h\.?b\.?|hot[\s-]*ball|fire[ -]*ball)\b/i.test(text)||/(?:\d\s*(?:k|grand|thousand)?\s*FBs?\b|\bFBs?\s*[@:$]?\s*\d)/i.test(text);
 // Dollar signs are often omitted. Only add them where a specific label disambiguates
 // money from package quantities, levels, dates, or numbered Hotballs.
 const normalized=text.replace(/\bH\.B\.?/gi,'HB')
  .replace(/\b((?:HB|hot[ -]*ball)\s*\d*\s*@\s*)(\d[\d,]*(?:\.\d+)?)(?![\d.,])/gi,'$1$$$2')
  .replace(/(?<![\w$])\b(\d+(?:\.\d+)?)\s*(buy[ -]?in|entry|admission)\b/gi,'$$$1 $2')
  .replace(/(?<![\w$])\b(\d{3,})\s*(strips?)\b/gi,'$$$1 $2');
 const clauses=normalized.split(/[\n;!]+|\.(?!\d)|,(?!\d{3}\b)|\s*[&+]\s*|\s+(?:plus|and)\s+|(?=\bHB\s*\d*\s*@)|(?=\bUtil\w*\s+Promo:)/i).filter(Boolean);
 for(const clause of clauses){
  for(const m of clause.matchAll(money)){
   let amount=Number((m[1]||m[3]).replaceAll(',',''));if(/^(k|grand|thousand)$/i.test(m[2]||m[4]||''))amount*=1000;
   const start=m.index||0;const before=clause.slice(Math.max(0,start-45),start);const after=clause.slice(start+m[0].length,start+m[0].length+45);
   const context=before+m[0]+after;
   const conditional=/\b(h\.?b\.?|hot[\s-]*ball|fire[ -]*ball|FBs?|pink|progressive|jackpot|up to|could win|chance (?:at|to)|if won|eligible|ball in the monitor)\b/i.test(context);
   const price=/\b(buy[ -]?in|entry|admission|pack(?:age)?|cost|price|tickets?|doors?|purchase|seat|off|discount)\b/i.test(context);
   const payout=/\b(prizes?|pay(?:s|ing|out|outs)?|giveaway|giving away|guaranteed|win|awarded|games?\s+(?:at|@))\b/i.test(context);
   const credit=/\b(?:toward|towards)\s+(?:util\w*|credit card|bills?)|\b(?:util\w*|credit card)\s+(?:credit|promo)/i.test(context);
   let kind:Prize['kind']=credit?'credit':conditional?'conditional':price&&!payout?'price':payout&&!price?'prize':'unknown';
   if(price&&(payout||conditional)){kind='unknown';warnings.push('A dollar amount mixes price and prize wording; check the original text.');}
   const multiplier=before.match(/\b(\d{1,3})\s+(?:regular\s+)?games?\s*(?:paying|pay|pays|at|@|x|of)?\s*$/i);
   if(kind==='prize'&&multiplier)amount*=+multiplier[1];
   else if(kind==='prize'&&/\b(each|per game)\b/i.test(after)){kind='unknown';warnings.push('Per-game amount needs a clear game count.');}
   const hbLabel=before.match(/\b(HB\s*\d*|hot[ -]*ball\s*\d*)\s*@?\s*$/i)?.[1];
   const namedLabel=after.match(/^\s*(Pink|FBs?|TTT|strips?)\b/i)?.[1];
   if(salinas&&namedLabel?.toLowerCase()==='ttt'&&!price)kind='conditional';
   if(salinas&&namedLabel?.toLowerCase().startsWith('strip')&&!price&&!conditional){kind='per_game';warnings.push('Strip-game payout identified. The number of strip games is needed to calculate the nightly total; strips included in a buy-in are not game counts.');}
   const label=(salinas&&namedLabel?.toLowerCase()==='ttt'?'TTT / Tik-Tak-Tow (site match)':namedLabel?.match(/^FBs?$/i)?'Fireball (FB)':null)||hbLabel||namedLabel||(credit?'Utility / credit promotion':/ball in the monitor/i.test(context)?'Ball in the monitor':null);
   prizes.push({amount,kind,evidence:clause.trim(),total:/\b(total|in prizes|giving away|prize pool|giveaway)\b/i.test(context),label});
  }
 }
 const guaranteed=prizes.filter(p=>p.kind==='prize');const totals=guaranteed.filter(p=>p.total);
 // Use a stated total over its components. Multiple unlabelled amounts require review.
 const advertised=totals.length===1?totals[0].amount:guaranteed.length===1?guaranteed[0].amount:null;
 if(guaranteed.length>1&&!totals.length||totals.length>1)warnings.push('Several prize amounts found; nightly total needs review to avoid double counting.');
 const jackpots=prizes.filter(p=>p.kind==='conditional');const conditional=jackpots.length===1?jackpots[0].amount:null;
 if(jackpots.length>1)warnings.push('Several conditional amounts found; they have not been added together.');
 if(prizes.some(p=>p.kind==='unknown'))warnings.push('Some amounts have unclear payout rules. Unrecognized game labels need hall-specific confirmation.');
 if(prizes.some(p=>p.kind==='credit'))warnings.push('Utility or credit-card promotion kept separate from cash prizes.');
 const counts=[...text.matchAll(/\b(\d{1,3})\s+(?:regular\s+|bingo\s+)?games?\b/gi)].map(m=>+m[1]);
 const games=counts.length===1?counts[0]:null;
 if(counts.length>1)warnings.push('Several game counts found; total game count needs review.');
 const event=dateOf(text,message.receivedAt);
 if(!event.date)warnings.push(event.basis);
 const cancelled=/\b(cancelled|canceled|postponed)\b/i.test(text);
 if(cancelled)warnings.push('Cancellation or postponement mentioned; excluded from prize comparisons.');
 const times=[...text.matchAll(/\b(?:games?\s*(?:start(?:s)?|at)?|bingo\s*(?:start(?:s)?|at)|starts?|start time)\s*:?\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/gi)].map(m=>m[1]);
 return {hotball,prizes,advertised,conditional,games,eventDate:event.date,eventTime:times.length===1?times[0]:null,leadDays:event.lead,dateBasis:event.basis,cancelled,warnings:[...new Set(warnings)]};
}
export function eventRows(messages:Message[],halls:Hall[]){
 const byId=new Map(halls.map(h=>[h.id,h]));
 const groups=new Map<string,{hall:Hall;message:Message;analysis:Analysis;firstMessage:Message;firstLeadDays:number|null;textCount:number}>();
 for(const message of [...new Map(messages.filter(m=>m.kind==='promotion').map(m=>[m.id,m])).values()].sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)||b.id.localeCompare(a.id))){
  const analysis=analyzeMessage(message);
  for(const id of message.hallIds?.length?message.hallIds:message.hallId?[message.hallId]:[]){
   const hall=byId.get(id);if(!hall)continue;
   const key=id+'|'+(analysis.eventDate||message.id);const existing=groups.get(key);
   if(existing){existing.firstMessage=message;existing.firstLeadDays=analysis.leadDays;existing.textCount++;}
   else groups.set(key,{hall,message,analysis,firstMessage:message,firstLeadDays:analysis.leadDays,textCount:1});
  }
 }
 return [...groups.values()];
}
export function sizeCategory(amount:number|null,cutoffs:Cutoffs|null){if(amount===null)return 'Unknown';if(!cutoffs)return 'Unassigned';return amount<cutoffs[0]?'Small':amount<cutoffs[1]?'Medium':amount<cutoffs[2]?'Large':'Very large'}
export function validCutoffs(values:number[]):values is Cutoffs{return values.length===3&&values.every(v=>Number.isFinite(v)&&v>0)&&values[0]<values[1]&&values[1]<values[2]}
export function milesBetween(a:{lat:number;lng:number},b:{lat:number;lng:number}){const rad=(n:number)=>n*Math.PI/180;const h=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2;return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1,h)))}
export function hallZip(address:string){return address.match(/\bCA\s+(\d{5})(?:-\d{4})?\b/i)?.[1]||null}
