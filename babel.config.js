module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Drizzle's local SQLite migrations (drizzle/*.sql) are imported as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
