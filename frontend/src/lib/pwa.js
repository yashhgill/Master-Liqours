// PWA + Web Push helper for staff/boss: register the service worker, ask for
// notification permission, and subscribe to push so new-order / low-stock /
// status-update alerts reach their phone even when the app isn't open.
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Call after a staff/admin logs in. Asks for notification permission and, if
 * granted, subscribes the browser to push and sends the subscription to the
 * backend so we can target this device for order/stock alerts.
 */
export async function subscribeStaffToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const { data } = await axios.get(`${API}/push/vapid-public-key`);
    if (!data?.public_key) return false;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key),
      });
    }

    await axios.post(`${API}/push/subscribe`, subscription.toJSON(), { withCredentials: true });
    return true;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return false;
  }
}
