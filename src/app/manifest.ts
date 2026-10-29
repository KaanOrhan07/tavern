import type { MetadataRoute } from "next";

/** PWA: personel/garson paneli ana ekrana eklenip uygulama gibi açılır (çevrimdışı adisyon kuyruğu ile birlikte). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tavern",
    short_name: "Tavern",
    description: "Manage. Grow. Thrive.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#333333",
    theme_color: "#A53CFF",
    lang: "tr",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
