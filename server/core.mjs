export class HttpError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function text(value,max=3000){
  if(typeof value!=='string'||value.length>max) throw new HttpError(400,'Controlla i campi inseriti.');
  return value.trim();
}
export function validateCompany(body){
  const c={name:text(body.name,160),slug:text(body.slug,61),color:text(body.color,7),logo_url:text(body.logo_url||'',2000),email:text(body.email||'',254),address:text(body.address||'',1000),welcome:text(body.welcome||'',500),active:body.active!==false,gestionale_client_id:body.gestionale_client_id?text(body.gestionale_client_id,160):null};
  if(!c.name||!/^[a-z0-9][a-z0-9-]{1,60}$/.test(c.slug)||!/^#[0-9a-f]{6}$/i.test(c.color)) throw new HttpError(400,'Inserisci nome, identificativo e colore validi.');
  safeImage(c.logo_url); return c;
}
export function safeImage(value){
  if(value){let u;try{u=new URL(value);}catch{throw new HttpError(400,'Inserisci un indirizzo immagine HTTPS valido.');}if(u.protocol!=='https:')throw new HttpError(400,'Le immagini devono usare HTTPS.');}
}
export function validateProduct(body){
  if(!uuid(body.company_id))throw new HttpError(400,'Seleziona un cliente.');
  const p={company_id:body.company_id,name:text(body.name,160),description:text(body.description||''),category:text(body.category||'Stampa',80),sku:text(body.sku||'',80),unit:text(body.unit||'pz',20),image_url:text(body.image_url||'',2000),price:Number(body.price),min_qty:Number(body.min_qty),qty_step:Number(body.qty_step),active:body.active!==false};
  if(!p.name||!Number.isFinite(p.price)||p.price<0||p.price>1000000||![p.min_qty,p.qty_step].every(n=>Number.isInteger(n)&&n>=1&&n<=1000000))throw new HttpError(400,'Controlla prezzo, quantità minima e incremento.');
  safeImage(p.image_url); return p;
}
export function parseCookies(header=''){
  return Object.fromEntries(header.split(';').flatMap(part=>{const i=part.indexOf('=');if(i<0)return [];try{return [[part.slice(0,i).trim(),decodeURIComponent(part.slice(i+1))]];}catch{return [];}}));
}
export function verifyOrigin(req){
  let origin;try{origin=new URL(req.headers.origin);}catch{throw new HttpError(403,'Origine richiesta non valida.');}
  const host=req.headers.host;
  if(origin.host!==host||!['http:','https:'].includes(origin.protocol))throw new HttpError(403,'Origine richiesta non valida.');
}
export const dbMessages={FORBIDDEN:'Accesso non autorizzato.',CLIENT_INACTIVE:'Questo cliente è disattivato.',INVALID_CART:'Il carrello non è valido.',INVALID_QUANTITY:'Verifica quantità minime e incrementi dei prodotti.',PRODUCT_UNAVAILABLE:'Un prodotto non è più disponibile. Aggiorna il catalogo.',INVALID_DATE:'La data richiesta non può essere nel passato.',CLIENT_MAPPING_MISSING:'Il cliente collegato non è presente nel gestionale. Contatta RAIA.',WORKSPACE_UNAVAILABLE:'Il gestionale non è disponibile. Riprova più tardi.',DAILY_LIMIT:'Hai raggiunto il limite giornaliero di ordini.'};
