import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.lanchat',
  appName: 'LAN Chat',
  webDir: 'dist',
  server: {
    // For development: uncomment and set your local dev URL
    // url: 'https://34eded86-dadd-44da-9933-defafd6cc525.lovableproject.com?forceHideBadge=true',
    // cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    // Custom plugin configurations
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
