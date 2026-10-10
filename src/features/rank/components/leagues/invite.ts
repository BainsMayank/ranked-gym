import * as Linking from 'expo-linking';

/** The join link for an invite code (opens the app's Join screen with the code filled in). */
export function inviteLink(code: string): string {
  return Linking.createURL('/leagues/join', { queryParams: { code } });
}

export function inviteMessage(name: string, code: string): string {
  return `Join my league "${name}" on Ranked Gym. Code: ${code}\n${inviteLink(code)}`;
}
