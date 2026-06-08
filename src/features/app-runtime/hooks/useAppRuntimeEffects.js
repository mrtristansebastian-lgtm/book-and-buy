import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useAppRuntimeEffects({ isNativeAppRuntime }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    root.classList.toggle('capacitor-native', isNativeAppRuntime);
    if (isNativeAppRuntime) root.dataset.platform = Capacitor.getPlatform?.() || 'native';
    return () => {
      root.classList.remove('capacitor-native');
      if (root.dataset.platform === 'android' || root.dataset.platform === 'ios' || root.dataset.platform === 'native') {
        delete root.dataset.platform;
      }
    };
  }, [isNativeAppRuntime]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const mobileBrowserQuery = window.matchMedia('(max-width: 767px)');
    const syncRuntimeClass = () => {
      root.classList.toggle('app-mobile-browser', !isNativeAppRuntime && mobileBrowserQuery.matches);
    };
    syncRuntimeClass();
    if (isNativeAppRuntime) {
      root.classList.remove('app-idle', 'app-hidden', 'app-mobile-browser');
      return () => {
        root.classList.remove('app-idle', 'app-hidden', 'app-mobile-browser');
      };
    }
    const idleDelay = mobileBrowserQuery.matches ? 12000 : 45000;
    let idleTimer = 0;
    let lastActivityAt = 0;

    const setIdle = () => {
      root.classList.add('app-idle');
    };

    const resetIdle = () => {
      const now = Date.now();
      const alreadyActive = !root.classList.contains('app-idle');
      if (alreadyActive && now - lastActivityAt < 1200) return;
      lastActivityAt = now;
      root.classList.remove('app-idle');
      root.classList.remove('app-hidden');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(setIdle, idleDelay);
    };

    const pauseForPageHide = () => {
      window.clearTimeout(idleTimer);
      root.classList.add('app-hidden', 'app-idle');
    };

    const handleVisibility = () => {
      const hidden = document.visibilityState !== 'visible';
      root.classList.toggle('app-hidden', hidden);
      if (hidden) {
        pauseForPageHide();
      } else {
        resetIdle();
      }
    };

    const passiveOptions = { passive: true };
    const activityEvents = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'];

    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, resetIdle, passiveOptions);
    });
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', pauseForPageHide);
    window.addEventListener('pageshow', resetIdle);
    if (mobileBrowserQuery.addEventListener) {
      mobileBrowserQuery.addEventListener('change', syncRuntimeClass);
    } else {
      mobileBrowserQuery.addListener(syncRuntimeClass);
    }

    handleVisibility();

    return () => {
      window.clearTimeout(idleTimer);
      root.classList.remove('app-idle', 'app-hidden', 'app-mobile-browser');
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, resetIdle, passiveOptions);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', pauseForPageHide);
      window.removeEventListener('pageshow', resetIdle);
      if (mobileBrowserQuery.removeEventListener) {
        mobileBrowserQuery.removeEventListener('change', syncRuntimeClass);
      } else {
        mobileBrowserQuery.removeListener(syncRuntimeClass);
      }
    };
  }, [isNativeAppRuntime]);
}
