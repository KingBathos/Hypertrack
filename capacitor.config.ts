import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hypertrack.app",
  appName: "HyperTrack",
  webDir: "public",
  server: {
    // Conexion directa por red local (Wi-Fi). Para produccion, cambiar por https://tu-dominio.com
    url: "http://192.168.1.82:3000",
    cleartext: true,
  },
  android: {
    backgroundColor: "#000000",
  },
};

export default config;
