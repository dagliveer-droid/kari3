import { ALL_CARDS, cardToImage } from "./constants";

let hasPreloaded = false;

export function preloadCards() {
  if (hasPreloaded || typeof window === "undefined") return;
  hasPreloaded = true;

  const cardSources = ALL_CARDS.map(cardToImage);
  cardSources.push("/cards/back.png");

  for (const src of cardSources) {
    const img = new Image();
    img.src = src;
  }
}
