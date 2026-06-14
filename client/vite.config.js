import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Add the ngrok host to the allowedHosts array
    allowedHosts: ["mouth-approach-haunt.ngrok-free.dev"],
    proxy: {
      "/api": "http://localhost:4000",
      "/wallet": "http://localhost:4000",
    },
  },
  allowedHosts: [".ngrok-free.dev"]
});
