import 'react-native-gesture-handler/jestSetup';
import { setUpTests } from 'react-native-reanimated';

// Reanimated 4 runs on react-native-worklets, which has no native module under Jest.
// babel-jest hoists this mock above the imports.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
setUpTests();
