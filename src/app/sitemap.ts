import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/events", "/news", "/projects", "/privacy", "/terms"].map((p) => ({ url: `${siteUrl()}${p}` }));
}
