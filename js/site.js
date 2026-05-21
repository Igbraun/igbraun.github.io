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
      return u.replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }
    return "";
  }

  function getPosts(data) {
    if (data.posts && data.posts.length) return data.posts;
    if (data.feeds && data.feeds.home && data.feeds.home.posts) return data.feeds.home.posts;
    return [];
  }

  function resolveGalleryItem(item) {
    if (typeof item === "string") {
      var full = item.trim();
      var thumb = full.replace(/^(images\/galleries\/[^/]+)\//, "$1/thumbs/");
      return { full: full, thumb: thumb };
    }
    if (item && item.full) {
      var out = {
        full: item.full,
        thumb: item.thumb || item.full.replace(/^(images\/galleries\/[^/]+)\//, "$1/thumbs/"),
      };
      if (item.thumbPosition) out.thumbPosition = String(item.thumbPosition).trim();
      return out;
    }
    return null;
  }

  function normalizeGallery(post) {
    var raw = post.gallery || [];
    var items = [];
    for (var i = 0; i < raw.length; i++) {
      var it = resolveGalleryItem(raw[i]);
      if (it && safeUrl(it.full)) items.push(it);
    }
    return items;
  }

  function findCoverIndex(items, coverFull) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].full === coverFull) return i;
    }
    return 0;
  }

  function videoEmbedSrc(item) {
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
    if (provider === "vimeo") return "https://player.vimeo.com/video/" + id;
    return "https://www.youtube.com/embed/" + id;
  }

  function renderVideoIframe(item, title, inGrid, gridIndex) {
    var src = safeUrl(videoEmbedSrc(item));
    if (!src) return "";
    var iframe =
      '<iframe src="' +
      src +
      '" title="' +
      esc(title || "Видео") +
      '" loading="lazy" tabindex="-1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    if (inGrid) {
      return (
        '<button type="button" class="video-cell video-open" data-index="' +
        gridIndex +
        '" data-src="' +
        src +
        '" aria-label="Открыть видео ' +
        (gridIndex + 1) +
        '">' +
        iframe +
        "</button>"
      );
    }
    return '<div class="video-cell video-cell--inline">' + iframe + "</div>";
  }

  function renderVideoPost(post) {
    var link = safeUrl(post.link);
    var html = '<article class="post-card post-card--video">';

    html += '<div class="post-body">';
    if (post.date) {
      html += '<time class="post-date" datetime="' + esc(post.date) + '">' + esc(post.date) + "</time>";
    }
    html += '<h2 class="post-title">' + esc(post.title || "Без названия") + "</h2>";
    if (post.text) {
      html += '<div class="post-text"><p>' + esc(post.text) + "</p></div>";
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

  function renderGallery(items, columns) {
    if (!items || !items.length) return "";
    var cols = columns === 4 ? 4 : 5;
    var html = '<div class="gallery-grid gallery-grid--' + cols + '">';
    for (var i = 0; i < items.length; i++) {
      var full = safeUrl(items[i].full);
      var thumb = safeUrl(items[i].thumb);
      if (!full) continue;
      if (!thumb) thumb = full;
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
      var pos = items[i].thumbPosition || "center";
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

  function renderAudioPlayer(src, title) {
    if (!src) return "";
    return (
      '<div class="post-audio" data-audio-player>' +
      '<audio src="' +
      src +
      '" preload="metadata" title="' +
      esc(title || "Аудио") +
      '"></audio>' +
      '<div class="post-audio__bar">' +
      '<button type="button" class="post-audio__play" data-audio-play aria-label="Воспроизвести">▶</button>' +
      '<span class="post-audio__time post-audio__time--current" data-audio-current>0:00:00</span>' +
      '<input type="range" class="post-audio__seek" data-audio-seek min="0" max="1000" value="0" step="1" aria-label="Позиция воспроизведения" />' +
      '<span class="post-audio__time post-audio__time--total" data-audio-total>0:00:00</span>' +
      "</div></div>"
    );
  }

  function renderCover(coverFull, index, title) {
    if (!coverFull) return "";
    return (
      '<div class="post-cover">' +
      '<button type="button" class="post-cover__btn gallery-open gallery-open--solo" data-src="' +
      coverFull +
      '" data-index="' +
      index +
      '" aria-label="Открыть главное фото">' +
      '<img src="' +
      coverFull +
      '" alt="' +
      esc(title || "") +
      '" loading="eager" decoding="async" />' +
      "</button></div>"
    );
  }

  function renderPost(post) {
    if (post.videoGrid && post.videoGrid.length) {
      return renderVideoPost(post);
    }

    var items = normalizeGallery(post);
    var gallery = items.length ? items : null;
    var cols = post.galleryColumns === 4 ? 4 : 5;
    var coverRaw = safeUrl(post.coverImage);
    var coverIndex = coverRaw && gallery ? findCoverIndex(items, coverRaw) : 0;
    var img = safeUrl(post.imageUrl);
    var embed = safeUrl(post.embedUrl);
    var link = safeUrl(post.link);
    var audioSrc = safeUrl(post.audio);

    var html =
      '<article class="post-card' +
      (gallery ? " post-card--gallery" : "") +
      (audioSrc ? " post-card--audio" : "") +
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
      html += '<div class="post-media post-media--image">';
      if (link) {
        html +=
          '<a href="' +
          link +
          '" target="_blank" rel="noopener"><img src="' +
          img +
          '" alt="' +
          esc(post.title || "") +
          '" loading="lazy" /></a>';
      } else {
        html += '<img src="' + img + '" alt="' + esc(post.title || "") + '" loading="lazy" />';
      }
      html += "</div>";
    }

    html += '<div class="post-body">';
    if (post.date) {
      html += '<time class="post-date" datetime="' + esc(post.date) + '">' + esc(post.date) + "</time>";
    }
    html += '<h2 class="post-title">' + esc(post.title || "Без названия") + "</h2>";
    if (audioSrc) {
      html += renderAudioPlayer(audioSrc, post.audioTitle || post.title);
    }
    if (post.text) {
      html += '<div class="post-text"><p>' + esc(post.text) + "</p></div>";
    }
    html += "</div>";

    if (gallery) {
      html += '<div class="post-gallery">';
      if (coverRaw) {
        html += renderCover(coverRaw, coverIndex, post.title);
      }
      html += renderGallery(items, cols);
      html += "</div>";
    }

    if (link && !embed && !gallery) {
      html += '<div class="post-body post-body--link"><p class="post-link"><a href="' + link + '" target="_blank" rel="noopener">Открыть</a></p></div>';
    }

    html += "</article>";
    return html;
  }

  function renderFeed(posts) {
    if (!posts || !posts.length) {
      return '<p class="feed-empty">Пока нет постов. Добавьте их в <code>data/content.json</code>.</p>';
    }
    return posts.map(renderPost).join("");
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
      feedEl.innerHTML = renderFeed(getPosts(data));
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
