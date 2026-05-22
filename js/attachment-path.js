/** Пути вложений: downloads/… в JSON, /downloads/… в href на сайте */
(function (global) {
  function attachmentStoragePath(href) {
    var p = String(href || "")
      .trim()
      .replace(/^\/+/, "")
      .replace(/\\/g, "/");
    if (!p || /\.\./.test(p)) return "";
    return p;
  }

  function isFileAttachmentPath(href) {
    var p = attachmentStoragePath(href);
    return /^downloads\//i.test(p) || /^files\//i.test(p);
  }

  function encodePathSegments(rel) {
    return rel
      .split("/")
      .filter(function (seg) {
        return seg.length > 0;
      })
      .map(function (seg) {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch (e) {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
  }

  /** Корневая ссылка для сайта: /downloads/slug/file.apk */
  function attachmentPublicHref(storageOrHref) {
    var p = attachmentStoragePath(storageOrHref);
    if (!isFileAttachmentPath(p)) return "";
    return "/" + encodePathSegments(p);
  }

  function attachmentHrefMatches(hrefA, hrefB) {
    var a = attachmentStoragePath(hrefA);
    var b = attachmentStoragePath(hrefB);
    return !!a && a === b;
  }

  global.AttachmentPath = {
    isFileAttachmentPath: isFileAttachmentPath,
    attachmentStoragePath: attachmentStoragePath,
    attachmentPublicHref: attachmentPublicHref,
    attachmentHrefMatches: attachmentHrefMatches,
    encodePathSegments: encodePathSegments,
  };
})(typeof window !== "undefined" ? window : this);
