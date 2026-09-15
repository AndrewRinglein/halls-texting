export type VendorEvidence={role:'Online ordering'|'Payment service'|'Merchant processor'|'POS';name:string;url:string;evidence:string;confidence:'Observed link'|'Page signal'|'Published record'};
export type VendorReport={checkedAt:string;pages:string[];findings:VendorEvidence[];notes:string[]};
export const vendorDomains=['bingomenow.com','airmenu.com','eventbrite.com','square.site','squareup.com','checkout.square.site','stripe.com','paypal.com','clover.com','shopify.com','myshopify.com','wix.com','ecatholic.com','ticketspice.com'];
export function safeWebUrl(raw:string){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}}
export function vendorForUrl(raw:string):{name:string;role:VendorEvidence['role']}|null{
 let host;try{host=new URL(raw).hostname.toLowerCase()}catch{return null}
 const choices:[string,string,VendorEvidence['role']][]=[['bingomenow.com','BingoMeNow','Online ordering'],['airmenu.com','AirMenu','Online ordering'],['eventbrite.com','Eventbrite','Online ordering'],['square.site','Square Online','Online ordering'],['squareup.com','Square','Payment service'],['stripe.com','Stripe','Payment service'],['paypal.com','PayPal','Payment service'],['clover.com','Clover online payments','Payment service'],['myshopify.com','Shopify','Online ordering'],['ticketspice.com','TicketSpice','Online ordering']];
 for(const [domain,name,role] of choices)if(host===domain||host.endsWith('.'+domain))return {name,role};return null;
}
export function inspectPage(html:string,url:string){
 const findings:VendorEvidence[]=[];const links:{url:string;label:string}[]=[];
 for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  let dest;try{dest=safeWebUrl(new URL(m[1].replace(/&amp;/g,'&'),url).href)}catch{continue}if(!dest)continue;
  const label=m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  if(/buy|order|reserv|ticket|checkout|purchase|shop|pre.?sale/i.test(label+' '+dest))links.push({url:dest,label});
  const vendor=vendorForUrl(dest);if(vendor&&links.some(l=>l.url===dest))findings.push({...vendor,url:dest,evidence:`Purchase or reservation link on ${url}: ${label||dest}`,confidence:'Observed link'});
 }
 const destination=vendorForUrl(url);if(destination)findings.push({...destination,url,evidence:'The linked page is hosted on this service. This does not identify the underlying merchant processor or in-hall POS.',confidence:'Observed link'});
 if(/https:\/\/(?:js|checkout)\.stripe\.com\//i.test(html))findings.push({name:'Stripe',role:'Payment service',url,evidence:'Stripe script on page; integration signal only, active payment processing not confirmed.',confidence:'Page signal'});
 if(/https:\/\/www\.paypal\.com\/sdk\/js/i.test(html))findings.push({name:'PayPal',role:'Payment service',url,evidence:'PayPal SDK on page; integration signal only.',confidence:'Page signal'});
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 for(const m of text.matchAll(/\b(merchant processor|payment processing|point[ -]of[ -]sale|POS)\s+(?:is\s+|provided by\s+|powered by\s+|by\s+)(Stripe|Square|Clover|Fiserv|FIS|Worldpay|Global Payments|Heartland|Elavon|Shift4|Toast|Lightspeed|Frontier Gaming Systems)\b/gi))findings.push({name:m[2],role:/POS|point/i.test(m[1])?'POS':'Merchant processor',url,evidence:`Public page states: “${m[0]}”. Confirm that this statement applies to this hall.`,confidence:'Page signal'});
 return {findings,links};
}
