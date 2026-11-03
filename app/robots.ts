import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/checkout",
          "/book/success",
          "/supplier/login",
          "/supplier/orders",
          "/supplier/inventory",
          "/supplier/schedule",
          "/supplier/earnings",
          "/supplier/profile",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
