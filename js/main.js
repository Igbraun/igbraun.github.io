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
    stage,
    loader,
    counterEl,
    controlsEl,
    sources = [],
    index = 0,
    mode = "image",
    bound = false,
    imageLoadId = 0,
    drag = { active: false, x: 0, y: 0, pointerId: null };

  var SWIPE_MIN = 48;

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
    if (stage) {
      stage.style.cursor = mode === "image" && sources.length > 1 ? "grab" : "default";
    }
  }

  function setControlsVisible(visible) {
    if (controlsEl) controlsEl.hidden = !visible;
  }

  function setImageLoading(loading) {
    if (loader) {
      loader.hidden = !loading;
      loader.setAttribute("aria-hidden", loading ? "false" : "true");
    }
    if (stage) stage.classList.toggle("is-loading", loading);
  }

  function clearVideo() {
    if (!video) return;
    video.hidden = true;
    video.removeAttribute("src");
  }

  function updateCounter() {
    if (counterEl) counterEl.textContent = index + 1 + " / " + sources.length;
  }

  function showVideo() {
    if (!video) return;
    setImageLoading(false);
    if (img) img.hidden = true;
    video.hidden = false;
    video.src = sources[index];
    updateCounter();
  }

  function showImage() {
    if (!img) return;
    clearVideo();
    img.hidden = false;
    if (video) video.hidden = true;

    var src = sources[index];
    updateCounter();

    if (img.src === src) {
      setImageLoading(false);
      return;
    }

    var loadId = ++imageLoadId;
    setImageLoading(true);

    var pre = new Image();
    pre.onload = function () {
      if (loadId !== imageLoadId) return;
      img.src = src;
      img.alt = "Фото " + (index + 1) + " из " + sources.length;
      setImageLoading(false);
    };
    pre.onerror = function () {
      if (loadId !== imageLoadId) return;
      setImageLoading(false);
    };
    pre.src = src;
  }

  function openLightbox() {
    if (!lb) return;
    setControlsVisible(sources.length > 1);
    lb.hidden = false;
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function show() {
    if (!lb || !sources.length) return;
    if (mode === "video") {
      showVideo();
    } else {
      showImage();
    }
    openLightbox();
  }

  function close() {
    if (!lb) return;
    imageLoadId++;
    setImageLoading(false);
    lb.hidden = true;
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (img) {
      img.hidden = false;
      img.removeAttribute("src");
    }
    clearVideo();
    setMode("image");
    drag.active = false;
    if (stage) stage.classList.remove("is-dragging");
  }

  function step(delta) {
    if (sources.length <= 1 || mode !== "image") return;
    index = (index + delta + sources.length) % sources.length;
    showImage();
    openLightbox();
  }

  function onKey(e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (mode !== "image") return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  }

  function bindSwipe() {
    if (!stage || stage._swipeBound) return;
    stage._swipeBound = true;

    stage.addEventListener("pointerdown", function (e) {
      if (lb.hidden || mode !== "image" || sources.length < 2) return;
      if (e.button !== 0) return;
      if (e.target.closest(".lightbox__btn")) return;
      drag.active = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.pointerId = e.pointerId;
      stage.classList.add("is-dragging");
      if (stage.setPointerCapture) {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    });

    stage.addEventListener("pointerup", function (e) {
      if (!drag.active) return;
      drag.active = false;
      stage.classList.remove("is-dragging");
      if (stage.releasePointerCapture) {
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.15) {
        step(dx < 0 ? 1 : -1);
      }
    });

    stage.addEventListener("pointercancel", function () {
      drag.active = false;
      stage.classList.remove("is-dragging");
    });
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
    stage = lb.querySelector("[data-lightbox-stage]");
    img = lb.querySelector(".lightbox__img");
    video = lb.querySelector(".lightbox__video");
    loader = lb.querySelector("[data-lightbox-loader]");
    counterEl = lb.querySelector(".lightbox__counter");
    controlsEl = lb.querySelector(".lightbox__controls");
    bindSwipe();
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

  function keepScrollPosition(fn) {
    var sx = window.scrollX;
    var sy = window.scrollY;
    fn();
    requestAnimationFrame(function () {
      window.scrollTo(sx, sy);
    });
  }

  function playWithoutScroll(audio) {
    var sx = window.scrollX;
    var sy = window.scrollY;
    function restore() {
      window.scrollTo(sx, sy);
    }
    var p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(restore).catch(restore);
    } else {
      restore();
    }
  }

  function playerOrder(root) {
    var card = root.closest("[data-order]");
    return card ? String(card.getAttribute("data-order") || "") : "";
  }

  function hasPendingRestore(order) {
    var pending = window._pendingAudioRestore;
    if (!pending || !order) return false;
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].order === order) return true;
    }
    return false;
  }

  window.captureAudioPlayback = function () {
    var states = [];
    var players = document.querySelectorAll("[data-audio-player]");
    for (var i = 0; i < players.length; i++) {
      var root = players[i];
      var audio = root.querySelector("audio");
      if (!audio) continue;
      var order = playerOrder(root);
      var src = audio.currentSrc || audio.src;
      var trackIndex = -1;
      var trackBtns = root.querySelectorAll(".post-audio__track");
      for (var t = 0; t < trackBtns.length; t++) {
        if (trackBtns[t].classList.contains("is-active")) trackIndex = t;
      }
      var playing = !audio.paused && !audio.ended;
      if (!playing && !src && trackIndex < 0) continue;
      states.push({
        order: order,
        src: src,
        time: audio.currentTime,
        playing: playing,
        trackIndex: trackIndex,
      });
    }
    return states;
  };

  window.restoreAudioPlayback = function (states) {
    if (!states || !states.length) return;
    for (var s = 0; s < states.length; s++) {
      var st = states[s];
      var root = document.querySelector(
        '[data-order="' + st.order + '"] [data-audio-player]'
      );
      if (root && root._audioRestore) root._audioRestore(st);
    }
  };

  function trackSrcMatches(audio, src) {
    if (!src) return false;
    try {
      return new URL(audio.src, window.location.href).href === new URL(src, window.location.href).href;
    } catch (e) {
      return audio.src === src || audio.src.indexOf(src) !== -1;
    }
  }

  function bindPlayer(root) {
    if (root._audioPlayerBound) return;
    root._audioPlayerBound = true;

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
      if (!trackSrcMatches(audio, src)) {
        audio.src = src;
        audio.load();
      }
      if (autoplay) {
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        playWithoutScroll(audio);
        activeAudio = audio;
      }
    }

    function activateTrack(idx) {
      if (idx < 0 || idx >= tracks.length) return;
      if (idx === currentIndex) {
        setActiveTrack(idx);
        if (audio.paused) {
          if (activeAudio && activeAudio !== audio) activeAudio.pause();
          playWithoutScroll(audio);
          activeAudio = audio;
        } else {
          audio.pause();
        }
        return;
      }
      loadTrack(idx, true);
    }

    playBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (audio.paused) {
        if (!audio.src && tracks.length) {
          keepScrollPosition(function () {
            loadTrack(0, true);
          });
          playBtn.blur();
          return;
        }
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        playWithoutScroll(audio);
        activeAudio = audio;
      } else {
        audio.pause();
      }
      playBtn.blur();
    });

    for (var j = 0; j < tracks.length; j++) {
      (function (btn, idx) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          activateTrack(idx);
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

    root._audioRestore = function (st) {
      function applyTimeAndPlay() {
        if (st.time > 0 && isFinite(audio.duration)) {
          audio.currentTime = Math.min(st.time, audio.duration);
        }
        updateProgress();
        setDuration();
        if (st.playing) {
          if (activeAudio && activeAudio !== audio) activeAudio.pause();
          playWithoutScroll(audio);
          activeAudio = audio;
        } else {
          setPlaying(false);
        }
      }

      if (st.trackIndex >= 0 && tracks.length) {
        loadTrack(st.trackIndex, false);
      } else if (st.src) {
        setActiveTrack(-1);
        if (!trackSrcMatches(audio, st.src)) {
          audio.src = st.src;
          audio.load();
        }
      }

      if (audio.readyState >= 1) applyTimeAndPlay();
      else audio.addEventListener("loadedmetadata", applyTimeAndPlay, { once: true });
    };

    setPlaying(false);
    if (totalEl) totalEl.textContent = formatTime(0);
    if (currentEl) currentEl.textContent = formatTime(0);
    if (tracks.length && !hasPendingRestore(playerOrder(root))) {
      loadTrack(0, false);
    }
  }

  window.initAudioPlayers = function () {
    var pending = window._pendingAudioRestore;
    window._pendingAudioRestore = null;
    var players = document.querySelectorAll("[data-audio-player]");
    for (var i = 0; i < players.length; i++) {
      bindPlayer(players[i]);
    }
    if (pending && pending.length) window.restoreAudioPlayback(pending);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initAudioPlayers);
  } else {
    window.initAudioPlayers();
  }
})();
