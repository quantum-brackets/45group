import localFont from "next/font/local";

export const dancing_script = localFont({
  src: [
    {
      path: "../../src/fonts/dancing-script/bold.ttf",
      weight: "700",
    },
  ],
  fallback: ["merriweather", "inter"],
  variable: "--font-dancing-script",
});
export const merriweather = localFont({
  src: [
    {
      path: "../../src/fonts/merriweather/light.ttf",
      weight: "300",
    },
    {
      path: "../../src/fonts/merriweather/regular.ttf",
      weight: "400",
    },
    {
      path: "../../src/fonts/merriweather/bold.ttf",
      weight: "700",
    },
    {
      path: "../../src/fonts/merriweather/black.ttf",
      weight: "900",
    },
  ],
  fallback: ["inter"],
  variable: "--font-merriweather",
});
