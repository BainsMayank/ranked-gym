import { fetchCustomExercises, fetchLibraryVersion, fetchOfficialExercises } from '../api';
import {
  countOfficialExercises,
  readLocalLibrarySource,
  readLocalLibraryVersion,
  replaceCustomExercises,
  replaceOfficialExercises,
} from '../repository';
import { syncExerciseLibrary } from '../sync';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { supabaseUrl: 'https://project.test/', supabaseAnonKey: 'test-key' } },
  },
}));
jest.mock('../api', () => ({
  fetchLibraryVersion: jest.fn(),
  fetchOfficialExercises: jest.fn(),
  fetchCustomExercises: jest.fn(),
}));
jest.mock('@/lib/auth/scope', () => ({ assertAccount: jest.fn() }));
jest.mock('../repository', () => ({
  countOfficialExercises: jest.fn(),
  readLocalLibraryVersion: jest.fn(),
  readLocalLibrarySource: jest.fn(),
  replaceOfficialExercises: jest.fn(),
  replaceCustomExercises: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchLibraryVersion).mockResolvedValue(2);
  jest.mocked(readLocalLibraryVersion).mockResolvedValue(2);
  jest.mocked(countOfficialExercises).mockResolvedValue(300);
  jest.mocked(fetchOfficialExercises).mockResolvedValue([]);
  jest.mocked(fetchCustomExercises).mockResolvedValue([]);
});

it('redownloads equal-version libraries when switching backend projects', async () => {
  jest.mocked(readLocalLibrarySource).mockResolvedValue('http://127.0.0.1:54321');
  expect(await syncExerciseLibrary('user')).toEqual({ version: 2, downloaded: true });
  expect(replaceOfficialExercises).toHaveBeenCalledWith([], 2, 'https://project.test');
  expect(replaceCustomExercises).toHaveBeenCalledWith([]);
});

it('upgrades caches created before the source was recorded', async () => {
  jest.mocked(readLocalLibrarySource).mockResolvedValue(null);
  expect((await syncExerciseLibrary('user')).downloaded).toBe(true);
});

it('keeps a current library from the same backend', async () => {
  jest.mocked(readLocalLibrarySource).mockResolvedValue('https://project.test');
  expect((await syncExerciseLibrary('user')).downloaded).toBe(false);
  expect(fetchOfficialExercises).not.toHaveBeenCalled();
  expect(fetchCustomExercises).toHaveBeenCalledWith('user');
});
