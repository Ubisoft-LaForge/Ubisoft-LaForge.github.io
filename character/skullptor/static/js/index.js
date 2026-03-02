window.HELP_IMPROVE_VIDEOJS = false;
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

    // Play videos in active slide
    const active = swiperEl.querySelector('.swiper-slide-active');
    if (!active) return;

    active.querySelectorAll('video').forEach((v) => {
      v.muted = true;
      v.playsInline = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
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

  // Teaser: autoplay ok
  const swiper_teaser = initSwiper('#teaser-carousel', {
    autoplay: { delay: 1000, disableOnInteraction: false, pauseOnMouseEnter: true },
	loop: true,
  });

  // 4D comparison: manual
  const swiper_4d = initSwiper('#four-d-comparison-carousel', {
    autoplay: { delay: 1000, disableOnInteraction: false, pauseOnMouseEnter: true },
  });

  // View-count comparison: manual
  const swiper_views = initSwiper('#number-of-views-comparison-carousel', {
    autoplay: false,
  });

  wireAutoplayToVideoMetadata(swiper_teaser, { fallbackMs: 1000, extraMs: 0 });
  wireAutoplayToVideoMetadata(swiper_4d, { fallbackMs: 1000, extraMs: 0 });
//   wireAutoplayToVideoMetadata(swiper_views, { fallbackMs: 1000, extraMs: 200 });

});