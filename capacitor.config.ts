import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudhirtutorials.app',
  appName: 'Sudhir Tutorials',
  webDir: 'out',
  server: {
    // Allows physical phone on the same Wi-Fi to connect to the host's Next.js dev server
    url: 'http://10.69.234.49:3000',
    cleartext: true
  }
};

export default config;
