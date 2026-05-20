(function () {
  var MAX_SHIFT_RATIO = 0.035;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function updateParallax() {
    if (prefersReducedMotion()) {
      document.documentElement.style.removeProperty("--bg-parallax-y");
      return;
    }

    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;

    var maxShift = window.innerHeight * MAX_SHIFT_RATIO;
    var y = Math.round(progress * maxShift);
    document.documentElement.style.setProperty("--bg-parallax-y", y + "px");
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        updateParallax();
        ticking = false;
      });
    }
  }

  function onContentReady() {
    updateParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onContentReady);
  } else {
    onContentReady();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateParallax, { passive: true });

  /* После подгрузки постов из content.json высота страницы меняется */
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      updateParallax();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
