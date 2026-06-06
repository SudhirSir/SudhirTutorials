import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudhirtutorials.app',
  appName: 'Sudhir Tutorials',
  webDir: 'out',
  server: {
    // Allows Android Emulator to loop back to the host's Next.js dev server
    url: 'http://10.0.2.2:3000',
    cleartext: true
  }
};

export default config;
