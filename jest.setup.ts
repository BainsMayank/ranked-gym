import 'react-native-gesture-handler/jestSetup';
import { setUpTests } from 'react-native-reanimated';

// Reanimated 4 runs on react-native-worklets, which has no native module under Jest.
// babel-jest hoists this mock above the imports.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
setUpTests();

// FlashList measures layout natively; give it fixed sizes under Jest. (Its own jestSetup swaps in
// a RecyclerView export that 2.0.2 doesn't have.)
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => {
  const actual = jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout');
  const box = (width: number, height: number) => () => ({ x: 0, y: 0, width, height });
  return {
    ...actual,
    measureParentSize: jest.fn(box(400, 900)),
    measureFirstChildLayout: jest.fn(box(400, 900)),
    measureItemLayout: jest.fn(box(400, 300)),
  };
});
