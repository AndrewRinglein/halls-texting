'use client';
import {useState} from 'react';
import {analyzeMessage} from '@/lib/prize-analysis';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
export function MessageCheck(){
 const [body,setBody]=useState(''),[receivedAt,setReceivedAt]=useState('');
 const result=body.trim()?analyzeMessage({body,receivedAt}):null;
 return <details className="analysis-settings"><summary>Check the wording of a text</summary><p>Paste a message to see its amounts and labels. This check does not save or send the message.</p><label>Text message<Textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Paste a hall text here" rows={4}/></label><label>Received timestamp with time zone (optional)<Input value={receivedAt} onChange={e=>setReceivedAt(e.target.value)} placeholder="2026-09-14T19:00:00-07:00"/></label>{result&&<div><p>{result.hotball?'HB / Hotball detected':'No HB mention'} · {result.games===null?'Game count unknown':`${result.games} games`} · {result.eventDate||'Event date needs received timestamp or review'}</p>{result.prizes.length?<ul>{result.prizes.map((p,i)=><li key={i}><strong>{p.amount.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</strong> · {p.label||'Unlabelled'} · {p.kind==='price'?'Entry / package price':p.kind==='credit'?'Credit promotion':p.kind==='per_game'?'Per strip game; nightly total unknown':p.kind==='unknown'?'Payout rules need review':p.kind==='conditional'?'Conditional amount':'Advertised prize'}</li>)}</ul>:<p>No money amounts recognized.</p>}{result.warnings.map(w=><p className="analysis-warning" key={w}>{w}</p>)}</div>}</details>;
}
