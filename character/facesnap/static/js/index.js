window.HELP_IMPROVE_VIDEOJS = false;

function openLightbox(src) {
  const overlay = document.getElementById('lightbox-overlay');
  const img = document.getElementById('lightbox-img');
  if (!overlay || !img) return;
  img.src = src;
  overlay.classList.add('active');
}

function closeLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

document.addEventListener('DOMContentLoaded', () => {
  // Keep Bulma slider if needed elsewhere
  if (window.bulmaSlider) bulmaSlider.attach();

  function syncVideos(swiperEl) {
    // Pause/reset everything in this swiper
    swiperEl.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch (_) {}
    });

    // Play videos in all currently visible slides (supports slidesPerView > 1)
    const visible = swiperEl.querySelectorAll('.swiper-slide-visible, .swiper-slide-active');
    if (!visible.length) return;

    visible.forEach((slide) => {
      slide.querySelectorAll('video').forEach((v) => {
        v.muted = true;
        v.playsInline = true;
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      });
    });
  }

  function initSwiper(rootSelector, opts) {
    const el = document.querySelector(rootSelector);
    if (!el) return null;

    const swiper = new Swiper(el, {
      loop: true,
      speed: 300,
      watchSlidesProgress: true,
      observer: true,
      observeParents: true,

      // IMPORTANT: bind controls *within this swiper element*
      navigation: {
        nextEl: el.querySelector('.swiper-button-next'),
        prevEl: el.querySelector('.swiper-button-prev'),
      },
      pagination: {
        el: el.querySelector('.swiper-pagination'),
        clickable: true,
      },

      ...opts,
      on: {
        init: () => syncVideos(el),
        slideChangeTransitionStart: () => syncVideos(el),
        ...((opts && opts.on) || {}),
      },
    });

    // Ensure initial slide videos start
    syncVideos(el);
    return swiper;
  }
  	function getSlideDelayMs(slideEl, fallbackMs = 1000) {
		const videos = Array.from(slideEl.querySelectorAll('video'));
		if (videos.length === 0) return fallbackMs;

		// duration is seconds; may be NaN until metadata is loaded
		const durations = videos
			.map(v => Number(v.duration))
			.filter(d => Number.isFinite(d) && d > 0);

		if (durations.length === 0) return fallbackMs;

		// Parallel videos: wait for the longest one
		const seconds = Math.max(...durations);

		// If instead you want sequential: const seconds = durations.reduce((a, b) => a + b, 0);

		return Math.ceil(seconds * 1000);
	}

	function applyAutoplayDelayForActiveSlide(swiper, { fallbackMs = 1000, extraMs = 150 } = {}) {
		if (!swiper.params.autoplay) return; // autoplay must be enabled in init params
		const slideEl = swiper.slides[swiper.activeIndex];
		if (!slideEl) return;

		const delayMs = getSlideDelayMs(slideEl, fallbackMs) + extraMs;

		swiper.params.autoplay.delay = delayMs;

		// Restart autoplay so the new delay takes effect immediately
		swiper.autoplay.stop();
		swiper.autoplay.start();
	}

	function wireAutoplayToVideoMetadata(swiper, options) {
		const update = () => applyAutoplayDelayForActiveSlide(swiper, options);

		// Update when slide changes
		swiper.on('init', update);
		swiper.on('slideChangeTransitionEnd', update);

		// Update when metadata becomes available (duration known)
		swiper.el.addEventListener(
			'loadedmetadata',
			(e) => {
			if (e.target && e.target.tagName === 'VIDEO') update();
			},
			true // capture, so it catches events from child <video>
		);

		// Initial
		update();
	}


  // Optim results carousel
  const swiper_optim = initSwiper('#optim-results-carousel', {
    autoplay: false,
  });

  // Tracker results carousel: show 2 videos at a time
  const swiper_tracker = initSwiper('#tracker-results-carousel', {
    autoplay: false,
    spaceBetween: 16,
    breakpoints: {
      0: { slidesPerView: 1, spaceBetween: 10 },
      769: { slidesPerView: 2, spaceBetween: 16 },
    },
  });

  // Geometry comparison: manual navigation
  const swiper_geometry = initSwiper('#geometry-comparison-carousel', {
    autoplay: false,
  });

  // Tracker geometry comparison carousel
  const swiper_tracker_geom = initSwiper('#tracker-geom-comparison-carousel', {
    autoplay: false,
  });


});