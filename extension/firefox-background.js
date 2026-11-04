const youtubeHosts = new Set(["www.youtube.com", "youtube.com", "m.youtube.com"]);

browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "video-rating" || !sender.url || !sender.tab ||
      typeof message.id !== "string" || !/^[\w-]{11}$/.test(message.id)) return;
  const page = new URL(sender.url);
  if (page.protocol !== "https:" || !youtubeHosts.has(page.hostname)) return;
  return readVideoRating(message.id);
});
