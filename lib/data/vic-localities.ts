import raw from "./vic-localities.json";

export type VicLocality = {
  id: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
};

const imported = raw as VicLocality[] | { default: VicLocality[] };
export const vicLocalities = (
  Array.isArray(imported) ? imported : imported.default
) as VicLocality[];
