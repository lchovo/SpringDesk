// Shared by every page of springdesk.app. Every page works without it: films stay on their pictures, the hero shows
// the tidy desktop, questions open and close by themselves (<details>).

// Where the visitor came from: a link like springdesk.app/?ref=press-xda carries the source to the Store,
// where Partner Center counts it as the campaign (cid). Kept for the visit, so it survives moving between pages.
(function () {
  let ref = new URLSearchParams(location.search).get('ref');
  try {
    if (ref) sessionStorage.setItem('springdesk-ref', ref);
    else ref = sessionStorage.getItem('springdesk-ref');
  } catch (e) { /* storage blocked: use the link's own ref only */ }
  if (!ref || !/^[a-z0-9][a-z0-9-]{0,39}$/i.test(ref)) return;
  document.querySelectorAll('a[href^="https://apps.microsoft.com/detail/"]').forEach(link => {
    const url = new URL(link.href);
    url.searchParams.set('cid', ref);
    link.href = url.toString();
  });
})();

// "anim" is set in each page's <head> when the visitor hasn't asked Windows (or their system) for less motion.
const MOVING = document.documentElement.classList.contains('anim');

// A film has a 720p file and sometimes a 1080p one; the big one only where it will be shown big.
function fileFor(video) {
  const saving = navigator.connection && navigator.connection.saveData;
  const shown = video.clientWidth * (window.devicePixelRatio || 1);
  return video.dataset.srcHd && !saving && shown > 1400 ? video.dataset.srcHd : video.dataset.src;
}

// The top bar turns to glass once the page has moved under it.
(function () {
  const bar = document.querySelector('.bar');
  if (!bar) return;
  const check = () => bar.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', check, { passive: true });
  check();
})();

// Films load and play only while on screen. With less motion asked for, they wait for a click instead.
(function () {
  const videos = document.querySelectorAll('video[data-src]:not([data-film])');
  if (!videos.length) return;
  videos.forEach(video => video.addEventListener('playing', () => video.classList.add('playing')));
  if (!MOVING) {
    videos.forEach(video => {
      const frame = video.closest('.film-in, figure');
      if (!frame) return;
      frame.style.cursor = 'pointer';
      frame.addEventListener('click', () => {
        if (!video.src) video.src = fileFor(video);
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      });
    });
    return;
  }
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.src) video.src = fileFor(video);
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, { threshold: 0.35 });
  videos.forEach(video => watcher.observe(video));
})();

// The hero's switch. On: the film of a desktop being sorted into boxes. Off: the film of SpringDesk being switched
// off and every icon going back. Each film ends on the picture the other starts with, so they hand over unseen.
(function () {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const button = stage.querySelector('.switch');
  const films = { on: stage.querySelector('video[data-film="on"]'), off: stage.querySelector('video[data-film="off"]') };
  let state = stage.dataset.state;
  let touched = false;

  function load(video) {
    if (!video.src) { video.src = fileFor(video); video.load(); }
  }

  function show(next) {
    state = next;
    stage.dataset.state = next;
    button.setAttribute('aria-checked', String(next === 'on'));
    if (!MOVING) return;   // the two pictures only
    const film = films[next], other = films[next === 'on' ? 'off' : 'on'];
    load(film);
    try { film.currentTime = 0; } catch (e) { /* not loaded yet: it starts at 0 anyway */ }
    film.addEventListener('playing', () => {
      if (state !== next) return;
      film.classList.add('playing');
      other.classList.remove('playing');
      other.pause();
    }, { once: true });
    film.play().catch(() => {});
  }

  button.addEventListener('click', () => { touched = true; show(state === 'on' ? 'off' : 'on'); });
  if (!MOVING) return;

  // The other film is fetched once it's likely to be wanted.
  films.on.addEventListener('ended', () => load(films.off));
  button.addEventListener('pointerenter', () => load(films[state === 'on' ? 'off' : 'on']), { once: true });

  // The page opens on the desktop as Windows had it, and the switch flips itself once.
  load(films.on);
  setTimeout(() => { if (!touched) show('on'); }, 700);
})();

// The link of the part of the page being read is lit, like the current tab of a box.
(function () {
  const links = [...document.querySelectorAll('.tabs a[href^="#"]')];
  const parts = links.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  if (!parts.length) return;
  const seen = new Set();
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) seen.add(entry.target);
      else seen.delete(entry.target);
    }
    const current = parts.filter(part => seen.has(part)).pop();
    for (const link of links) {
      if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  parts.forEach(part => watcher.observe(part));
})();

// Things come into view once.
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!items.length || !MOVING) return;
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      watcher.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  items.forEach(item => watcher.observe(item));
})();

// "Watch the film" plays it here; YouTube is only contacted after the click. Without this the link opens YouTube.
(function () {
  const opener = document.querySelector('a[data-film-id]');
  if (!opener || typeof HTMLDialogElement === 'undefined') return;
  let dialog;
  opener.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'cinema';
      const close = document.createElement('button');
      close.className = 'cinema-close';
      close.textContent = opener.dataset.close || 'Close';
      close.addEventListener('click', () => dialog.close());
      dialog.append(close);
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { const frame = dialog.querySelector('iframe'); if (frame) frame.remove(); });
      document.body.append(dialog);
    }
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(opener.dataset.filmId) + '?autoplay=1&rel=0';
    frame.title = opener.dataset.title || 'SpringDesk';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    dialog.append(frame);
    dialog.showModal();
  });
})();
