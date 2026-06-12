import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudhirtutorials.app',
  appName: 'SUDHIR TUTORIALS',
  webDir: 'out',
  server: {
    // Points to the live production server hosted on Vercel
    url: 'https://sudhirtutorials.vercel.app/',
    cleartext: true
  },
  plugins: {
    CapacitorCookies: {
      enabled: true
    },
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 3500,
      launchAutoHide: true,
      backgroundColor: "#111111",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#ef4444"
    }
  }
};

export default config;
