// Shared by every page of springdesk.app

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

// Videos marked with data-src load and play only while on screen.
(function () {
  const videos = document.querySelectorAll('video[data-src]');
  if (!videos.length) return;
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, { threshold: 0.4 });
  videos.forEach(video => watcher.observe(video));
})();
