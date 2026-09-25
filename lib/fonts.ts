import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// Three voices (Design System 4.1): editorial serif, grotesk sans, console mono
export const serif = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});
export const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-plex-sans",
  display: "swap",
});
export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});
