import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/booking", priority: 0.95, changeFrequency: "weekly" },
    { path: "/book", priority: 0.8, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/supplier/apply", priority: 0.4, changeFrequency: "monthly" },
  ];

  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
