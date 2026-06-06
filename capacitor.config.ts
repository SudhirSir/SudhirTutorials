import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudhirtutorials.app',
  appName: 'SUDHIR TUTORIALS',
  webDir: 'out',
  server: {
    // Points to the live production server hosted on Vercel
    url: 'https://sudhirtutorials.vercel.app/',
    cleartext: true
  }
};

export default config;
