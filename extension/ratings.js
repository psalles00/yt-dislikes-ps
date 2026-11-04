const readVideoRating = (() => {
  const STORAGE_KEY = "videoRatings";
  const DAY = 24 * 60 * 60 * 1000;
  const MINUTE = 60 * 1000;
  const DISLIKE_WEIGHT = 2;

  function save(state) {
    return (globalThis.browser ?? globalThis.chrome).storage.local.set({ [STORAGE_KEY]: state });
  }

  async function readRating(id) {
    const data = await (globalThis.browser ?? globalThis.chrome).storage.local.get(STORAGE_KEY);
    const state = data[STORAGE_KEY] ?? { entries: {}, times: [], blockedUntil: 0 };
    const now = Date.now();
    const cached = state.entries[id];
    if (cached?.expires > now && Object.hasOwn(cached.result, "viewCount")) return cached.result;

    state.times = state.times.filter((time) => time > now - DAY);
    if (state.blockedUntil > now || state.times.length >= 500 ||
        state.times.filter((time) => time > now - MINUTE).length >= 30) {
      return { status: "limited" };
    }
    state.times.push(now);
    await save(state);

    const url = new URL("https://returnyoutubedislikeapi.com/votes");
    url.searchParams.set("videoId", id);
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000) });
    if (response.status === 429) {
      const header = response.headers.get("Retry-After");
      const until = header && (/^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header));
      state.blockedUntil = Math.max(state.blockedUntil, now + 5 * MINUTE, until || 0);
      await save(state);
      return { status: "limited" };
    }
    if (!response.ok && response.status !== 404) return { status: "unavailable" };
    const votes = response.ok ? await response.json() : null;
    const { likes, dislikes, viewCount } = votes ?? {};
    const validVideo = votes?.id === id && !votes.deleted;
    const views = validVideo && Number.isSafeInteger(viewCount) && viewCount >= 0 ? viewCount : null;
    const result = validVideo && Number.isSafeInteger(likes) && likes >= 0 &&
      Number.isSafeInteger(dislikes) && dislikes >= 0 && likes + dislikes > 0
        ? { status: "ok", likes, dislikes, viewCount: views }
        : { status: "unrated", viewCount: views };
    const entries = Object.entries(state.entries).filter(([key, entry]) => key !== id && entry.expires > now);
    state.entries = Object.fromEntries(entries.slice(-499));
    state.entries[id] = { result, expires: now + (result.status === "ok" ? DAY : 30 * MINUTE) };
    await save(state);
    return result;
  }

  return async (id) => {
    const result = await navigator.locks.request(
      "ps-youtube-video-rating", { signal: AbortSignal.timeout(2000) }, () => readRating(id)
    );
    if (result.status !== "ok") return result;
    const { likes, dislikes } = result;
    const score = 10 * likes / (likes + DISLIKE_WEIGHT * dislikes);
    return { ...result, score: dislikes > 0 ? Math.min(9.9, score) : score };
  };
})();
