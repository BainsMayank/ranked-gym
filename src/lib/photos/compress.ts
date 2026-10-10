import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Long edge of a shared photo: sharp on phones, about 300–500 KB as JPEG. */
export const PHOTO_MAX_EDGE = 1600;
const QUALITY = 0.75;

export interface CompressedPhoto {
  uri: string;
  width: number;
  height: number;
}

/** Scales an image down so its long edge is at most `max` (never up). */
export function fitWithin(width: number, height: number, max = PHOTO_MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Re-encodes a picked photo as a fresh JPEG. Decoding to pixels and encoding again writes a file
 * with no EXIF block, so GPS location and camera details never leave the phone.
 */
export async function compressPhoto(
  uri: string,
  width: number,
  height: number,
): Promise<CompressedPhoto> {
  const size = fitWithin(width, height);
  const context = ImageManipulator.manipulate(uri);
  if (size.width < width) context.resize({ width: size.width });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
