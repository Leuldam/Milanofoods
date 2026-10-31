import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { forest: "#073D2E", forestdark: "#03291F", ivory: "#FAF7F0", gold: "#C99A4A" }, fontFamily: { sans: ["Arial", "sans-serif"] } } },
  plugins: []
};
export default config;