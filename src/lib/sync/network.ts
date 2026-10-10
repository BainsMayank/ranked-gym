import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { AppState } from 'react-native';

import { retryNow, runSync, stopSync } from './runner';
import { useSyncStatusStore } from './status';

/**
 * Keeps the runner in step with the device: retries straight away when the connection comes back
 * (instead of waiting out the backoff) and runs on every return to the foreground. Started once by
 * the signed-in layout (`useSyncEngine`); returns a stop function.
 */

/** Only a definite "no connection" counts as offline (unknown reachability still tries). */
function isOnline(state: NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function startSyncEngine(): () => void {
  let active = true;
  let wasOnline = useSyncStatusStore.getState().online;
  const apply = (state: NetworkState) => {
    if (!active) return;
    const online = isOnline(state);
    useSyncStatusStore.setState({ online });
    if (online && !wasOnline) void retryNow();
    wasOnline = online;
  };

  void getNetworkStateAsync()
    .then(apply)
    .catch(() => undefined)
    .finally(() => {
      if (active) void runSync();
    });
  const network = addNetworkStateListener(apply);
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void runSync();
  });
  return () => {
    active = false;
    stopSync();
    network.remove();
    appState.remove();
  };
}
