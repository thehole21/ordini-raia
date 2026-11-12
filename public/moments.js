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
export async function telescopicIntro() {
  const el = overlay(`<div class="crane-stage">
    <svg aria-hidden="true" viewBox="0 0 300 100" class="boom-machine">
      <g transform="translate(46 77) rotate(-18)">
        <g class="boom-middle"><g class="boom-tip"><rect x="50" y="-4" width="57" height="8" rx="2" fill="#f15922"/><circle cx="106" cy="0" r="5" fill="#243c91"/></g>
        <rect x="38" y="-6" width="56" height="12" rx="2" fill="#516fc4"/></g>
        <rect x="0" y="-8" width="76" height="16" rx="4" fill="#223c98"/><rect x="68" y="-9" width="8" height="18" rx="2" fill="#f15922"/>
      </g><path d="M24 78h19l6-16h12l9 16h10v9H24z" fill="#243c91"/>
      <g fill="#17294e" stroke="white" stroke-width="2"><circle cx="36" cy="87" r="8"/><circle cx="68" cy="87" r="8"/></g></svg><img class="crane-logo" src="/titocci-logo.png" alt="Titocci Noleggio"></div>`, 'Accesso Titocci');
  try {
    const logo = el.querySelector('img');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    await wait(reduced ? 300 : 1700);
    const target = document.querySelector('header img');
    if (target && !reduced) {
      const a = logo.getBoundingClientRect(), b = target.getBoundingClientRect();
      await logo.animate([{transform:'none'},{transform:`translate(${b.left-a.left}px,${b.top-a.top}px) scale(${b.width/a.width})`}],{duration:370,easing:'cubic-bezier(.45,0,.2,1)',fill:'forwards'}).finished;
    }
  } finally { el.remove(); }
}
export async function orderConfirmation(){
  const el = overlay('<section class="sent-card" role="status"><span aria-hidden="true">✓</span><h2>Ordine inviato!</h2><p>Grazie per aver scelto RAIA S.r.l.</p></section>', 'Ordine inviato');
  try { await wait(2100); } finally { el.remove(); }
}
