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
export async function craneIntro() {
  const el = overlay(`<div class="crane-stage">
    <svg aria-hidden="true" viewBox="0 0 300 100" class="crane">
      <g fill="none" stroke="#223c98" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
        <path d="M43 91h42M56 89V31h15v58M56 86l15-16-15-15 15-15"/>
        <g class="jib"><path d="M29 31h185L66 9 29 31zM65 10v21m1-19 27 19 16-13 20 13 13-9 21 9"/>
        <path stroke="#f15922" d="M189 31v28q0 10-8 9-5-1-5-6"/></g>
      </g></svg><img class="crane-logo" src="/titocci-logo.png" alt="Titocci Noleggio"></div>`, 'Accesso Titocci');
  try {
    const logo = el.querySelector('img');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    await wait(reduced ? 300 : 1420);
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
