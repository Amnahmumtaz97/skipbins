import type { HeroSlide, SkipBin } from "@/types/skip-bin";

export const images = {
  hero: "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?auto=format&fit=crop&w=1800&q=88",
  mini: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=88",
  medium: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=900&q=88",
  large: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=900&q=88",
  extra: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=88",
  difference: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=88",
};

export const bins: SkipBin[] = [
  { size: "2m³", name: "Mini Skip", description: "Perfect for small clear-outs, garden tidy-ups and weekend projects.", price: "$149", image: images.mini },
  { size: "4m³", name: "Medium Skip", description: "A smart fit for kitchens, bathrooms and medium home renovations.", price: "$199", image: images.medium },
  { size: "6m³", name: "Large Skip", description: "Room for larger renovations, building waste and bulky clean-ups.", price: "$249", image: images.large },
  { size: "8m³", name: "Extra Large Skip", description: "Our biggest bin for major construction jobs and full property clear-outs.", price: "$299", image: images.extra },
];

export const heroSlides: HeroSlide[] = [
  { image: images.hero, alt: "Green skip bin filled with garden waste outdoors", label: "Green garden clean-up" },
  { image: images.medium, alt: "Green waste collection skip bin ready for a renovation", label: "Responsible renovation waste" },
  { image: images.difference, alt: "Green skip bin supporting a cleaner outdoor space", label: "Cleaner spaces, greener future" },
];
