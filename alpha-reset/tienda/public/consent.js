// Cookie consent for the Meta Pixel (UK PECR / EU ePrivacy).
// In the pixel base code, call  fbq('consent','revoke')  right after the loader and BEFORE  fbq('init', ...).
// This script calls  fbq('consent','grant')  once the visitor accepts, and remembers the choice.
(function(){
  var KEY='ar_consent', choice=null;
  try{ choice=localStorage.getItem(KEY); }catch(_){}
  function grant(){ if(window.fbq) fbq('consent','grant'); }
  function save(v){
    try{ localStorage.setItem(KEY,v); }catch(_){}
    var el=document.getElementById('consent'); if(el) el.classList.remove('on');
    if(v==='granted') grant();
  }
  if(choice==='granted'){ grant(); return; }
  if(choice==='denied') return;
  document.addEventListener('DOMContentLoaded',function(){
    var el=document.createElement('div'); el.id='consent'; el.className='consent on';
    el.innerHTML='<span>We use cookies to measure our ads and improve the site (Meta Pixel). <a href="/legal#privacy" style="color:var(--gold)">Privacy policy</a></span>'+
      '<span class="btns"><button type="button" class="btn ghost" id="c_no">Decline</button><button type="button" class="btn" id="c_yes">Accept</button></span>';
    document.body.appendChild(el);
    document.getElementById('c_yes').addEventListener('click',function(){ save('granted'); });
    document.getElementById('c_no').addEventListener('click',function(){ save('denied'); });
  });
})();
