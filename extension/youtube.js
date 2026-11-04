(() => {
  const PANEL_ID = "yt-dislikes-jabrek-panel";
  const THUMBNAIL_HOST = "ytd-thumbnail, yt-thumbnail-view-model, ytm-thumbnail";
  const HOME_THUMBNAIL = "ytd-rich-item-renderer a.ytLockupViewModelContentImage";
  const THUMBNAIL = HOME_THUMBNAIL + ", " + THUMBNAIL_HOST + ", a#thumbnail, a[class*='shortsLockup'][href^='/shorts/']";
  const VIDEO_LINK = "a[href^='/watch?'], a[href^='/shorts/'], a[href^='/live/']";
  const SOURCE = "https://returnyoutubedislike.com/";
  const scores = new Map();
  const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const fullNumber = new Intl.NumberFormat("pt-BR");
  const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
  let watchRating;
  let thumbnailHover;

  const ICON_PATHS = {
    star: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1Z",
    eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    vote: "M7 10v11H3V10h4Zm0 0 5-7c2 0 3 1.5 2.5 3.5L14 9h5a2 2 0 0 1 2 2.4l-1.6 7A2 2 0 0 1 17.5 20H7",
  };

  function makeIcon(name) {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("class", "ps-yt-rating-icon");
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", ICON_PATHS[name === "dislike" ? "vote" : name]);
    if (name === "dislike") path.setAttribute("transform", "rotate(180 12 12)");
    svg.append(path);
    return svg;
  }

  function setRatingText(element, text = "") {
    element.replaceChildren(makeIcon("star"), text);
  }

  function voteBar(likes, dislikes) {
    const bar = document.createElement("span");
    const positive = 100 * likes / (likes + dislikes);
    bar.className = "ps-yt-vote-bar";
    bar.style.setProperty("--ps-yt-likes", `${positive}%`);
    bar.title = `${format.format(positive)}% de likes · ${format.format(100 - positive)}% de dislikes`;
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", bar.title);
    return bar;
  }

  function metric(icon, value, label, abbreviated = false) {
    const metric = document.createElement("span");
    const full = fullNumber.format(value);
    metric.className = "ps-yt-rating-metric";
    metric.append(makeIcon(icon), abbreviated ? compactNumber.format(value).toLowerCase().replace(".", ",") : full);
    metric.title = `${full} ${label}`;
    metric.setAttribute("aria-label", metric.title);
    return metric;
  }

  function videoId(url) {
    const id = url.pathname === "/watch" ? url.searchParams.get("v") :
      url.pathname.match(/^\/(?:shorts|live)\/([\w-]{11})\/?$/)?.[1];
    return /^[\w-]{11}$/.test(id ?? "") ? id : null;
  }

  function requestRating(id) {
    const cached = scores.get(id);
    if (cached?.expires > Date.now()) return cached.promise;

    const entry = { expires: Infinity };
    entry.promise = readVideoRating(id)
      .catch(() => null)
      .then((result) => {
        entry.expires = Date.now() + (result?.status === "ok" ? 30 * 60_000 :
          result?.status === "unrated" ? 10 * 60_000 : 15_000);
        return result ?? { status: "unavailable" };
      });
    if (scores.size >= 300) scores.delete(scores.keys().next().value);
    scores.set(id, entry);
    return entry.promise;
  }

  function ratingLabel(result) {
    if (result.status === "ok") return `${format.format(result.score)}/10`;
    return result.status === "unrated" ? "Sem nota" : "Nota indisponível";
  }

  function clearThumbnailHover() {
    if (!thumbnailHover) return;
    clearTimeout(thumbnailHover.timer);
    thumbnailHover.badge.remove();
    thumbnailHover = null;
  }

  function pointerInside(event, rect) {
    return event.clientX >= rect.left && event.clientX < rect.right &&
      event.clientY >= rect.top && event.clientY < rect.bottom;
  }

  function showThumbnailRating(badge) {
    if (badge.dataset.rated === "true" || badge.dataset.loading === "true") return;
    badge.dataset.loading = "true";
    setRatingText(badge, "…");
    requestRating(badge.dataset.videoId).then((result) => {
      badge.dataset.loading = "false";
      badge.dataset.rated = String(result.status === "ok" || result.status === "unrated");
      setRatingText(badge, result.status === "ok" ? ratingLabel(result) : "—");
      if (result.viewCount != null) badge.append(metric("eye", result.viewCount, "visualizações", true));
      badge.title = `${ratingLabel(result)}${result.viewCount != null ?
        ` · ${fullNumber.format(result.viewCount)} visualizações` : ""} · Return YouTube Dislike`;
      badge.setAttribute("aria-label", badge.title);
    });
  }

  function onThumbnailIntent(event) {
    if (event.pointerType === "touch") return;
    if (thumbnailHover && pointerInside(event, thumbnailHover.rect)) return;
    clearThumbnailHover();
    if (!(event.target instanceof Element)) return;

    const homeLink = event.target.closest(HOME_THUMBNAIL);
    const thumb = homeLink ?? event.target.closest(THUMBNAIL_HOST) ?? event.target.closest(THUMBNAIL);
    const link = homeLink ?? thumb?.closest(VIDEO_LINK) ?? thumb?.querySelector(VIDEO_LINK);
    if (!link?.href) return;
    const id = videoId(new URL(link.href));
    const rect = thumb.getBoundingClientRect();
    if (!id || !pointerInside(event, rect)) return;

    const badge = document.createElement("span");
    badge.className = "ps-yt-thumb-rating";
    badge.dataset.videoId = id;
    badge.setAttribute("aria-live", "polite");
    badge.style.left = `${Math.max(0, rect.left) + 6}px`;
    badge.style.top = `${Math.max(0, rect.top) + 6}px`;
    setRatingText(badge);
    document.body.append(badge);
    thumbnailHover = { badge, rect, timer: setTimeout(() => showThumbnailRating(badge), 250) };
  }

  function renderWatch() {
    const url = new URL(location.href);
    const id = videoId(url);
    if (watchRating?.dataset.videoId !== id) {
      watchRating?.remove();
      watchRating = null;
    }
    if (!id) return;

    const target = url.pathname.startsWith("/shorts/") ?
      document.querySelector("ytd-reel-video-renderer[is-active], ytd-reel-video-renderer[active]") :
      document.querySelector("ytd-watch-metadata #title, #above-the-fold #title, ytm-slim-video-metadata-section-renderer");
    if (!target || watchRating?.parentElement === target) return;

    if (!watchRating) {
      watchRating = document.createElement("div");
      watchRating.className = "ps-yt-watch-rating";
      watchRating.dataset.videoId = id;
      watchRating.setAttribute("aria-live", "polite");
      const link = document.createElement("a");
      link.href = SOURCE;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      setRatingText(link, "…");
      link.title = "Nota estimada · Return YouTube Dislike";
      const row = watchRating;
      row.append(link);
      requestRating(id).then((result) => {
        setRatingText(link, ratingLabel(result));
        if (result.viewCount != null) row.append(metric("eye", result.viewCount, "visualizações", true));
        if (result.status === "ok") row.append(
          metric("vote", result.likes, "likes"),
          voteBar(result.likes, result.dislikes),
          metric("dislike", result.dislikes, "dislikes estimados")
        );
      });
    }
    if (url.pathname.startsWith("/shorts/")) {
      watchRating.classList.add("ps-yt-shorts-rating");
      if (getComputedStyle(target).position === "static") target.classList.add("ps-yt-rating-anchor");
    }
    target.append(watchRating);
  }

  addEventListener("message", (event) => {
    if (event.origin !== "https://v2.jabrek.net" || event.data?.type !== "yt-dislikes-jabrek-height") return;
    const iframe = document.querySelector(`#${PANEL_ID} iframe`);
    if (iframe?.contentWindow !== event.source) return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 0) iframe.style.height = `${Math.ceil(height)}px`;
  });

  function renderPanel() {
    const url = new URL(location.href);
    const id = url.pathname === "/watch" ? videoId(url) : null;
    const old = document.getElementById(PANEL_ID);
    const target = document.querySelector("#secondary-inner");
    if (old && id && old.dataset.videoId === id && old.parentElement === target) return;
    old?.remove();
    if (!id || !target) return;
    const panel = document.createElement("details");
    panel.id = PANEL_ID;
    panel.dataset.videoId = id;
    panel.setAttribute("aria-label", "Estatísticas de likes e dislikes");
    const summary = document.createElement("summary");
    summary.textContent = "Painel original do Jabrek";
    panel.append(summary);
    panel.addEventListener("toggle", () => {
      if (!panel.open || panel.querySelector("iframe")) return;
      const iframe = document.createElement("iframe");
      iframe.title = "Estatísticas de likes e dislikes";
      iframe.src = `https://v2.jabrek.net/yt-dislikes/v/${id}`;
      panel.append(iframe);
    });
    target.prepend(panel);
  }

  const refresh = () => { renderWatch(); renderPanel(); };
  let frame;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      refresh();
    });
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["href", "is-active", "active"]
  });

  document.addEventListener("pointerover", onThumbnailIntent, true);
  document.addEventListener("pointermove", (event) => {
    if (thumbnailHover && !pointerInside(event, thumbnailHover.rect)) clearThumbnailHover();
  }, true);
  document.documentElement.addEventListener("pointerleave", clearThumbnailHover);
  addEventListener("scroll", clearThumbnailHover, true);
  addEventListener("resize", clearThumbnailHover);
  addEventListener("blur", clearThumbnailHover);
  document.addEventListener("yt-navigate-finish", () => { clearThumbnailHover(); schedule(); });
  schedule();
})();
