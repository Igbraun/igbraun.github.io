(function () {
  var PARALLAX = 0.035;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function updateParallax() {
    if (prefersReducedMotion()) {
      document.documentElement.style.removeProperty("--bg-parallax-y");
      return;
    }
    var y = Math.round(window.scrollY * PARALLAX);
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

  updateParallax();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateParallax, { passive: true });
})();
