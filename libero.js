/* One composite stream keeps both camera views synchronized, including fullscreen. */
for (const demo of window.LIBERO_DEMOS) {
  const card = document.createElement('article');
  card.className = 'demo-card libero-card';
  card.id = demo.id;
  card.innerHTML = `<header class="demo-header"><div class="demo-title"><span class="demo-number">${String(demo.taskId).padStart(2, '0')}</span><div><h3>${demo.title}</h3><p></p></div></div></header>
    <div class="libero-body"><div class="libero-media">
      <div class="view-screen"><video controls muted playsinline preload="metadata" poster="${demo.poster}" aria-label="${demo.title}: third-person view with wrist inset"><source src="${demo.src}" type="video/mp4"></video><label class="world-speed">Speed <select aria-label="${demo.title} playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2" selected>2×</option><option value="2.5">2.5×</option><option value="3">3×</option></select></label></div>
      <p class="error-message" role="alert" hidden></p>
    </div></div>`;
  card.querySelector('.demo-header p').textContent = demo.instruction;
  document.querySelector('#libero-list').append(card);
  const video = card.querySelector('video');
  const error = card.querySelector('.error-message');
  const fail = () => { error.textContent = 'The video could not be loaded. Reload the page to try again.'; error.hidden = false; };
  const group = { pause: () => video.pause() };
  groups.push(group);
  video.addEventListener('play', () => { error.hidden = true; groups.forEach(other => { if (other !== group) other.pause(); }); });
  video.addEventListener('error', fail);
  video.querySelector('source').addEventListener('error', fail);
  video.defaultPlaybackRate = 2;
  video.playbackRate = 2;
  const speed = card.querySelector('select');
  speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
  video.addEventListener('ratechange', () => { speed.value = String(video.playbackRate); });
}
