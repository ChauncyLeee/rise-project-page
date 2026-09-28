const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const groups = [];
const lastAt = (items, time) => {
  let lo = 0, hi = items.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (items[mid].time <= time) lo = mid + 1; else hi = mid; }
  return lo - 1;
};
for (const [index, demo] of [...window.DEMOS, ...(window.HM3D_DEMOS || [])].entries()) {
  const card = document.createElement('article');
  card.className = demo.decisions ? 'demo-card hm3d-card' : 'demo-card'; card.id = demo.id;
  card.innerHTML = `<header class="demo-header"><div class="demo-title"><span class="demo-number">${demo.number || (demo.decisions ? '01' : String(index + 1).padStart(2, '0'))}</span><div><h3>${demo.title}</h3>${demo.decisions ? '' : `<p>${demo.description}</p>`}${!demo.decisions && demo.note ? `<p class="demo-excerpt-note">${demo.note}</p>` : ''}</div></div><span class="demo-badge">${formatTime(demo.duration)}</span></header>
  <div class="demo-body"><div class="video-area"><div class="view-grid">${demo.views.map((view, i) => `<figure class="view-tile ${i === 0 ? 'world-tile' : ''}" data-view="${view.id}"><figcaption><span>${view.label}</span><span>${view.width} × ${view.height} <button class="expand" aria-label="Expand ${demo.title} ${view.label}">⛶</button></span></figcaption><div class="view-screen" style="aspect-ratio:${i === 0 ? `${view.width}/${view.height}` : (demo.decisions ? `${view.width}/${view.height}` : '4/3')}"><video controls muted playsinline preload="metadata" poster="${view.poster}" aria-label="${demo.title}: ${view.label}"><source src="${view.src}" type="video/mp4"></video>${i === 0 ? `<label class="world-speed">Speed <select aria-label="${demo.title} playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2" selected>2×</option><option value="2.5">2.5×</option><option value="3">3×</option></select></label>` : ''}</div></figure>`).join('')}</div>
  <p class="error-message" role="alert" hidden></p></div>
  <aside class="keyframes" aria-label="${demo.title} keyframes and execution trace"><div class="keyframes-heading"><h4>Keyframes</h4><span>${demo.frames.length} FRAMES</span></div><p class="frame-hint">Task milestones · Seek all views</p><div class="frame-list">${demo.frames.map(frame => `<button class="frame" data-time="${frame.time}" aria-label="Seek all views to ${formatTime(frame.time)}, ${frame.label}" aria-pressed="false"><img src="${frame.image}" alt="${frame.label}"><span class="frame-text"><time>${formatTime(frame.time)}</time><span class="frame-label">${frame.label}</span></span></button>`).join('')}</div>${demo.decisions ? `<div class="decision-panel"><h4>Recorded Decision</h4><p class="decision-text"></p></div>` : ''}<div class="trace-heading"><h4>Execution Trace</h4><span class="call-count">0 tool calls</span></div><div class="trace-list" aria-label="Execution events at the current timestamp"></div></aside></div>`;
  if (demo.insetView) {
    const inset = card.querySelector(`[data-view="${demo.insetView}"]`);
    inset.classList.add('map-inset');
    inset.querySelector('video').controls = false;
    const expand = inset.querySelector('.expand');
    inset.querySelector('figcaption').remove();
    inset.append(expand);
    card.querySelector('.world-tile > .view-screen').append(inset);
  }
  if (demo.outcome && !demo.decisions) {
    const outcome = document.createElement('p');
    outcome.className = 'hm3d-card-outcome';
    outcome.textContent = demo.outcome;
    card.append(outcome);
  }
  document.querySelector(demo.container || '#demo-list').append(card);
  const videos = [...card.querySelectorAll('video')], master = videos[0];
  const frameButtons = [...card.querySelectorAll('.frame')];
  const error = card.querySelector('.error-message');
  const expectedSeek = new WeakMap(), ignoredPause = new WeakSet();
  let playing = false, buffering = false, changing = false, generation = 0, speed = demo.playbackRate || 2, frameIndex = -2, eventIndex = -2;
  const events = demo.events || [];
  const pauseMedia = () => videos.forEach(v => { if (!v.paused) { ignoredPause.add(v); v.pause(); } });
  const update = () => {
    const time = master.currentTime || 0;
    if (demo.decisions) {
      const decision = lastAt(demo.decisions, time);
      card.querySelector('.decision-text').textContent = decision >= 0 ? demo.decisions[decision].detail : 'Read the goal and inspect the initial views before choosing a safe route.';
    }
    const next = lastAt(demo.frames, time);
    if (next !== frameIndex) {
      frameIndex = next;
      frameButtons.forEach((b, i) => { b.classList.toggle('active', i === next); b.setAttribute('aria-pressed', String(i === next)); });
      if (next >= 0) {
        const b = frameButtons[next], list = card.querySelector('.frame-list');
        if (demo.decisions) {
          const bounds = b.getBoundingClientRect(), viewport = list.getBoundingClientRect();
          if (list.scrollWidth > list.clientWidth) {
            if (bounds.left < viewport.left || bounds.right > viewport.right) list.scrollLeft += bounds.left - viewport.left - (list.clientWidth - bounds.width) / 2;
          } else if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) {
            list.scrollTop += bounds.top - viewport.top - (list.clientHeight - bounds.height) / 2;
          }
        } else if (b.offsetTop < list.scrollTop || b.offsetTop + b.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = b.offsetTop - list.clientHeight / 2;
      }
    }
    const event = lastAt(events, time);
    if (event !== eventIndex) {
      eventIndex = event;
      card.querySelector('.call-count').textContent = `${event < 0 ? 0 : events[event].calls} tool calls`;
      const list = card.querySelector('.trace-list'); list.replaceChildren();
      if (event < 0) { const p = document.createElement('p'); p.textContent = 'No execution events yet.'; list.append(p); }
      for (let i = Math.max(0, event - 2); i <= event; i++) {
        const e = events[i], item = document.createElement('article'), heading = document.createElement('small'), title = document.createElement('strong'), body = document.createElement('p');
        item.className = 'trace-event';
        heading.textContent = `${formatTime(e.time)} · ${{text:'Reasoning',thinking:'Thinking',tool_call:'Tool call',tool_result:'Result',presentation_note:'Presentation summary'}[e.type] || e.type}`;
        title.textContent = e.tool ? e.tool.replaceAll('_', ' ') : '';
        body.textContent = typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail ?? {});
        item.append(heading, title, body); list.append(item);
      }
      list.scrollTop = list.scrollHeight;
    }
  };
  const fail = message => { playing = false; buffering = false; changing = false; generation++; pauseMedia(); error.textContent = message; error.hidden = false; update(); };
  const pause = () => { playing = false; buffering = false; generation++; changing = false; pauseMedia(); update(); };
  let resuming = false;
  const resume = async () => {
    if (!playing || changing || resuming) return;
    const token = generation;
    if (videos.some(v => v.readyState < 3 || v.seeking)) { buffering = true; pauseMedia(); update(); return; }
    buffering = false; resuming = true;
    try { await Promise.all(videos.map(v => v.play())); }
    catch (err) {
      // A coordinated buffer pause can interrupt a pending play() promise.
      // Keep the user's playback intent and retry when every view is ready.
      if (generation === token && playing) {
        if (err.name === 'AbortError') { buffering = true; pauseMedia(); }
        else fail('Playback could not start. Use a video play button to try again.');
      }
    } finally { resuming = false; }
    update();
  };
  const position = (v, time) => new Promise((resolve, reject) => {
    const target = Math.min(time, Number.isFinite(v.duration) ? v.duration - 0.001 : time);
    let timeout;
    const clean = () => { clearTimeout(timeout); v.removeEventListener('seeked', done); v.removeEventListener('loadedmetadata', seek); v.removeEventListener('error', failed); };
    const done = () => { if (Math.abs(v.currentTime - target) < .15 && !v.seeking) { clean(); resolve(); } };
    const failed = () => { clean(); reject(new Error('View unavailable')); };
    const seek = () => {
      if (Math.abs(v.currentTime - target) < .01 && !v.seeking) { clean(); resolve(); return; }
      expectedSeek.set(v, target); v.currentTime = target;
    };
    timeout = setTimeout(failed, 15000);
    v.addEventListener('seeked', done); v.addEventListener('error', failed);
    if (v.readyState === 0) { v.addEventListener('loadedmetadata', seek, {once:true}); v.load(); } else seek();
  });
  const seekAll = async (time, shouldPlay = playing) => {
    const token = ++generation;
    playing = shouldPlay; buffering = false; changing = true; error.hidden = true;
    if (playing) groups.forEach(g => { if (g !== group) g.pause(); });
    // Metadata-only preload may never fetch enough data to emit canplay.
    // Activate all streams in this task before waiting for shared readiness.
    videos.forEach(v => { v.preload = 'auto'; });
    pauseMedia(); update();
    try {
      await Promise.all(videos.map(v => position(v, Math.max(0, Math.min(time, demo.duration - .001)))));
      if (token !== generation) return;
      changing = false; update(); if (playing) await resume();
    } catch { if (token === generation) fail('A view could not be synchronized. Check the local video files and try again.'); }
  };
  const group = { pause, seek: seekAll }; groups.push(group);
  frameButtons.forEach(b => b.addEventListener('click', () => seekAll(Number(b.dataset.time), true)));
  const setSpeed = value => { speed = value; videos.forEach(v => { if (v.playbackRate !== value) v.playbackRate = value; }); card.querySelector('select').value = String(value); };
  card.querySelector('select').addEventListener('change', e => setSpeed(Number(e.target.value)));
  videos.forEach(v => {
    v.addEventListener('play', () => { if (!playing && !changing) seekAll(v.currentTime, true); });
    v.addEventListener('pause', () => { if (ignoredPause.has(v)) { ignoredPause.delete(v); return; } if (playing && !changing && !buffering && !v.ended) pause(); });
    v.addEventListener('seeking', () => {
      const expected = expectedSeek.get(v);
      if (expected !== undefined && Math.abs(v.currentTime - expected) < .15) return;
      seekAll(v.currentTime);
    });
    v.addEventListener('seeked', () => { expectedSeek.delete(v); update(); });
    v.addEventListener('ratechange', () => { if (v.playbackRate !== speed) setSpeed(v.playbackRate); });
    v.addEventListener('waiting', () => { if (playing && !changing) { buffering = true; pauseMedia(); update(); } });
    v.addEventListener('canplay', () => { if (buffering && playing && !changing) resume(); });
    v.addEventListener('ended', () => { if (v === master) pause(); });
    v.addEventListener('error', () => fail('A video could not be loaded. Check that all view files are available.'));
    v.querySelector('source').addEventListener('error', () => fail('A video file is missing or cannot be decoded.'));
    v.closest('figure').querySelector('.expand').addEventListener('click', () => { const target = demo.insetView && v === master ? v.parentElement : v; if (target.requestFullscreen) target.requestFullscreen().catch(() => {}); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); });
  });
  videos.forEach(v => { v.defaultPlaybackRate = demo.playbackRate || 2; });
  setSpeed(demo.playbackRate || 2);
  master.addEventListener('timeupdate', update);
  let lastCheck = 0;
  const tick = now => {
    if (playing && !changing && now - lastCheck > 150) {
      lastCheck = now;
      if (buffering) resume();
      else for (const v of videos.slice(1)) if (!v.seeking && Math.abs(v.currentTime - master.currentTime) > .12) { expectedSeek.set(v, master.currentTime); v.currentTime = master.currentTime; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick); update();
}
