export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  },
  removeItem: (key: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },
  clear: (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.clear();
      return true;
    } catch (e) {
      return false;
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return window.sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  },
  removeItem: (key: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.sessionStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },
  clear: (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      window.sessionStorage.clear();
      return true;
    } catch (e) {
      return false;
    }
  }
};
