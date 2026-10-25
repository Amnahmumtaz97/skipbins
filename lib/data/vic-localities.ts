import raw from "./vic-localities.json";

export type VicLocality = {
  id: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
};

export const vicLocalities = raw as VicLocality[];
