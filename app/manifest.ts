import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "100 дней к себе",
    short_name: "100 дней",
    description: "Бережный трекер маленьких шагов к себе",
    start_url: "/",
    display: "standalone",
    background_color: "#eaf4fb",
    theme_color: "#0b2239",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
