import * as Notifications from 'expo-notifications';

/**
 * A local "league results are in" reminder for when the week closes (Monday 00:00 IST; the
 * cycle runs within the hour). Only scheduled when notifications are already allowed and the
 * user's `league_results` preference is on; never asks for permission. Push arrives in Phase 12.
 */

const ID = 'league-results';

export async function scheduleLeagueResults(weekEndsAt: string, enabled: boolean): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID);
    if (!enabled) return;
    const { status } = await Notifications.getPermissionsAsync();
    const at = Date.parse(weekEndsAt) + 70 * 60_000;
    if (status !== 'granted' || !Number.isFinite(at) || at <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'League results are in', body: 'See where you finished this week.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  } catch {
    // Reminders are best effort.
  }
}
