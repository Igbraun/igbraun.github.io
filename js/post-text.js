/** Безопасный вывод текста поста со ссылками (редактор → content.json) */
(function (global) {
  function isFileAttachmentPath(href) {
    var p = String(href || "")
      .trim()
      .replace(/^\/+/, "")
      .replace(/\\/g, "/");
    if (!p || /\.\./.test(p)) return false;
    return /^downloads\//i.test(p) || /^files\//i.test(p);
  }

  function normalizeTextLinkHref(href) {
    var u = (href || "").trim();
    if (!u) return "";
    var rel = u.replace(/^\/+/, "").replace(/\\/g, "/");
    if (isFileAttachmentPath(rel)) return rel;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try {
      var parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch (e) {
      return "";
    }
  }

  function normalizeLinkUrl(url) {
    return normalizeTextLinkHref(url);
  }

  function attachmentDownloadName(href) {
    var p = href.split("/").pop() || "download";
    try {
      p = decodeURIComponent(p);
    } catch (e) {}
    return p;
  }

  function attrUrl(url) {
    if (!url) return "";
    return String(url)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function appendSafe(parent, node) {
    if (node.nodeType === 3) {
      var t = node.textContent || "";
      if (t) parent.appendChild(document.createTextNode(t));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === "br") {
      parent.appendChild(document.createElement("br"));
      return;
    }
    if (tag === "a") {
      var href = normalizeTextLinkHref(node.getAttribute("href") || "");
      if (!href) {
        for (var c = node.firstChild; c; c = c.nextSibling) appendSafe(parent, c);
        return;
      }
      var a = document.createElement("a");
      a.setAttribute("href", href);
      if (isFileAttachmentPath(href)) {
        a.setAttribute("download", attachmentDownloadName(href));
        a.className = "post-text__file-link";
      } else {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
      for (var j = node.firstChild; j; j = j.nextSibling) appendSafe(a, j);
      if (!a.textContent.trim()) {
        a.textContent = isFileAttachmentPath(href) ? attachmentDownloadName(href) : href;
      }
      parent.appendChild(a);
      return;
    }
    if (tag === "p" || tag === "div") {
      var p = document.createElement("p");
      for (var k = node.firstChild; k; k = k.nextSibling) appendSafe(p, k);
      if (p.innerHTML || p.textContent) parent.appendChild(p);
      return;
    }
    if (tag === "strong" || tag === "b") {
      var b = document.createElement("strong");
      for (var m = node.firstChild; m; m = m.nextSibling) appendSafe(b, m);
      if (b.textContent) parent.appendChild(b);
      return;
    }
    if (tag === "em" || tag === "i") {
      var em = document.createElement("em");
      for (var n = node.firstChild; n; n = n.nextSibling) appendSafe(em, n);
      if (em.textContent) parent.appendChild(em);
      return;
    }
    for (var x = node.firstChild; x; x = x.nextSibling) appendSafe(parent, x);
  }

  function sanitizeTextHtml(html) {
    var wrap = document.createElement("div");
    wrap.innerHTML = html || "";
    var out = document.createElement("div");
    for (var i = 0; i < wrap.childNodes.length; i++) {
      appendSafe(out, wrap.childNodes[i]);
    }
    return out.innerHTML;
  }

  function hasHtmlMarkup(text) {
    return /<[a-z][\s\S]*>/i.test(String(text || ""));
  }

  function renderPostTextHtml(text, escFn) {
    if (!text) return "";
    var raw = String(text).trim();
    if (!raw) return "";

    if (!hasHtmlMarkup(raw)) {
      return (
        '<div class="post-text"><p>' +
        escFn(raw).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>") +
        "</p></div>"
      );
    }

    var safe = sanitizeTextHtml(raw);
    if (!safe) return "";
    return '<div class="post-text post-text--rich">' + safe + "</div>";
  }

  global.PostTextFormat = {
    render: renderPostTextHtml,
    sanitize: sanitizeTextHtml,
    hasHtmlMarkup: hasHtmlMarkup,
    attrUrl: attrUrl,
    normalizeLinkUrl: normalizeLinkUrl,
  };
})(typeof window !== "undefined" ? window : this);
