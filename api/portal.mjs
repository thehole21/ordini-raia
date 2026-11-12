import { HttpError,uuid,text,validateCompany,validateProduct,parseCookies,verifyOrigin,dbMessages } from '../server/core.mjs';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Vary','Cookie');
  const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  try{
    const url='https://wqhnjmzincfoussybyxd.supabase.co';
    const key='sb_publishable_HJl8TVYhRGMQTVxUGfhi7w_7uqduMst';
    const action=new URL(req.url,'http://localhost').searchParams.get('action')||'session';
    if(!['GET','POST'].includes(req.method))throw new HttpError(405,'Metodo non consentito.');
    if(req.method==='POST')verifyOrigin(req);
    if(action==='health')return send(200,{configured:!!(url&&key)});
    if(!url||!key)throw new HttpError(503,'Il portale è in configurazione. Torna a trovarci tra poco.');
    const cookie=parseCookies(req.headers.cookie);
    const secure=process.env.VERCEL||process.env.NODE_ENV==='production';
    const setSession=(data)=>res.setHeader('Set-Cookie',[
      `raia_access=${encodeURIComponent(data.access_token)}; HttpOnly; Path=/api; SameSite=Lax; Max-Age=${data.expires_in||3600}${secure?'; Secure':''}`,
      `raia_refresh=${encodeURIComponent(data.refresh_token)}; HttpOnly; Path=/api; SameSite=Lax; Max-Age=2592000${secure?'; Secure':''}`
    ]);
    const clearSession=()=>res.setHeader('Set-Cookie',['raia_access=; HttpOnly; Path=/api; SameSite=Lax; Max-Age=0'+(secure?'; Secure':''),'raia_refresh=; HttpOnly; Path=/api; SameSite=Lax; Max-Age=0'+(secure?'; Secure':'')]);
    let body={};
    if(req.method==='POST'){
      if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Formato richiesta non valido.');
      if(req.body!==undefined)body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>120000)throw new HttpError(413,'Richiesta troppo grande.');}body=JSON.parse(raw||'{}');}
      if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>120000)throw new HttpError(400,'Richiesta non valida.');
    }
    const upstream=async(path,{method='GET',data,token,secret=false}={})=>{
      const apiKey=secret?process.env.SUPABASE_SECRET_KEY:key;
      if(!apiKey)throw new HttpError(503,'Per creare accessi, configura SUPABASE_SECRET_KEY su Vercel.');
      const headers={apikey:apiKey,'Content-Type':'application/json',Prefer:'return=representation'};
      if(token)headers.Authorization=`Bearer ${token}`;
      // Legacy service-role keys require Authorization; modern secret keys use apikey.
      else if(secret&&apiKey.startsWith('eyJ'))headers.Authorization=`Bearer ${apiKey}`;
      const result=await fetch(url+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
      const value=await result.json().catch(()=>null);
      if(!result.ok){
        const message=value?.message||value?.msg||value?.error_description||'';
        if(path.startsWith('/auth/v1/token')&&result.status!==429)throw new HttpError(401,'Email o password non corrette.');
        if(path==='/auth/v1/user')throw new HttpError(401,'La sessione è scaduta. Accedi di nuovo.');
        if(result.status===429)throw new HttpError(429,'Troppe richieste. Attendi un momento e riprova.');
        if(value?.code==='23505')throw new HttpError(409,'Questo identificativo è già utilizzato.');
        const friendly=Object.entries(dbMessages).find(([k])=>message.includes(k));
        if(friendly)throw new HttpError(friendly[0]==='FORBIDDEN'?403:400,friendly[1]);
        if(path==='/auth/v1/admin/users')throw new HttpError(400,'Impossibile creare questo accesso. L’email potrebbe essere già registrata; usa “Collega utente esistente”.');
        console.error('Supabase request failed',{path:path.split('?')[0],status:result.status,code:value?.code});
        throw new HttpError(502,'Operazione non riuscita. Controlla i dati e riprova.');
      }
      return value;
    };
    if(action==='login'&&req.method==='POST'){
      const username=text(body.email,254),email=username.includes('@')?username:username.toLowerCase()+'@clienti.ordini.raiaweb.it',password=body.password;
      if(!email||!password)throw new HttpError(400,'Inserisci email e password.');
      const result=await upstream('/auth/v1/token?grant_type=password',{method:'POST',data:{email,password}});
      setSession(result);return send(200,{ok:true});
    }
    if(action==='logout'&&req.method==='POST'){
      if(cookie.raia_access)await upstream('/auth/v1/logout?scope=local',{method:'POST',token:cookie.raia_access}).catch(()=>{});
      clearSession();return send(200,{ok:true});
    }
    let token=cookie.raia_access,user;
    if(token){try{user=await upstream('/auth/v1/user',{token});}catch(err){if(err.status!==401)throw err;}}
    if(!user&&cookie.raia_refresh){
      try{const refreshed=await upstream('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:cookie.raia_refresh}});token=refreshed.access_token;user=refreshed.user;setSession(refreshed);}catch{clearSession();}
    }
    if(!user)throw new HttpError(401,'Accedi al tuo spazio riservato.');
    const db=(path,options={})=>upstream('/rest/v1/'+path,{...options,token});
    const rpc=(name,data={})=>db('rpc/'+name,{method:'POST',data});
    const readOrders=()=>db('ordini_orders?select=*,ordini_order_items(*)&order=created_at.desc&limit=200');
    if(action==='history')return send(200,{user:{id:user.id},orders:await readOrders()});
    const roles=Promise.all([rpc('ordini_is_staff'),rpc('ordini_catalog_manager')]);
    if(action==='session'){
      const [companies,memberships,products,orders,clients,sections,[staff,manager]]=await Promise.all([
        db('ordini_companies?select=*&order=name'),
        db('ordini_memberships?select=*&order=name'),
        db('ordini_products?select=*&order=created_at.desc'),
        readOrders(),
        roles.then(([staff])=>staff?rpc('ordini_clients'):[]),db("ordini_sections?select=*&order=position"),roles
      ]);
      const catalogManager=staff||manager;
      if(!catalogManager&&!memberships.some(m=>m.user_id===user.id&&m.active))throw new HttpError(403,'Il tuo accesso non è ancora abilitato. Contatta RAIA.');
      return send(200,{user:{id:user.id,email:user.email},staff,catalogManager,companies,memberships,products,orders,clients,sections,canCreateUsers:staff&&!!process.env.SUPABASE_SECRET_KEY});
    }
    const [staff,manager]=await roles;
    const catalogManager=staff||manager;
    if(req.method!=='POST')throw new HttpError(405,'Metodo non consentito.');
    if(action==='submit'){
      if(!uuid(body.request_id)||!uuid(body.company_id)||!Array.isArray(body.items)||body.items.length>50)throw new HttpError(400,'Ordine non valido.');
      for(const item of body.items)if(!uuid(item.product_id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>1000000)throw new HttpError(400,'Quantità non valida.');
      if(body.requested_date&&!/^\d{4}-\d{2}-\d{2}$/.test(body.requested_date))throw new HttpError(400,'Data non valida.');
      const id=await rpc('ordini_submit',{request_id:body.request_id,target_company:body.company_id,items:body.items,delivery_date:body.requested_date||null,delivery_address:text(body.address||'',1000),order_notes:text(body.notes||'')});
      return send(200,{id});
    }
    if(!staff && !(catalogManager && ['product','section','remove-section','remove-product'].includes(action)))throw new HttpError(403,'Accesso riservato a RAIA.');
    if(['section','remove-section','remove-product'].includes(action)){
      if(!uuid(body.company_id))throw new HttpError(400,'Cliente non valido.');
      if(action==='section'){
        const name=text(body.name,80);
        if(!name)throw new HttpError(400,'Inserisci un nome.');
        await db('ordini_sections',{method:'POST',data:{company_id:body.company_id,name}});
      }else{
        if(!uuid(body.id))throw new HttpError(400,'Identificativo non valido.');
        const query='?id=eq.'+body.id+'&company_id=eq.'+body.company_id;
        if(action==='remove-section')await db('ordini_sections'+query,{method:'DELETE'});
        else await db('ordini_products'+query,{method:'PATCH',data:{active:false}});
      }
      return send(200,{ok:true});
    }
    if(action==='company'||action==='product'){
      const data=action==='company'?validateCompany(body):validateProduct(body);
      const table=action==='company'?'ordini_companies':'ordini_products';
      if(body.id&&!uuid(body.id))throw new HttpError(400,'Identificativo non valido.');
      const result=await db(table+(body.id?'?id=eq.'+body.id:''),{method:body.id?'PATCH':'POST',data});
      return send(200,{record:result[0]});
    }
    if(action==='member'){
      if(!uuid(body.company_id))throw new HttpError(400,'Cliente non valido.');
      const name=text(body.name,160),email=text(body.email,254).toLowerCase();
      if(!name||!/^\S+@\S+\.\S+$/.test(email))throw new HttpError(400,'Inserisci nome ed email validi.');
      let id=body.user_id;
      if(!id){
        const password=text(body.password,200);
        if(password.length<12)throw new HttpError(400,'La password deve avere almeno 12 caratteri.');
        const result=await upstream('/auth/v1/admin/users',{method:'POST',secret:true,data:{email,password,email_confirm:true,user_metadata:{name}}});
        id=result.id;
      }
      if(!uuid(id))throw new HttpError(400,'ID utente non valido.');
      const existing=await db('ordini_memberships?user_id=eq.'+id+'&select=user_id');
      await db('ordini_memberships'+(existing.length?'?user_id=eq.'+id:''),{method:existing.length?'PATCH':'POST',data:{user_id:id,company_id:body.company_id,name,email,active:body.active!==false}});
      return send(200,{ok:true});
    }
    throw new HttpError(404,'Operazione non disponibile.');
  }catch(err){
    if(err instanceof SyntaxError)return send(400,{error:'Richiesta non valida.'});
    if(!(err instanceof HttpError))console.error('Portal error',{name:err.name,message:err.message});
    return send(err.status||500,{error:err instanceof HttpError?err.message:'Servizio momentaneamente non disponibile. Riprova tra poco.'});
  }
}
