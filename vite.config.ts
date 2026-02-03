import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: project site under /gaussian-elimination/
export default defineConfig({
  base: "/gaussian-elimination/",
  plugins: [react()],
});
