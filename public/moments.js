const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function overlay(content, label) {
  const el = document.createElement('dialog');
  el.className = 'brand-moment';
  el.setAttribute('aria-label', label);
  el.innerHTML = content;
  el.addEventListener('cancel', event => event.preventDefault());
  document.body.append(el);
  el.showModal();
  return el;
}
export async function telescopicIntro(slug, imageUrl, name) {
  const el = overlay(`<div class="crane-stage">
    <svg aria-hidden="true" viewBox="0 0 300 108" class="handler-art">
<g transform="translate(75 73) rotate(-18)">
 <g class="handler-slider"><path fill="#344a78" d="M40-5h90v9H40z"/>
 <g transform="translate(129 0) rotate(18)"><path d="M0-3v21h25m-20-20v16h23" fill="none" stroke="#17294e" stroke-width="3" stroke-linejoin="round"/></g></g>
 <path fill="#f15922" d="M-5-8h97v15H-5z"/><path fill="#ff9666" d="M0-7h87v3H0z"/><path fill="#223c98" d="M86-9h8v18h-8z"/>
</g><path fill="#223c98" d="M41 70l10-9 30 2 5 9h44l9 8-4 10H42z"/>
<path fill="#142952" d="M75 71l4-28h23l11 28z"/><path fill="#c8e2eb" d="M83 47h8v19H80zm12 0h5l8 19H95z"/>
<path fill="#f15922" d="M44 71h29l4 6h57v6H43z"/>
<g fill="#18263b" stroke="#34455c" stroke-width="3"><circle cx="60" cy="88" r="13"/><circle cx="121" cy="88" r="15"/></g>
<g fill="#e4eaf1"><circle cx="60" cy="88" r="6"/><circle cx="121" cy="88" r="7"/></g></svg><img class="crane-logo" alt=""></div>`, "Accesso "+name);
  try {
    el.classList.add(slug==="rimac" ? "rimac-intro" : "titocci-intro");
    const logo = el.querySelector('img');
    logo.alt=name;
    if(imageUrl){logo.src=imageUrl;}else{const label=document.createElement('strong');label.className='customer-name';label.textContent=name;el.querySelector('.crane-stage').append(label);logo.hidden=true;}
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    await wait(reduced ? 300 : 1850);
    const target = document.querySelector('header img');
    if (target && imageUrl && !reduced) {
      const a = logo.getBoundingClientRect(), b = target.getBoundingClientRect();
      await logo.animate([{transform:'none'},{transform:`translate(${b.left-a.left}px,${b.top-a.top}px) scale(${b.width/a.width})`}],{duration:370,easing:'cubic-bezier(.45,0,.2,1)',fill:'forwards'}).finished;
    }
  } finally { el.remove(); }
}
export async function orderConfirmation(){
  const el = overlay('<section class="sent-card" role="status"><span aria-hidden="true">✓</span><h2>Ordine inviato!</h2><p>Grazie per aver scelto RAIA S.r.l.</p></section>', 'Ordine inviato');
  try { await wait(2100); } finally { el.remove(); }
}

export async function productConfirmation(updated) {
  const title = updated ? 'Prodotto aggiornato' : 'Prodotto aggiunto';
  const el = overlay('<section class="sent-card product-saved" role="status"><span aria-hidden="true">✓</span><h2>'+title+'</h2></section>', title);
  try { await wait(2000); } finally { el.remove(); }
}
