const readVideoRating = (id) => browser.runtime.sendMessage({ type: "video-rating", id });
