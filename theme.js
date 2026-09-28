/* Apply saved appearance before CSS paints; storage may be unavailable. */
(() => {
  const root=document.documentElement,key='rise-theme';
  let theme='dark';
  try{if(localStorage.getItem(key)==='light')theme='light';}catch{}
  function apply(value,save=false){
    root.dataset.theme=value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value==='light'?'#eff3ef':'#080f16');
    document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===value)));
    if(save)try{localStorage.setItem(key,value);}catch{}
    window.dispatchEvent(new Event('rise-theme-change'));
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded',()=>{
    apply(root.dataset.theme);
    document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.themeChoice,true)));
  });
  window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue==='light'?'light':'dark');});
})();
