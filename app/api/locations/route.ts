const cache=new Map<string,{lat:number;lng:number}>();
export async function GET(request:Request){
 const zip=new URL(request.url).searchParams.get('zip')||'';
 if(!/^\d{5}$/.test(zip))return Response.json({error:'Enter a five-digit US ZIP code.'},{status:400});
 if(cache.has(zip))return Response.json(cache.get(zip));
 try{
  const r=await fetch('https://api.zippopotam.us/us/'+zip,{signal:AbortSignal.timeout(7000)});
  if(r.status===404)return Response.json({error:'ZIP code not found.'},{status:404});
  if(!r.ok)throw Error();
  const data=await r.json() as {places?:{latitude:string;longitude:string}[]};
  const first=data.places?.[0];if(!first)throw Error();
  const value={lat:Number(first.latitude),lng:Number(first.longitude)};
  if(!Number.isFinite(value.lat)||!Number.isFinite(value.lng)||Math.abs(value.lat)>90||Math.abs(value.lng)>180)throw Error();
  if(cache.size>1000)cache.clear();cache.set(zip,value);
  return Response.json(value,{headers:{'Cache-Control':'public, max-age=86400'}});
 }catch{return Response.json({error:'ZIP lookup is temporarily unavailable. Try again.'},{status:503})}
}
