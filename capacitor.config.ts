import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.ithinkai.dailyinvoice',
  appName: 'Daily Invoice',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030712',
    },
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
