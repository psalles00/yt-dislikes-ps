(() => {
  const CARD = ".rounded-lg.border.bg-card.text-card-foreground.shadow-sm.p-3.pt-4.space-y-6";
  const STYLE_ID = "yt-dislikes-jabrek-isolation";
  function reportHeight(card) {
    requestAnimationFrame(() => {
      const height = Math.ceil(card.getBoundingClientRect().height);
      parent.postMessage(
        { type: "yt-dislikes-jabrek-height", height },
        "https://www.youtube.com"
      );
    });
  }
  function isolate() {
    const card = document.querySelector(CARD);
    if (!card) return;
    if (document.getElementById(STYLE_ID)) return reportHeight(card);
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `html,body{margin:0!important;min-height:0!important;background:transparent!important;overflow:hidden!important}body>*{visibility:hidden!important}${CARD}{visibility:visible!important;position:absolute!important;inset:0 auto auto 0!important;z-index:2147483647!important;box-sizing:border-box!important;width:100%!important;height:auto!important;max-width:none!important;margin:0!important;overflow:visible!important;border-radius:0!important}${CARD} *{visibility:visible!important}${CARD}>:first-child{display:none!important}${CARD}>:nth-child(2)>:not(:nth-child(1)):not(:nth-child(2)){display:none!important}${CARD}>:nth-child(2)>:first-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}${CARD}>:nth-child(2)>:first-child>:nth-child(-n+2){display:none!important}`;
    document.documentElement.append(style);
    new ResizeObserver(() => reportHeight(card)).observe(card);
    reportHeight(card);
  }
  new MutationObserver(isolate).observe(document.documentElement, { childList: true, subtree: true });
  isolate();
})();
