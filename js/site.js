(function () {
  var FALLBACK = {
    meta: { title: "Портфолио — видео", description: "Портфолио видеооператора." },
    brand: { name: "Имя Фамилия" },
    hero: {
      kicker: "Видеооператор · Москва",
      title: "Съёмка и монтаж под вашу задачу",
      lead: "Заполните файл data/content.json или откройте сайт через локальный сервер.",
      ctaLabel: "Связаться",
    },
    about: {
      title: "Обо мне",
      paragraphs: ["Не удалось загрузить content.json. Откройте index.html через локальный сервер или проверьте путь data/content.json."],
    },
    works: {
      title: "Работы",
      intro: "",
      videos: [],
    },
    more: { title: "Ещё обо мне", intro: "", items: [] },
    contact: {
      title: "Контакты",
      email: "",
      telegramLabel: "Telegram",
      telegramUrl: "",
    },
  };

  function esc(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderVideos(videos) {
    if (!videos || !videos.length) {
      return '<p class="section-intro">Добавьте работы в редакторе портфолио.</p>';
    }
    var html = '<div class="video-grid">';
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var url = (v.embedUrl || "").trim();
      html += '<article class="video-card">';
      html += '<div class="video-frame">';
      if (url) {
        html +=
          '<iframe src="' +
          String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;") +
          '" title="' +
          esc(v.title || "Видео") +
          '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      } else {
        html +=
          '<div class="video-placeholder"><p>Вставьте ссылку embed (YouTube / Vimeo) в редакторе.</p></div>';
      }
      html += "</div>";
      html += "<h3>" + esc(v.title) + "</h3>";
      html += "<p>" + esc(v.description) + "</p>";
      html += "</article>";
    }
    html += "</div>";
    return html;
  }

  function renderMoreItems(items) {
    if (!items || !items.length) return "";
    var html = "";
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      html += "<li><strong>" + esc(it.heading) + "</strong><span>" + esc(it.text) + "</span></li>";
    }
    return html;
  }

  function apply(data) {
    document.title = data.meta && data.meta.title ? data.meta.title : FALLBACK.meta.title;
    var md = document.querySelector('meta[name="description"]');
    if (md && data.meta && data.meta.description) {
      md.setAttribute("content", data.meta.description);
    }

    var logo = document.getElementById("site-logo");
    if (logo && data.brand) logo.textContent = data.brand.name || "";

    if (data.hero) {
      var k = document.getElementById("hero-kicker");
      var t = document.getElementById("hero-title");
      var l = document.getElementById("hero-lead");
      var cta = document.getElementById("hero-cta");
      if (k) k.textContent = data.hero.kicker || "";
      if (t) t.textContent = data.hero.title || "";
      if (l) l.textContent = data.hero.lead || "";
      if (cta) cta.textContent = data.hero.ctaLabel || "Связаться";
    }

    if (data.about) {
      var ah = document.getElementById("about-title");
      if (ah) ah.textContent = data.about.title || "Обо мне";
      var prose = document.getElementById("about-prose");
      if (prose && data.about.paragraphs) {
        prose.innerHTML = data.about.paragraphs
          .map(function (p) {
            return "<p>" + esc(p) + "</p>";
          })
          .join("");
      }
    }

    if (data.works) {
      var wt = document.getElementById("works-title");
      var wi = document.getElementById("works-intro");
      var grid = document.getElementById("video-grid");
      if (wt) wt.textContent = data.works.title || "Работы";
      if (wi) wi.textContent = data.works.intro || "";
      if (grid) grid.innerHTML = renderVideos(data.works.videos);
    }

    if (data.more) {
      var mt = document.getElementById("more-title");
      var mi = document.getElementById("more-intro");
      var ml = document.getElementById("more-list");
      if (mt) mt.textContent = data.more.title || "";
      if (mi) mi.textContent = data.more.intro || "";
      if (ml) ml.innerHTML = renderMoreItems(data.more.items);
    }

    if (data.contact) {
      var ct = document.getElementById("contact-title");
      if (ct) ct.textContent = data.contact.title || "Контакты";
      var block = document.getElementById("contact-block");
      if (block) {
        var parts = [];
        if (data.contact.email) {
          var em = esc(data.contact.email);
          parts.push("<p><a href=\"mailto:" + em + "\">" + em + "</a></p>");
        }
        if (data.contact.telegramUrl) {
          parts.push(
            '<p><a href="' +
              esc(data.contact.telegramUrl).replace(/"/g, "&quot;") +
              '" target="_blank" rel="noopener">' +
              esc(data.contact.telegramLabel || "Telegram") +
              "</a></p>"
          );
        }
        block.innerHTML = parts.join("") || "<p>Укажите контакты в content.json</p>";
      }
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
