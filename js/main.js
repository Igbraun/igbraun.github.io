(function () {
  var MAX_SHIFT_RATIO = 0.15;

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
    document.documentElement.style.setProperty("--bg-parallax-y", -y + "px");
    document.documentElement.style.setProperty("--bg-layer-top", -maxShift + "px");
    document.documentElement.style.setProperty(
      "--bg-layer-height",
      window.innerHeight + maxShift * 2 + "px"
    );
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

  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      updateParallax();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();

(function () {
  var lb, img, counterEl, controlsEl, sources = [],
    index = 0,
    bound = false;

  function collectFromGrid(grid) {
    var cells = grid.querySelectorAll(".gallery-cell");
    var list = [];
    for (var i = 0; i < cells.length; i++) {
      list.push(cells[i].getAttribute("data-src"));
    }
    return list;
  }

  function setControlsVisible(visible) {
    if (controlsEl) controlsEl.hidden = !visible;
  }

  function show() {
    if (!lb || !img || !sources.length) return;
    img.src = sources[index];
    img.alt = "Фото " + (index + 1) + " из " + sources.length;
    if (counterEl) counterEl.textContent = index + 1 + " / " + sources.length;
    setControlsVisible(sources.length > 1);
    lb.hidden = false;
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!lb) return;
    lb.hidden = true;
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    img.removeAttribute("src");
  }

  function step(delta) {
    if (sources.length <= 1) return;
    index = (index + delta + sources.length) % sources.length;
    show();
  }

  function onKey(e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  }

  function onClick(e) {
    var opener = e.target.closest(".gallery-open");
    if (opener) {
      if (opener.classList.contains("gallery-open--solo")) {
        var soloSrc = opener.getAttribute("data-src");
        if (!soloSrc) return;
        sources = [soloSrc];
        index = 0;
        show();
        return;
      }
      var block = opener.closest(".post-gallery");
      var grid = block ? block.querySelector(".gallery-grid") : null;
      if (!grid) return;
      sources = collectFromGrid(grid);
      index = parseInt(opener.getAttribute("data-index"), 10) || 0;
      show();
      return;
    }

    if (e.target.closest("[data-lightbox-close]")) {
      close();
      return;
    }
    if (e.target.closest("[data-lightbox-prev]")) {
      step(-1);
      return;
    }
    if (e.target.closest("[data-lightbox-next]")) {
      step(1);
      return;
    }
    if (e.target === lb) close();
  }

  window.initLightbox = function () {
    lb = document.getElementById("lightbox");
    if (!lb) return;
    img = lb.querySelector(".lightbox__img");
    counterEl = lb.querySelector(".lightbox__counter");
    controlsEl = lb.querySelector(".lightbox__controls");
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      bound = true;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initLightbox);
  } else {
    window.initLightbox();
  }
})();
