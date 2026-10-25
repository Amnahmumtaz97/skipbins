import type {
  BinPlacement,
  HeroSlide,
  HirePeriod,
  SkipBin,
  WasteCategory,
} from "@/types/skip-bin";

export const images = {
  hero: "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?auto=format&fit=crop&w=1800&q=88",
  mini: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=88",
  medium:
    "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=900&q=88",
  large:
    "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=900&q=88",
  extra:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=88",
  difference:
    "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=88",
};

const generalWasteUse = "General waste, i.e. household furniture";
const lightWasteUse = "Light waste, i.e. timber, plaster, green waste";
const mixedHeavyUse = "Heavy waste, i.e. soil, concrete, bricks and rubble";
const loadsUpTo9m = [generalWasteUse, lightWasteUse, mixedHeavyUse].join(" | ");
const loadsFrom10m = [generalWasteUse, lightWasteUse].join(" | ");

export const bins: SkipBin[] = [
  {
    id: "2m3",
    size: "2m³",
    name: "SKIP BIN",
    image: "/images/bin-2m3.png",
    description: "Compact top-load bin for general, light and heavy waste.",
    dimensions: "1.8m × 1.5m × 0.9m",
    recommendedFor: loadsUpTo9m,
    price: "$350",
    door: "No walk-in door",
    features: [
      "Up to 10 days hire",
      "No walk-in door",
      "Fast delivery",
      "Eco-friendly disposal",
    ],
  },
  {
    id: "3m3",
    size: "3m³",
    name: "SKIP BIN",
    image: "/images/bin-3m3.png",
    description: "Small walk-in bin for general, light and heavy waste.",
    dimensions: "2.4m × 1.5m × 0.9m",
    recommendedFor: loadsUpTo9m,
    price: "$450",
    door: "Walk-in door",
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "Fast delivery",
      "Eco-friendly disposal",
    ],
  },
  {
    id: "4m3",
    size: "4m³",
    name: "SKIP BIN",
    image: "/images/bin-4m3.png",
    description: "Walk-in bin for general, light and heavy waste.",
    dimensions: "3.2m × 1.5m × 0.9m",
    recommendedFor: loadsUpTo9m,
    price: "$550",
    door: "Walk-in door",
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "Fast delivery",
      "Free replacement if needed",
    ],
  },
  {
    id: "6m3",
    size: "6m³",
    name: "SKIP BIN",
    image: "/images/bin-6m3.png",
    description: "Popular bin for general, light and heavy waste.",
    dimensions: "3.6m × 1.5m × 1.2m",
    recommendedFor: loadsUpTo9m,
    price: "$750",
    door: "Walk-in door",
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "Fast delivery",
      "Bulk disposal available",
    ],
    popular: true,
  },
  {
    id: "8m3",
    size: "8m³",
    name: "SKIP BIN",
    image: "/images/bin-8m3.png",
    description: "Large walk-in bin for general, light and heavy waste.",
    dimensions: "3.7m × 1.6m × 1.4m",
    recommendedFor: loadsUpTo9m,
    price: "$850",
    door: "Walk-in door",
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "Fast delivery",
      "Commercial ready",
    ],
  },
  {
    id: "9m3",
    size: "9m³",
    name: "SKIP BIN",
    image: "/images/bin-9m3.png",
    description: "Largest bin for heavy waste, plus general and light loads.",
    dimensions: "4.0m × 1.6m × 1.5m",
    recommendedFor: loadsUpTo9m,
    price: "$950",
    door: "Walk-in door",
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "Fast delivery",
      "Commercial ready",
    ],
  },
  {
    id: "10m3",
    size: "10m³",
    name: "SKIP BIN",
    image: "/images/bin-9m3.png",
    description: "High-capacity bin for general and light waste only. No heavy waste.",
    dimensions: "4.1m × 1.6m × 1.9m",
    recommendedFor: loadsFrom10m,
    price: "$1050",
    door: "Walk-in door",
    restriction:
      "No Mixed Heavy Waste or Soil / Dirt. No soil, concrete, bricks, rubble, marble or other heavy material.",
    disallowedWasteTypes: ["mixed", "soil"],
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "General and light waste",
      "Commercial ready",
    ],
  },
  {
    id: "12m3",
    size: "12m³",
    name: "SKIP BIN",
    image: "/images/bin-9m3.png",
    description: "Largest bin for general and light waste only. No heavy waste.",
    dimensions: "5.0m × 2.0m × 1.5m",
    recommendedFor: loadsFrom10m,
    price: "$1200",
    door: "Walk-in door",
    restriction:
      "No Mixed Heavy Waste or Soil / Dirt. No soil, concrete, bricks, rubble, marble or other heavy material.",
    disallowedWasteTypes: ["mixed", "soil"],
    features: [
      "Up to 10 days hire",
      "Walk-in door",
      "General and light waste",
      "Maximum capacity",
    ],
  },
];

const extraCostWarning =
  "Disposal extras: tyres $25 each, first mattress free then $50 each, and carpet $70 per room.";

export const acceptedWaste: WasteCategory[] = [
  {
    id: "general",
    label: "General Waste",
    description: "Light domestic and commercial waste",
    icon: "trash",
    swatch: "#5C6B63",
    acceptedItems: [
      "Light domestic waste",
      "Light construction waste",
      "Office waste",
    ],
    warning: extraCostWarning,
    notAccepted: [
      "Asbestos or hazardous waste",
      "Cleanfill / hardfill",
      "Sand, soil, clay or dirt",
      "Food products or food waste",
      "Tyres",
    ],
  },
  {
    id: "mixed",
    label: "Mixed Heavy Waste",
    description: "Domestic, commercial, demolition & renovation",
    icon: "bricks",
    swatch: "#8B6A49",
    acceptedItems: [
      "Household waste & furniture",
      "Builders waste & timber",
      "Bricks, tiles & concrete",
      "Green waste & metal / steel",
    ],
    warning: extraCostWarning,
    notAccepted: [
      "Asbestos or hazardous waste",
      "Sand, soil, clay or dirt",
      "TV sets or computer monitors",
      "Food products or food waste",
      "Tyres",
    ],
  },
  {
    id: "green",
    label: "Green Garden Waste",
    description: "Price based strictly on green garden waste only",
    icon: "leaf",
    swatch: "#3C8B5D",
    acceptedItems: [
      "Grass, leaves & weeds",
      "Tree trimmings & small branches",
      "Bark",
    ],
    notAccepted: [
      "Asbestos or hazardous waste",
      "General waste",
      "Food waste",
      "Sand, soil or clay",
    ],
  },
  {
    id: "soil",
    label: "Soil / Dirt",
    description: "Price based strictly on soil/dirt only",
    icon: "soil",
    swatch: "#7A5637",
    acceptedItems: ["100% soil / dirt only"],
    notAccepted: [
      "Asbestos or hazardous waste",
      "Turf or contaminants",
      "General waste",
      "Cleanfill / hardfill or garden waste",
    ],
  },
];

export const hirePeriods: HirePeriod[] = [
  "Standard (10 days)",
  "Extended (7 days)",
  "Extended (14 days)",
];

export function formatHirePeriod(value?: string | null) {
  if (value === "Standard (10 days)" || value === "Standard (7 days)")
    return "Up to 10 days hire";
  if (value === "Extended (7 days)")
    return "Extended hire: up to 7 extra days ($50)";
  if (value === "Extended (14 days)")
    return "Extended hire: 8–14 extra days ($75)";
  return value ?? "";
}

export const placements: BinPlacement[] = ["Driveway", "Road", "Nature Strip"];

export const heroSlides: HeroSlide[] = [
  {
    image: images.hero,
    alt: "Green skip bin filled with garden waste outdoors",
    label: "Green garden clean-up",
  },
  {
    image: images.medium,
    alt: "Green waste collection skip bin ready for a renovation",
    label: "Responsible renovation waste",
  },
  {
    image: images.difference,
    alt: "Green skip bin supporting a cleaner outdoor space",
    label: "Skip more, spend less",
  },
];

export const differenceItems = [
  { id: "waste-sorted", text: "Waste sorted for recovery" },
  { id: "fast-delivery", text: "Fast, local delivery" },
  { id: "clear-pricing", text: "Clear, upfront pricing" },
  { id: "friendly-support", text: "Friendly local support" },
  { id: "eco-friendly", text: "Eco-friendly disposal practices" },
  { id: "flexible-rental", text: "Flexible rental periods" },
  { id: "free-pickup", text: "Free pickup and replacement" },
  { id: "certified-recycling", text: "Certified recycling partner" },
];

export const faqItems = [
  {
    id: "delivery",
    question: "How quickly can you deliver a skip bin?",
    answer:
      "We offer next-day delivery in most areas. Our local fleet ensures fast, reliable service for all bookings.",
  },
  {
    id: "duration",
    question: "How long can I keep a skip bin?",
    answer:
      "Standard hire includes any pickup date from delivery, up to 10 days. Up to 7 extra days is $50, and 8–14 extra days is $75.",
  },
  {
    id: "overfill",
    question: "What happens if my skip bin is overfilled?",
    answer:
      "Bins must not exceed the top edge. Overfilled bins are a safety and transport issue. Additional waste can be arranged at extra cost.",
  },
  {
    id: "prohibited",
    question: "What items can't go in skip bins?",
    answer:
      "Hazardous waste, chemicals, asbestos, paint, oil, batteries, and electronics are prohibited. Contact us for safe disposal solutions.",
  },
  {
    id: "placement",
    question: "Where should I place the skip bin?",
    answer:
      "Place on a hard, level surface like concrete or asphalt. Avoid gravel or soft ground. Ensure at least 1.5m clearance from power lines.",
  },
  {
    id: "pricing",
    question: "Are there hidden fees?",
    answer:
      "No. Our pricing is fully transparent. You pay for the bin size and rental period. Additional waste disposal fees apply only if needed.",
  },
];

export const contactInfo = {
  email: "hello@premiumskipbinhire.example",
  phone: "1300 SKIP BIN",
  hours: "Monday - Friday: 7am - 6pm, Saturday: 8am - 4pm",
  address: "Premium Skip Bin Hire Distribution Center, Sydney NSW 2000",
};

function normalizeBinKey(value: string) {
  return value.trim().toLowerCase().replace(/m³/g, "m3").replace(/\s+/g, "");
}

export function getBinBySizeOrId(value?: string | null) {
  if (!value) return undefined;
  const key = normalizeBinKey(value);
  return bins.find(
    (bin) => bin.id === key || normalizeBinKey(bin.size) === key,
  );
}

export function formatBinSize(value: string) {
  return getBinBySizeOrId(value)?.size ?? value;
}

export function formatBinLabel(value: string) {
  const bin = getBinBySizeOrId(value);
  return bin ? `${bin.size} — ${bin.name}` : value;
}

export function getWasteById(value?: string | null) {
  if (!value) return undefined;
  return acceptedWaste.find(
    (item) => item.id === value || item.label === value,
  );
}

export function isWasteAllowedForBin(
  size?: string | null,
  waste?: string | null,
) {
  const bin = getBinBySizeOrId(size);
  return !bin || !waste || !bin.disallowedWasteTypes?.includes(waste);
}
