import { telescopicIntro, orderConfirmation } from './moments.js';
const root=document.querySelector('#app'), notice=document.querySelector('#toast');
let data,company,page='catalog',cart={},key=crypto.randomUUID();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'':Number(v).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
function msg(s){notice.textContent=s;clearTimeout(msg.timer);msg.timer=setTimeout(()=>notice.textContent='',5500)}
async function api(action,body){const r=await fetch('/api/portal?action='+action,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const j=await r.json();if(!r.ok)throw Error(j.error);return j}
async function refresh(){data=await api('session');company=data.companies.find(c=>c.id===company?.id)||data.companies[0];render()}
function login(){document.body.className='signed-out';root.innerHTML='<form class="login" id="login"><img src="/raia.png" alt="RAIA"><h1>Area ordini</h1><p>Accedi al catalogo riservato.</p><label>Nome utente o email<input name="email" required autocomplete="username"></label><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button>Accedi</button><p><small>Portale clienti RAIA</small></p></form>'}
const products=()=>data.products.filter(p=>p.company_id===company?.id&&p.active);
const count=()=>Object.values(cart).reduce((a,b)=>a+b,0);
function picture(p){const url=p.image_url||(company?.slug==='titocci'&&p.sku?'/adesivi/'+encodeURIComponent(p.sku)+'.png':'');return url?'<div class="artwork"><img loading="lazy" alt="'+esc(p.name+' '+p.description)+'" src="'+esc(url)+'"></div>':''}

function navButton(id, label) {
  const paths = {
    catalog: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    cart: 'M2 4h3l3 12h11l3-9H6 M9 20h.01 M18 20h.01',
    orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
    admin: 'M4 6h16 M4 12h16 M4 18h16'
  };
  const icon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="'+paths[id]+'"/></svg>';
  const active = id === page ? ' aria-current="page"' : '';
  const title = id === 'cart' ? 'Carrello <b class="nav-count">'+count()+'</b>' : label;
  return '<button data-page="'+id+'"'+active+'>'+icon+'<span>'+title+'</span></button>';
}

function render(){document.body.className=company?.slug==="titocci"?"titocci":"";document.documentElement.style.setProperty('--brand',company?.color||'#223c98');root.innerHTML='<header><div>'+(company?.logo_url?'<img alt="'+esc(company.name)+'" src="'+esc(company.slug==="titocci"?"/titocci-logo.png":company.logo_url)+'">':esc(company?.name||'RAIA'))+'</div><button data-act="logout">Esci</button></header><nav>'+[['catalog','Catalogo'],['cart','Carrello ('+count() +')'],['orders','Ordini'],...(data.staff?[['admin','Gestione RAIA']]:[])].map(([id,t])=>navButton(id,t)).join('')+'</nav><h1>'+({catalog:'Catalogo riservato',cart:'Il tuo ordine',orders:'Storico ordini',admin:'Gestione clienti'}[page])+'</h1><div id="content"></div>';const box=document.querySelector('#content');if(count() && page!=='cart')root.insertAdjacentHTML('beforeend','<button class="cart-float" data-page="cart" aria-label="Apri carrello, '+count()+' pezzi"><span aria-hidden="true">🛒</span> Carrello <b>'+count()+'</b></button>');
if(page==='catalog'){box.innerHTML='<p>'+esc(company?.name)+' · '+products().length+' articoli</p><div class="grid">'+products().map(p=>'<article class="product">'+picture(p)+'<small>'+esc(p.sku)+'</small><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><p>'+money(p.price)+'</p><div class="row"><input aria-label="Quantità '+esc(p.sku)+'" id="q'+p.id+'" type="number" min="'+p.min_qty+'" step="'+p.qty_step+'" value="'+p.min_qty+'"><button data-add="'+p.id+'">Aggiungi</button></div></article>').join('')+'</div>'}
if(page==='cart'){box.innerHTML=Object.keys(cart).length?'<section class="panel">'+Object.entries(cart).map(([id,q])=>{const p=products().find(x=>x.id===id);return '<p>'+esc(p?.sku)+' · '+esc(p?.name)+' × '+q+' <button data-remove="'+id+'">Rimuovi</button></p>'}).join('')+'<form id="order"><label>Data di consegna (facoltativa)<input type="date" name="requested_date"></label><label>Note<textarea name="notes"></textarea></label><button>Invia ordine a RAIA</button></form></section>':'<p>Il carrello è vuoto.</p>'}
if(page==='orders'){box.innerHTML=data.orders.filter(o=>data.staff||o.company_id===company.id).map(o=>'<article><strong>WEB-'+String(o.number).padStart(6,'0')+'</strong> · '+esc(o.status)+' · '+new Date(o.created_at).toLocaleDateString('it-IT')+'<p>'+o.ordini_order_items.map(i=>esc(i.name)+' × '+i.quantity).join('<br>')+'</p><button data-repeat="'+o.id+'">Riordina</button></article>').join('')||'<p>Nessun ordine ricevuto.</p>'}
if(page==='admin'){box.innerHTML='<label>Cliente attivo <select id="company">'+data.companies.map(c=>'<option value="'+c.id+'" '+(c.id===company?.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label><div class="grid">'+form('company','Nuovo cliente',[['name','Nome'],['slug','Identificativo'],['color','Colore','color'],['logo_url','URL logo','url']])+form('product','Aggiungi prodotto',[['name','Nome'],['sku','Codice'],['description','Formato / descrizione'],['price','Prezzo unitario','number']])+form('member','Crea accesso',[['name','Nome'],['email','Email','email'],['password','Password','password']])+'</div>'}}
function form(id,title,fields){return '<form class="panel" id="'+id+'"><h3>'+title+'</h3>'+fields.map(([n,l,t])=>'<label>'+l+'<input name="'+n+'" type="'+(t||'text')+'" '+(t==='number'?'min="0" step=".0001"':'')+'></label>').join('')+'<button>Salva</button></form>'}
root.onchange=e=>{if(e.target.id==='company'){company=data.companies.find(c=>c.id===e.target.value);cart={};key=crypto.randomUUID();render()}}
root.onclick=async e=>{let b=e.target.closest('button');if(!b)return;try{if(b.dataset.page){page=b.dataset.page;if(page==='orders'){await refresh()}else{render()}}if(b.dataset.act==='logout'){await api('logout',{});cart={};data=null;company=null;page='catalog';login()}if(b.dataset.add){let id=b.dataset.add,input=document.getElementById('q'+id);if(!input.reportValidity())return;cart[id]=(cart[id]||0)+Number(input.value);key=crypto.randomUUID();render()}if(b.dataset.remove){delete cart[b.dataset.remove];key=crypto.randomUUID();render()}if(b.dataset.repeat){const o=data.orders.find(x=>x.id===b.dataset.repeat);company=data.companies.find(c=>c.id===o.company_id);cart={};for(const i of o.ordini_order_items)if(products().some(p=>p.id===i.product_id))cart[i.product_id]=i.quantity;key=crypto.randomUUID();page='cart';render()}}catch(err){msg(err.message)}};
root.onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{const fields=Object.fromEntries(new FormData(f));if(f.id==='login'){await api('login',fields);await refresh();if(company?.slug==='titocci')await telescopicIntro()}else if(f.id==='order'){await api('submit',{...fields,request_id:key,company_id:company.id,items:Object.entries(cart).map(([product_id,quantity])=>({product_id,quantity}))});cart={};key=crypto.randomUUID();await orderConfirmation();page='catalog';render();window.scrollTo(0,0);await refresh()}else{await api(f.id,{...fields,company_id:company?.id,min_qty:1,qty_step:1});await refresh();msg('Salvato')}}catch(err){msg(err.message)}finally{b.disabled=false}};
refresh().catch(()=>login());

let refreshingHistory=false;
async function updateOpenHistory(){
 if(refreshingHistory || !data || page!=="orders" || document.hidden)return;
 refreshingHistory=true;
 try{const latest=await api("session");if(data?.user.id===latest.user.id && page==="orders"){data.orders=latest.orders;render()}}catch{/* Retry on the next refresh. */}finally{refreshingHistory=false}
}
setInterval(updateOpenHistory,30000);
document.addEventListener("visibilitychange",updateOpenHistory);
