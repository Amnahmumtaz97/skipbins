export type SkipBin = {
  id: string;
  size: string;
  name: string;
  image: string;
  description: string;
  dimensions: string;
  recommendedFor: string;
  price: string;
  features: string[];
  popular?: boolean;
};

export type HeroSlide = {
  image: string;
  alt: string;
  label: string;
};

export type WasteIconName = "trash" | "bricks" | "block" | "leaf" | "soil";

export type WasteCategory = {
  id: string;
  label: string;
  description: string;
  icon: WasteIconName;
  swatch: string;
  acceptedItems: string[];
  warning?: string;
  notAccepted: string[];
};

export type HirePeriod = "Standard (7 days)" | "Extended (14 days)";

export type BinPlacement = "Driveway" | "Road" | "Nature Strip";

export type BookingFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  streetAddress: string;
  placement: BinPlacement | "";
  access: string;
  deliveryDate: string;
  pickupDate: string;
  binSize: string;
  wasteType: string;
  hirePeriod: HirePeriod | "";
  notes: string;
};
