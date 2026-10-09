import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * The optional workout photo. Picked from the library (no permission prompt: the system picker
 * only hands over what the user chose), compressed, and copied into the app's documents folder so
 * it survives until the upload goes through (the picker's own copy lives in a cache that can be
 * cleared).
 */
export async function pickWorkoutPhoto(workoutId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.7,
    exif: false,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const dir = new Directory(Paths.document, 'workout-photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  // A new name each time, so an image cache never shows the previous photo.
  const target = new File(dir, `${workoutId}-${Date.now()}.jpg`);
  await new File(asset.uri).copy(target);
  return target.uri;
}

/** Removes a local photo file (ignored if it's already gone). */
export function deleteLocalPhoto(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing to clean up.
  }
}
