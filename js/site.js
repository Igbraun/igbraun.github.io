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
    if (/^https?:\/\//i.test(u) || u.indexOf("/") === 0 || u.indexOf("./") === 0) {
      return u.replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }
    return "";
  }

  function getPosts(data) {
    if (data.posts && data.posts.length) return data.posts;
    if (data.feeds && data.feeds.home && data.feeds.home.posts) return data.feeds.home.posts;
    return [];
  }

  function renderGallery(images) {
    if (!images || !images.length) return "";
    var html = '<div class="gallery-grid">';
    for (var i = 0; i < images.length; i++) {
      var src = safeUrl(images[i]);
      if (!src) continue;
      html +=
        '<button type="button" class="gallery-cell" data-index="' +
        i +
        '" data-src="' +
        src +
        '" aria-label="Открыть фото ' +
        (i + 1) +
        ' из ' +
        images.length +
        '">';
      html += '<img src="' + src + '" alt="" loading="lazy" decoding="async" />';
      html += "</button>";
    }
    html += "</div>";
    return html;
  }

  function renderPost(post) {
    var gallery = post.gallery && post.gallery.length ? post.gallery : null;
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
      html += '<div class="post-gallery">' + renderGallery(gallery) + "</div>";
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
    if (feedEl) feedEl.innerHTML = renderFeed(getPosts(data));

    if (window.initLightbox) window.initLightbox();
  }

  function load() {
    return fetch("data/content.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
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
