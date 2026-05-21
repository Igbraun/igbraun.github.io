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
  var lb,
    img,
    video,
    counterEl,
    controlsEl,
    sources = [],
    index = 0,
    mode = "image",
    bound = false;

  function collectFromGrid(grid, selector, attr) {
    var cells = grid.querySelectorAll(selector);
    var list = [];
    for (var i = 0; i < cells.length; i++) {
      list.push(cells[i].getAttribute(attr));
    }
    return list;
  }

  function setMode(nextMode) {
    mode = nextMode === "video" ? "video" : "image";
    if (lb) lb.setAttribute("data-mode", mode);
  }

  function setControlsVisible(visible) {
    if (controlsEl) controlsEl.hidden = !visible;
  }

  function clearVideo() {
    if (!video) return;
    video.hidden = true;
    video.removeAttribute("src");
  }

  function show() {
    if (!lb || !sources.length) return;
    if (mode === "video") {
      if (!video) return;
      if (img) img.hidden = true;
      video.hidden = false;
      video.src = sources[index];
      if (counterEl) counterEl.textContent = index + 1 + " / " + sources.length;
    } else {
      if (!img) return;
      clearVideo();
      img.hidden = false;
      img.src = sources[index];
      img.alt = "Фото " + (index + 1) + " из " + sources.length;
      if (counterEl) counterEl.textContent = index + 1 + " / " + sources.length;
    }
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
    if (img) {
      img.hidden = false;
      img.removeAttribute("src");
    }
    clearVideo();
    setMode("image");
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
    var videoOpener = e.target.closest(".video-open");
    if (videoOpener) {
      var videosBlock = videoOpener.closest(".post-videos");
      var videoGrid = videosBlock ? videosBlock.querySelector(".video-grid") : null;
      if (!videoGrid) return;
      sources = collectFromGrid(videoGrid, ".video-open", "data-src");
      index = parseInt(videoOpener.getAttribute("data-index"), 10) || 0;
      setMode("video");
      show();
      return;
    }

    var opener = e.target.closest(".gallery-open");
    if (opener) {
      if (opener.classList.contains("gallery-open--solo")) {
        var soloSrc = opener.getAttribute("data-src");
        if (!soloSrc) return;
        sources = [soloSrc];
        index = 0;
        setMode("image");
        show();
        return;
      }
      var block = opener.closest(".post-gallery");
      var grid = block ? block.querySelector(".gallery-grid") : null;
      if (!grid) return;
      sources = collectFromGrid(grid, ".gallery-cell", "data-src");
      index = parseInt(opener.getAttribute("data-index"), 10) || 0;
      setMode("image");
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
    video = lb.querySelector(".lightbox__video");
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

(function () {
  var activeAudio = null;

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = Math.floor(sec % 60);
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return h + ":" + pad(m) + ":" + pad(s);
  }

  function bindPlayer(root) {
    var audio = root.querySelector("audio");
    var playBtn = root.querySelector("[data-audio-play]");
    var seek = root.querySelector("[data-audio-seek]");
    var currentEl = root.querySelector("[data-audio-current]");
    var totalEl = root.querySelector("[data-audio-total]");
    var nowEl = root.querySelector("[data-audio-now]");
    var trackBtns = root.querySelectorAll(".post-audio__track");
    if (!audio || !playBtn || !seek) return;

    var tracks = [];
    for (var t = 0; t < trackBtns.length; t++) {
      tracks.push(trackBtns[t]);
    }

    var currentIndex = -1;

    function setPlaying(playing) {
      playBtn.classList.toggle("is-playing", playing);
      playBtn.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
      playBtn.textContent = playing ? "❚❚" : "▶";
    }

    function setActiveTrack(idx) {
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].classList.toggle("is-active", i === idx);
      }
      currentIndex = idx;
      if (idx >= 0 && tracks[idx] && nowEl) {
        nowEl.textContent = tracks[idx].textContent;
      }
    }

    function updateProgress() {
      var dur = audio.duration;
      if (!isFinite(dur) || dur <= 0) return;
      if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
      if (!seek.matches(":active")) {
        seek.value = String(Math.round((audio.currentTime / dur) * 1000));
      }
    }

    function setDuration() {
      var dur = audio.duration;
      if (!isFinite(dur)) return;
      if (totalEl) totalEl.textContent = formatTime(dur);
      seek.max = "1000";
    }

    function loadTrack(idx, autoplay) {
      if (idx < 0 || idx >= tracks.length) return;
      var btn = tracks[idx];
      var src = btn.getAttribute("data-audio-src");
      if (!src) return;
      setActiveTrack(idx);
      audio.src = src;
      audio.load();
      if (autoplay) {
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        audio.play();
        activeAudio = audio;
      }
    }

    playBtn.addEventListener("click", function () {
      if (audio.paused) {
        if (!audio.src && tracks.length) {
          loadTrack(0, true);
          return;
        }
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        audio.play();
        activeAudio = audio;
      } else {
        audio.pause();
      }
    });

    for (var j = 0; j < tracks.length; j++) {
      (function (btn, idx) {
        btn.addEventListener("click", function () {
          if (idx === currentIndex && !audio.paused) {
            audio.pause();
            return;
          }
          loadTrack(idx, true);
        });
      })(tracks[j], j);
    }

    audio.addEventListener("play", function () {
      setPlaying(true);
      activeAudio = audio;
    });
    audio.addEventListener("pause", function () {
      setPlaying(false);
    });
    audio.addEventListener("ended", function () {
      setPlaying(false);
      if (tracks.length && currentIndex >= 0 && currentIndex < tracks.length - 1) {
        loadTrack(currentIndex + 1, true);
        return;
      }
      seek.value = "0";
      if (currentEl) currentEl.textContent = formatTime(0);
    });
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", setDuration);
    audio.addEventListener("durationchange", setDuration);

    seek.addEventListener("input", function () {
      var dur = audio.duration;
      if (!isFinite(dur) || dur <= 0) return;
      var time = (parseInt(seek.value, 10) / 1000) * dur;
      audio.currentTime = time;
      if (currentEl) currentEl.textContent = formatTime(time);
    });

    setPlaying(false);
    if (totalEl) totalEl.textContent = formatTime(0);
    if (currentEl) currentEl.textContent = formatTime(0);
    if (tracks.length) {
      loadTrack(0, false);
    }
  }

  window.initAudioPlayers = function () {
    var players = document.querySelectorAll("[data-audio-player]");
    for (var i = 0; i < players.length; i++) {
      bindPlayer(players[i]);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initAudioPlayers);
  } else {
    window.initAudioPlayers();
  }
})();
