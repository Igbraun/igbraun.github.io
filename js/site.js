(function () {
  var FALLBACK = {
    meta: { title: "Igor Braun", description: "Портфолио." },
    brand: {
      name: "Igor Braun",
      email: "vibroliven@gmail.com",
      instagram: "https://www.instagram.com/igbraun/",
      youtube: "https://www.youtube.com/@Igorbraun",
    },
    posts: [],
  };

  function esc(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function safeUrl(url) {
    var u = (url || "").trim();
    if (!u) return "";
    if (/^(javascript|data):/i.test(u)) return "";
    if (/^https?:\/\//i.test(u) || u.indexOf("://") === -1) {
      return u;
    }
    return "";
  }

  /** URL в HTML-атрибутах (иначе & в query Vimeo ломает src) */
  function attrUrl(url) {
    var u = safeUrl(url);
    if (!u) return "";
    return u
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** Сброс кэша после замены файла по тому же пути (cover.jpg и т.д.) */
  function mediaBust(url, post) {
    if (!url) return url;
    var stamp = post && (post.mediaStamp || post.date);
    if (!stamp) return url;
    var sep = url.indexOf("?") >= 0 ? "&" : "?";
    return url + sep + "v=" + encodeURIComponent(String(stamp));
  }

  function getPosts(data) {
    if (data.posts && data.posts.length) return data.posts;
    if (data.feeds && data.feeds.home && data.feeds.home.posts) return data.feeds.home.posts;
    return [];
  }

  /** Новые посты первыми (по полю date, формат YYYY-MM-DD) */
  function sortPostsNewestFirst(posts) {
    return posts.slice().sort(function (a, b) {
      var da = (a.date || "").trim();
      var db = (b.date || "").trim();
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });
  }

  function useMasonryLayout() {
    return window.matchMedia("(min-aspect-ratio: 1/1) and (min-width: 720px)").matches;
  }

  /** Колонка, где низ стопки выше = меньшая высота col */
  function pickMasonryColumn(cols, index) {
    if (index === 0) return cols[0];
    if (index === 1) return cols[1];
    return cols[0].offsetHeight <= cols[1].offsetHeight ? cols[0] : cols[1];
  }

  function distributeCardsToColumns(cols, cards) {
    for (var i = 0; i < cards.length; i++) {
      pickMasonryColumn(cols, i).appendChild(cards[i]);
    }
  }

  /** Встроенные iframe (обложка или ячейки без постера) — masonry не двигает карточки */
  function feedHasBareCoverVideo(feedEl) {
    return !!(
      feedEl &&
      (feedEl.querySelector(".post-cover--bare") ||
        feedEl.querySelector(".gallery-cell--inline-video"))
    );
  }

  function wireBareCoverIframes(root) {
    var nodes = (root || document).querySelectorAll(
      ".post-cover--bare .post-cover__iframe[data-embed], .gallery-cell--inline-video iframe[data-embed]"
    );
    for (var i = 0; i < nodes.length; i++) {
      var iframe = nodes[i];
      var embed = iframe.getAttribute("data-embed");
      if (!embed) continue;
      if (!iframe.src || iframe.src === "about:blank" || iframe.dataset.wired !== "1") {
        iframe.src = embed;
      }
      iframe.dataset.wired = "1";
    }
  }

  function scheduleWireVideoIframes(root) {
    wireBareCoverIframes(root);
    requestAnimationFrame(function () {
      wireBareCoverIframes(root);
    });
  }

  function relayoutMasonry(feedEl) {
    if (feedHasBareCoverVideo(feedEl)) return;
    var cols = feedEl.querySelectorAll(".feed-col");
    if (cols.length !== 2) return;

    var cards = Array.prototype.slice.call(feedEl.querySelectorAll(".post-card"));
    cards.sort(function (a, b) {
      return (+a.getAttribute("data-order") || 0) - (+b.getAttribute("data-order") || 0);
    });

    for (var i = 0; i < cards.length; i++) {
      cards[i].remove();
    }
    distributeCardsToColumns(cols, cards);
  }

  var masonryRelayoutTimer;
  function queueMasonryRelayout() {
    var feedEl = document.getElementById("feed");
    if (!feedEl || !feedEl.classList.contains("feed--masonry")) return;
    clearTimeout(masonryRelayoutTimer);
    masonryRelayoutTimer = setTimeout(function () {
      relayoutMasonry(feedEl);
    }, 150);
  }

  function bindMasonryRelayout(feedEl) {
    if (!feedEl || feedEl._masonryBound) return;
    feedEl._masonryBound = true;

    feedEl.addEventListener(
      "load",
      function (e) {
        if (e.target.tagName === "IMG") queueMasonryRelayout();
      },
      true
    );
  }

  function mountMasonryColumns(cols, sorted, scratch) {
    for (var i = 0; i < sorted.length; i++) {
      scratch.innerHTML = renderPost(sorted[i], i + 1);
      var card = scratch.firstElementChild;
      if (!card) continue;
      pickMasonryColumn(cols, i).appendChild(card);
    }
  }

  function getExistingPostCards(feedEl) {
    var nodes = feedEl.querySelectorAll(".post-card");
    if (!nodes.length) return null;
    return Array.prototype.slice.call(nodes);
  }

  function sortPostCards(cards) {
    cards.sort(function (a, b) {
      return (+a.getAttribute("data-order") || 0) - (+b.getAttribute("data-order") || 0);
    });
    return cards;
  }

  /** Переставляет карточки без пересоздания DOM — плеер не прерывается. */
  function relayoutExistingFeed(feedEl, cards) {
    sortPostCards(cards);
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].parentNode) cards[i].parentNode.removeChild(cards[i]);
    }

    if (!useMasonryLayout()) {
      feedEl.className = "feed";
      feedEl.replaceChildren();
      for (var j = 0; j < cards.length; j++) {
        feedEl.appendChild(cards[j]);
      }
      scheduleWireVideoIframes(feedEl);
      return;
    }

    if (
      feedHasBareCoverVideo(feedEl) &&
      feedEl.classList.contains("feed--masonry") &&
      feedEl.querySelectorAll(".feed-col").length === 2
    ) {
      scheduleWireVideoIframes(feedEl);
      return;
    }

    feedEl.className = "feed feed--masonry";
    feedEl.replaceChildren();
    var col0 = document.createElement("div");
    col0.className = "feed-col";
    var col1 = document.createElement("div");
    col1.className = "feed-col";
    feedEl.appendChild(col0);
    feedEl.appendChild(col1);
    var cols = feedEl.querySelectorAll(".feed-col");
    for (var k = 0; k < cards.length; k++) {
      pickMasonryColumn(cols, k).appendChild(cards[k]);
    }
    scheduleWireVideoIframes(feedEl);
    if (!feedHasBareCoverVideo(feedEl)) {
      queueMasonryRelayout();
    }
  }

  function stashAudioBeforeRemount() {
    if (window.captureAudioPlayback) {
      window._pendingAudioRestore = window.captureAudioPlayback();
    }
  }

  var feedLayoutMq = window.matchMedia("(min-aspect-ratio: 1/1) and (min-width: 720px)");
  var feedLayoutMode = null;

  function getFeedLayoutMode() {
    return useMasonryLayout() ? "masonry" : "single";
  }

  /** Только смена 1↔2 колонок. resize при скролле на телефоне ломал плеер. */
  function bindFeedLayoutChange() {
    if (window._feedLayoutBound) return;
    window._feedLayoutBound = true;
    feedLayoutMode = getFeedLayoutMode();
    feedLayoutMq.addEventListener("change", function () {
      var el = document.getElementById("feed");
      if (!el || !el._sortedPosts) return;
      var mode = getFeedLayoutMode();
      if (mode === feedLayoutMode) return;
      feedLayoutMode = mode;
      mountFeed(el, el._sortedPosts);
    });
  }

  function mountFeed(feedEl, posts) {
    var sorted = sortPostsNewestFirst(posts);
    feedEl._sortedPosts = sorted;
    bindFeedLayoutChange();

    if (!sorted.length) {
      feedEl.className = "feed";
      feedEl.innerHTML =
        '<p class="feed-empty">Пока нет постов. Добавьте их в <code>data/content.json</code>.</p>';
      return;
    }

    var existing = getExistingPostCards(feedEl);
    if (existing && existing.length === sorted.length) {
      relayoutExistingFeed(feedEl, existing);
      return;
    }

    stashAudioBeforeRemount();

    if (!useMasonryLayout()) {
      feedEl.className = "feed";
      feedEl.innerHTML = sorted
        .map(function (post, i) {
          return renderPost(post, i + 1);
        })
        .join("");
      wireBareCoverIframes(feedEl);
      return;
    }

    feedEl.className = "feed feed--masonry";
    feedEl.innerHTML = '<div class="feed-col"></div><div class="feed-col"></div>';
    var cols = feedEl.querySelectorAll(".feed-col");
    mountMasonryColumns(cols, sorted, document.createElement("div"));
    bindMasonryRelayout(feedEl);
    scheduleWireVideoIframes(feedEl);
    if (!feedHasBareCoverVideo(feedEl)) {
      queueMasonryRelayout();
    }
  }

  function isAnimatedMediaPath(path) {
    return /\.gif$/i.test(String(path || ""));
  }

  function resolveGalleryItem(item, post) {
    var useOriginal = post && post.galleryAnimated;
    if (typeof item === "string") {
      var full = item.trim();
      var thumb = useOriginal || isAnimatedMediaPath(full)
        ? full
        : full.replace(/^(images\/galleries\/[^/]+)\//, "$1/thumbs/");
      return { kind: "image", full: full, thumb: thumb };
    }
    if (item && item.type === "video") {
      var vid = {
        provider: String(item.provider || "youtube").toLowerCase(),
        id: String(item.id || "").trim(),
      };
      if (!vid.id) return null;
      var aw = parseInt(item.aspectW, 10);
      var ah = parseInt(item.aspectH, 10);
      if (!(aw > 0 && ah > 0) && post && post.coverVideo && String(post.coverVideo.id) === vid.id) {
        aw = parseInt(post.coverVideo.aspectW, 10);
        ah = parseInt(post.coverVideo.aspectH, 10);
      }
      var portrait = aw > 0 && ah > 0 && ah > aw;
      return {
        kind: "video",
        full: videoEmbedSrc(vid, { responsive: portrait || vid.provider === "vimeo" }),
        thumb: item.thumb || "",
        video: vid,
        aspectW: aw > 0 ? aw : null,
        aspectH: ah > 0 ? ah : null,
      };
    }
    if (item && item.full) {
      var isGifItem = isAnimatedMediaPath(item.full);
      var thumbPath = item.thumb;
      if (!thumbPath) {
        thumbPath =
          useOriginal || isGifItem
            ? item.full
            : item.full.replace(/^(images\/galleries\/[^/]+)\//, "$1/thumbs/");
      }
      var out = { kind: isGifItem ? "gif" : "image", full: item.full, thumb: thumbPath };
      if (item.thumbPosition) out.thumbPosition = String(item.thumbPosition).trim();
      return out;
    }
    return null;
  }

  function galleryColumnCount(post) {
    var n = parseInt(post.galleryColumns, 10);
    if (n >= 2 && n <= 5) return n;
    return 4;
  }

  function normalizeGallery(post) {
    var raw = post.gallery || [];
    var items = [];
    for (var i = 0; i < raw.length; i++) {
      var it = resolveGalleryItem(raw[i], post);
      if (!it) continue;
      if (it.kind === "video") {
        if (safeUrl(it.full)) items.push(it);
      } else if (safeUrl(it.full)) {
        items.push(it);
      }
    }
    return items;
  }

  function findCoverIndex(items, coverFull) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].full === coverFull) return i;
    }
    return 0;
  }

  function videoEmbedSrc(item, opts) {
    if (!item) return "";
    var id = "";
    var provider = "youtube";
    if (typeof item === "string") {
      id = item.trim();
    } else {
      id = String(item.id || "").trim();
      provider = String(item.provider || "youtube").toLowerCase();
    }
    if (!id) return "";
    if (provider === "vimeo") {
      var v = "https://player.vimeo.com/video/" + id + "?badge=0&autopause=0";
      if (opts && opts.responsive) v += "&responsive=1";
      return v;
    }
    return "https://www.youtube.com/embed/" + id;
  }

  function coverVideoAspectPair(coverVideo) {
    var aw = parseInt(coverVideo && coverVideo.aspectW, 10);
    var ah = parseInt(coverVideo && coverVideo.aspectH, 10);
    if (aw > 0 && ah > 0) return { w: aw, h: ah };
    return { w: 16, h: 9 };
  }

  function coverVideoFrameStyle(coverVideo) {
    var p = coverVideoAspectPair(coverVideo);
    return "aspect-ratio:" + p.w + " / " + p.h + ";";
  }

  function coverVideoIsPortrait(coverVideo) {
    var p = coverVideoAspectPair(coverVideo);
    return p.h > p.w;
  }

  function renderVideoIframe(item, title, inGrid, gridIndex) {
    var src = safeUrl(videoEmbedSrc(item));
    if (!src) return "";
    var iframe =
      '<iframe src="' +
      attrUrl(src) +
      '" title="' +
      esc(title || "Видео") +
      '" loading="lazy" tabindex="-1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    if (inGrid) {
      return (
        '<button type="button" class="video-cell video-open" data-index="' +
        gridIndex +
        '" data-src="' +
        attrUrl(src) +
        '" aria-label="Открыть видео ' +
        (gridIndex + 1) +
        '">' +
        iframe +
        "</button>"
      );
    }
    return '<div class="video-cell video-cell--inline">' + iframe + "</div>";
  }

  function renderPostDate(post, orderNum) {
    var displayOrder =
      post.order != null && post.order !== "" ? String(post.order) : orderNum ? String(orderNum) : "";
    var suffix = displayOrder ? " (" + displayOrder + ")" : "";
    if (post.date) {
      return (
        '<time class="post-date" datetime="' + esc(post.date) + '">' + esc(post.date) + suffix + "</time>"
      );
    }
    if (orderNum) {
      return '<span class="post-date">(' + orderNum + ")</span>";
    }
    return "";
  }

  function renderVideoPost(post, orderNum) {
    var link = safeUrl(post.link);
    var html =
      '<article class="post-card post-card--video" data-order="' + (orderNum || "") + '">';

    html += '<div class="post-body">';
    html += renderPostDate(post, orderNum);
    html += '<h2 class="post-title">' + esc(post.title || "Без названия") + "</h2>";
    if (post.text) {
      html += PostTextFormat.render(post.text, esc);
    }
    if (link) {
      html += '<p class="post-link"><a href="' + link + '" target="_blank" rel="noopener">Открыть на Vimeo</a></p>';
    }
    html += "</div>";

    html += '<div class="post-videos">';
    if (post.mainVideo) {
      html += '<div class="post-video-main">' + renderVideoIframe(post.mainVideo, post.title, false) + "</div>";
    }
    var grid = post.videoGrid || [];
    if (grid.length) {
      html += '<div class="video-grid">';
      for (var i = 0; i < grid.length; i++) {
        html += renderVideoIframe(grid[i], post.title + " — " + (i + 1), true, i);
      }
      html += "</div>";
    }
    html += "</div></article>";
    return html;
  }

  function galleryVideoAspectAttrs(it) {
    if (!it || it.kind !== "video" || !it.aspectW || !it.aspectH) return "";
    return (
      ' data-aspect-w="' +
      it.aspectW +
      '" data-aspect-h="' +
      it.aspectH +
      '"'
    );
  }

  function galleryGridAspectStyle(post) {
    var w = parseInt(post && post.galleryCellAspectW, 10);
    var h = parseInt(post && post.galleryCellAspectH, 10);
    if (!(w > 0 && h > 0)) return "";
    return ' style="--gallery-cell-ar:' + w + " / " + h + ';"';
  }

  function renderGallery(items, columns, animated, post) {
    if (!items || !items.length) return "";
    var cols = columns;
    if (cols < 2 || cols > 5) cols = 4;
    var html =
      '<div class="gallery-grid gallery-grid--' +
      cols +
      (animated ? " gallery-grid--animated" : "") +
      '"' +
      galleryGridAspectStyle(post) +
      ">";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var full = safeUrl(it.full);
      if (!full) continue;
      if (it.kind === "video") {
        var poster = mediaBust(safeUrl(it.thumb), post);
        full = mediaBust(full, post);
        if (!full) continue;
        var aspectAttrs = galleryVideoAspectAttrs(it);
        if (!poster) {
          var inlineStyle = "";
          if (it.aspectW > 0 && it.aspectH > 0) {
            inlineStyle = ' style="aspect-ratio:' + it.aspectW + " / " + it.aspectH + ';"';
          }
          var embedAttr = attrUrl(full);
          html +=
            '<div class="gallery-cell gallery-cell--video gallery-cell--inline-video"' +
            inlineStyle +
            ">" +
            '<iframe src="' +
            embedAttr +
            '" data-embed="' +
            embedAttr +
            '" title="' +
            esc(post.title || "Видео") +
            " — " +
            (i + 1) +
            '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
            "</div>";
          continue;
        }
        html +=
          '<button type="button" class="gallery-cell gallery-cell--video video-open" data-index="' +
          i +
          '" data-src="' +
          attrUrl(full) +
          '"' +
          aspectAttrs +
          ' aria-label="Открыть видео ' +
          (i + 1) +
          " из " +
          items.length +
          '">' +
          '<img src="' +
          poster +
          '" alt="" loading="lazy" decoding="async" />' +
          '<span class="gallery-cell__play" aria-hidden="true"></span></button>';
        continue;
      }
      var thumb = mediaBust(safeUrl(it.thumb), post);
      if (!thumb) thumb = mediaBust(full, post);
      else full = mediaBust(full, post);
      html +=
        '<button type="button" class="gallery-cell gallery-open" data-index="' +
        i +
        '" data-src="' +
        full +
        '" aria-label="Открыть фото ' +
        (i + 1) +
        " из " +
        items.length +
        '">';
      var pos = it.thumbPosition || "center";
      html +=
        '<img src="' +
        thumb +
        '" alt="" loading="lazy" decoding="async" style="object-position:' +
        esc(pos) +
        '" />';
      html += "</button>";
    }
    html += "</div>";
    return html;
  }

  function renderAudioBar() {
    return (
      '<div class="post-audio__bar">' +
      '<button type="button" class="post-audio__play" data-audio-play aria-label="Воспроизвести">▶</button>' +
      '<div class="post-audio__timeline">' +
      '<span class="post-audio__time post-audio__time--current" data-audio-current>0:00:00</span>' +
      '<input type="range" class="post-audio__seek" data-audio-seek min="0" max="1000" value="0" step="1" aria-label="Позиция воспроизведения" />' +
      '<span class="post-audio__time post-audio__time--total" data-audio-total>0:00:00</span>' +
      "</div></div>"
    );
  }

  function renderAudioPlayer(src, title) {
    if (!src) return "";
    return (
      '<div class="post-audio" data-audio-player>' +
      '<audio src="' +
      src +
      '" preload="metadata" title="' +
      esc(title || "Аудио") +
      '"></audio>' +
      renderAudioBar() +
      "</div>"
    );
  }

  function renderPlaylistPlayer(tracks) {
    if (!tracks || !tracks.length) return "";
    var html = '<div class="post-audio post-audio--playlist" data-audio-player>';
    html += '<p class="post-audio__now" data-audio-now></p>';
    html += '<audio preload="metadata"></audio>';
    html += renderAudioBar();
    html += '<ol class="post-audio__tracks">';
    for (var i = 0; i < tracks.length; i++) {
      var src = safeUrl(tracks[i].src);
      if (!src) continue;
      html +=
        '<li><button type="button" class="post-audio__track" data-audio-src="' +
        src +
        '" data-audio-index="' +
        i +
        '">' +
        esc(tracks[i].title || "Трек " + (i + 1)) +
        "</button></li>";
    }
    html += "</ol></div>";
    return html;
  }

  function galleryThumbFromFull(fullPath) {
    if (!fullPath || /\/thumbs\//i.test(fullPath)) return fullPath || "";
    var m = String(fullPath).match(/^(images\/galleries\/[^/]+)\/(.+)$/);
    if (!m) return fullPath;
    var base = m[2].replace(/\.[^.]+$/, "");
    return m[1] + "/thumbs/" + base + ".jpg";
  }

  function renderCover(coverFull, index, title, post) {
    if (!coverFull) return "";
    var fullSrc = mediaBust(coverFull, post);
    var thumbPath = galleryThumbFromFull(coverFull);
    var thumbSrc = thumbPath !== coverFull ? mediaBust(thumbPath, post) : fullSrc;
    return (
      '<div class="post-cover">' +
      '<button type="button" class="post-cover__btn gallery-open gallery-open--solo" data-src="' +
      fullSrc +
      '" data-index="' +
      index +
      '" aria-label="Открыть главное фото">' +
      '<img src="' +
      thumbSrc +
      '" alt="' +
      esc(title || "") +
      '" loading="eager" decoding="async" />' +
      "</button></div>"
    );
  }

  function renderCoverVideo(coverVideo, post) {
    if (!coverVideo || !coverVideo.id) return "";
    var embedItem = { provider: coverVideo.provider, id: coverVideo.id };
    var embed = safeUrl(
      videoEmbedSrc(embedItem, { responsive: coverVideoIsPortrait(coverVideo) })
    );
    if (!embed) return "";
    var title = esc(post.title || "Видео");
    var iframeAllow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    var frameStyle = coverVideoFrameStyle(coverVideo);
    var portraitClass = coverVideoIsPortrait(coverVideo) ? " post-cover__frame--portrait" : "";

    if (coverVideo.bare) {
      return (
        '<div class="post-cover post-cover--inline-video post-cover--bare">' +
        '<div class="post-cover__frame' +
        portraitClass +
        '" style="' +
        frameStyle +
        '">' +
        '<iframe class="post-cover__iframe" data-embed="' +
        attrUrl(embed) +
        '" title="' +
        title +
        '" allow="' +
        iframeAllow +
        '" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        "</div></div>"
      );
    }

    var poster = mediaBust(safeUrl(coverVideo.thumb || post.coverImage), post);
    if (!poster) return "";
    return (
      '<div class="post-cover post-cover--inline-video" data-cover-video>' +
      '<div class="post-cover__frame' +
      portraitClass +
      '" style="' +
      frameStyle +
      '">' +
      '<img class="post-cover__poster" src="' +
      poster +
      '" alt="" loading="eager" decoding="async" />' +
      '<button type="button" class="post-cover__play-btn" data-cover-video-play aria-label="Воспроизвести видео">' +
      '<span class="gallery-cell__play" aria-hidden="true"></span></button>' +
      '<iframe class="post-cover__iframe" data-embed="' +
      attrUrl(embed) +
      '" title="' +
      title +
      '" allow="' +
      iframeAllow +
      '" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" hidden></iframe>' +
      "</div></div>"
    );
  }

  function renderPost(post, orderNum) {
    if (post.videoGrid && post.videoGrid.length) {
      return renderVideoPost(post, orderNum);
    }

    var items = normalizeGallery(post);
    var gallery = items.length ? items : null;
    var cols = galleryColumnCount(post);
    var coverRaw = safeUrl(post.coverImage);
    var coverIndex = coverRaw && gallery ? findCoverIndex(items, coverRaw) : 0;
    var img = safeUrl(post.imageUrl);
    var embed = safeUrl(post.embedUrl);
    var link = safeUrl(post.link);
    var audioSrc = safeUrl(post.audio);
    var hasPlaylist = post.playlist && post.playlist.length;

    var html =
      '<article class="post-card' +
      (gallery ? " post-card--gallery" : "") +
      (post.galleryAnimated ? " post-card--animated" : "") +
      (audioSrc || hasPlaylist ? " post-card--audio" : "") +
      '" data-order="' +
      (orderNum || "") +
      '">';

    if (embed) {
      html += '<div class="post-media post-media--video">';
      html +=
        '<iframe src="' +
        embed +
        '" title="' +
        esc(post.title || "Видео") +
        '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      html += "</div>";
    } else if (img && !gallery) {
      var imgSrc = mediaBust(img, post);
      html += '<div class="post-media post-media--image">';
      if (link) {
        html +=
          '<a href="' +
          link +
          '" target="_blank" rel="noopener"><img src="' +
          imgSrc +
          '" alt="' +
          esc(post.title || "") +
          '" loading="lazy" /></a>';
      } else {
        html += '<img src="' + imgSrc + '" alt="' + esc(post.title || "") + '" loading="lazy" />';
      }
      html += "</div>";
    }

    html += '<div class="post-body">';
    html += renderPostDate(post, orderNum);
    html += '<h2 class="post-title">' + esc(post.title || "Без названия") + "</h2>";
    if (hasPlaylist) {
      html += renderPlaylistPlayer(post.playlist);
    } else if (audioSrc) {
      html += renderAudioPlayer(audioSrc, post.audioTitle || post.title);
    }
    if (post.text) {
      html += PostTextFormat.render(post.text, esc);
    }
    html += "</div>";

    if (gallery) {
      html += '<div class="post-gallery">';
      if (post.coverVideo && post.coverVideo.id) {
        html += renderCoverVideo(post.coverVideo, post);
      } else if (coverRaw) {
        html += renderCover(coverRaw, coverIndex, post.title, post);
      }
      html += renderGallery(items, cols, post.galleryAnimated, post);
      html += "</div>";
    }

    if (link && !embed && !gallery) {
      html += '<div class="post-body post-body--link"><p class="post-link"><a href="' + link + '" target="_blank" rel="noopener">Открыть</a></p></div>';
    }

    html += "</article>";
    return html;
  }

  function apply(data) {
    document.title = (data.meta && data.meta.title) || (data.brand && data.brand.name) || "Igor Braun";

    var md = document.querySelector('meta[name="description"]');
    if (md && data.meta && data.meta.description) {
      md.setAttribute("content", data.meta.description);
    }

    var logo = document.getElementById("site-logo");
    var headerEmail = document.getElementById("header-email");
    var headerInstagram = document.getElementById("header-instagram");
    var headerYoutube = document.getElementById("header-youtube");
    if (data.brand) {
      if (logo) logo.textContent = data.brand.name || "Igor Braun";
      if (headerEmail && data.brand.email) {
        var em = data.brand.email.trim();
        headerEmail.textContent = em;
        headerEmail.setAttribute("href", "mailto:" + em);
      }
      if (headerInstagram && data.brand.instagram) {
        headerInstagram.setAttribute("href", data.brand.instagram.trim());
      }
      if (headerYoutube && data.brand.youtube) {
        headerYoutube.setAttribute("href", data.brand.youtube.trim());
      }
    }

    var feedEl = document.getElementById("feed");
    if (feedEl) {
      mountFeed(feedEl, getPosts(data));
    }

    if (window.initLightbox) window.initLightbox();
    if (window.initAudioPlayers) window.initAudioPlayers();
  }

  function load() {
    return fetch("data/content.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        return JSON.parse(text.replace(/^\uFEFF/, ""));
      })
      .catch(function () {
        return FALLBACK;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      load().then(apply);
    });
  } else {
    load().then(apply);
  }
})();
