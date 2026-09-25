import type { MetadataRoute } from "next";

const ROUTES = ["", "/play", "/bot", "/local", "/online", "/rules", "/how-to-play", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cross-line.pages.dev";
  const now = new Date();
  return ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/play" ? 0.9 : 0.6,
  }));
}
