import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tereza",
    short_name: "Tereza",
    description: "El día de tu bebé, registrado en un toque.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: "#f4f1fb",
    theme_color: "#6247d6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
