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
      return {
        full: item.full,
        thumb: item.thumb || item.full.replace(/^(images\/galleries\/[^/]+)\//, "$1/thumbs/"),
      };
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
      html += '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" />';
      html += "</button>";
    }
    html += "</div>";
    return html;
  }

  function renderCover(coverFull, index, title) {
    if (!coverFull) return "";
    return (
      '<div class="post-cover">' +
      '<button type="button" class="post-cover__btn gallery-open" data-src="' +
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
    var items = normalizeGallery(post);
    var gallery = items.length ? items : null;
    var cols = post.galleryColumns === 4 ? 4 : 5;
    var coverRaw = safeUrl(post.coverImage);
    var coverIndex = coverRaw && gallery ? findCoverIndex(items, coverRaw) : 0;
    var img = safeUrl(post.imageUrl);
    var embed = safeUrl(post.embedUrl);
    var link = safeUrl(post.link);

    var html = '<article class="post-card' + (gallery ? " post-card--gallery" : "") + '">';

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

  /** Высота ячейки = пропорции самой широкой горизонтальной фото в посте */
  function fitGalleryCellAspects(root) {
    var blocks = (root || document).querySelectorAll(".post-gallery");
    for (var b = 0; b < blocks.length; b++) {
      fitOneGalleryAspect(blocks[b]);
    }
  }

  function fitOneGalleryAspect(postGallery) {
    var grid = postGallery.querySelector(".gallery-grid");
    if (!grid) return;

    var imgs = grid.querySelectorAll(".gallery-cell img");
    if (!imgs.length) return;

    var bestW = 0;
    var bestAspect = 1.5;
    var total = imgs.length;
    var done = 0;

    function finalize() {
      grid.style.setProperty("--cell-aspect", String(bestAspect));
    }

    function measure(img) {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      if (w > h && w > bestW) {
        bestW = w;
        bestAspect = w / h;
      }
    }

    function onReady(img) {
      measure(img);
      done++;
      if (done >= total) finalize();
    }

    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.complete && img.naturalWidth) {
        onReady(img);
      } else {
        img.addEventListener(
          "load",
          function () {
            onReady(img);
          },
          { once: true }
        );
        img.addEventListener(
          "error",
          function () {
            onReady(img);
          },
          { once: true }
        );
      }
    }
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
      fitGalleryCellAspects(feedEl);
    }

    if (window.initLightbox) window.initLightbox();
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
