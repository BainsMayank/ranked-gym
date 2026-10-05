const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem 16 keeps Tailwind's numeric spacing on a 4pt grid (p-4 = 16px).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
