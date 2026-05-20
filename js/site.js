(function () {
  var FALLBACK = {
    meta: { title: "Igor Braun", description: "Портфолио." },
    brand: { name: "Igor Braun" },
    feeds: {
      home: { title: "Избранное", intro: "", posts: [] },
      photo: { title: "Фото", intro: "", posts: [] },
      video: { title: "Видео", intro: "", posts: [] },
      more: { title: "Ещё", intro: "", posts: [] },
    },
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

  function renderPost(post) {
    var html = '<article class="post-card">';
    var img = safeUrl(post.imageUrl);
    var embed = safeUrl(post.embedUrl);
    var link = safeUrl(post.link);

    if (embed) {
      html += '<div class="post-media post-media--video">';
      html +=
        '<iframe src="' +
        embed +
        '" title="' +
        esc(post.title || "Видео") +
        '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      html += "</div>";
    } else if (img) {
      html += '<div class="post-media post-media--image">';
      if (link) {
        html += '<a href="' + link + '" target="_blank" rel="noopener"><img src="' + img + '" alt="' + esc(post.title || "") + '" loading="lazy" /></a>';
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
    if (link && !embed) {
      html += '<p class="post-link"><a href="' + link + '" target="_blank" rel="noopener">Открыть</a></p>';
    }
    html += "</div></article>";
    return html;
  }

  function renderFeed(posts) {
    if (!posts || !posts.length) {
      return '<p class="feed-empty">Пока нет постов. Добавьте их в <code>data/content.json</code>.</p>';
    }
    return posts.map(renderPost).join("");
  }

  function markActiveNav(page) {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var links = nav.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      a.classList.remove("is-active");
      if (page === "photo" && href.indexOf("photo") !== -1) a.classList.add("is-active");
      if (page === "video" && href.indexOf("video") !== -1) a.classList.add("is-active");
      if (page === "more" && href.indexOf("more") !== -1) a.classList.add("is-active");
    }
  }

  function apply(data) {
    var page = document.body.getAttribute("data-page") || "home";
    var feedKey = page === "home" ? "home" : page;
    var feedData = (data.feeds && data.feeds[feedKey]) || FALLBACK.feeds[feedKey];

    document.title =
      page === "home"
        ? (data.brand && data.brand.name) || "Igor Braun"
        : (feedData.title || page) + " — " + ((data.brand && data.brand.name) || "Igor Braun");

    var md = document.querySelector('meta[name="description"]');
    if (md) {
      var desc = (feedData.intro || data.meta && data.meta.description) || "";
      if (desc) md.setAttribute("content", desc);
    }

    var logo = document.getElementById("site-logo");
    if (logo && data.brand) {
      logo.textContent = data.brand.name || "Igor Braun";
      logo.setAttribute("href", "index.html");
    }

    markActiveNav(page);

    var pageTitle = document.getElementById("page-title");
    var pageIntro = document.getElementById("page-intro");
    var feedEl = document.getElementById("feed");

    if (page === "home") {
      if (pageTitle) pageTitle.style.display = "none";
      if (pageIntro) pageIntro.style.display = "none";
    } else {
      if (pageTitle) {
        pageTitle.style.display = "";
        pageTitle.textContent = feedData.title || "";
      }
      if (pageIntro) {
        pageIntro.style.display = feedData.intro ? "" : "none";
        pageIntro.textContent = feedData.intro || "";
      }
    }

    if (feedEl) {
      feedEl.innerHTML = renderFeed(feedData.posts);
    }

    var fn = document.getElementById("footer-name");
    if (fn && data.brand) fn.textContent = data.brand.name || "";
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
