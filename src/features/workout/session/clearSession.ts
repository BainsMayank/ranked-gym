import { useRoutineEditor } from '../editor/store';
import { cancelPendingSave } from './controller';
import { cancelRestDone } from './restNotifications';
import { activeSession } from './store';

/** Clear in-memory drafts and settle pending saves before account data is deleted. */
export async function clearWorkoutSession(): Promise<void> {
  cancelRestDone(activeSession.getState().runtime.rest?.notificationId ?? null);
  activeSession.getState().reset();
  useRoutineEditor.getState().reset();
  await cancelPendingSave();
}
