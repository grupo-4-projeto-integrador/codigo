import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url"; // <-- Adicione esta linha
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// Adicione estas duas linhas logo abaixo dos imports:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function figmaAssetResolver() {
// ... o resto do seu código continua exatamente igual daqui para baixo
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },

  assetsInclude: ["**/*.svg", "**/*.csv"],
  
  // ─── ADICIONE ESTA SEÇÃO DE BUILD AQUI EMBAIXO ────────────────-------
  build: {
    // Sai da pasta frontend e entra em static/dist do seu backend
    outDir: "../static/dist", 
    // Limpa a pasta dist antiga antes de gerar os arquivos novos
    emptyOutDir: true, 
  },
  // ─────────────────────────────────────────────────────────────────────-------

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
    },
  },
});