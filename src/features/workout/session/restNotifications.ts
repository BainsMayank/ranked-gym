import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useWorkoutPrefs } from '@/lib/workouts';

/**
 * Local notification when a rest ends, so it buzzes even with the app in the background or the
 * phone locked. Scheduled for the exact end time and cancelled on skip or +/-15 s (rescheduled).
 * Only local notifications: they work in Expo Go (push doesn't on Android).
 */

const CHANNEL = 'rest-timer';
let configured = false;

/** Foreground: no banner over the app (the sheet already shows it), just the sound. */
function configure(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: useWorkoutPrefs.getState().restSound,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    }).catch(() => undefined);
  }
}

export type NotifyPermission = 'granted' | 'denied' | 'undetermined';

export async function notifyPermission(): Promise<NotifyPermission> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'denied';
  }
}

/** Asked only after the user said yes to our own prompt (moment of intent, never on launch). */
export async function requestNotifyPermission(): Promise<boolean> {
  configure();
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleRestDone(
  endsAt: number,
  next: string | null,
): Promise<string | null> {
  if ((await notifyPermission()) !== 'granted') return null;
  configure();
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest over',
        body: next ? `Up next: ${next}` : 'Time for your next set',
        sound: useWorkoutPrefs.getState().restSound ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endsAt,
        channelId: CHANNEL,
      },
    });
  } catch {
    return null;
  }
}

export function cancelRestDone(id: string | null): void {
  if (id) void Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
