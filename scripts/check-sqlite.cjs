const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { is } = require('drizzle-orm');
const { getTableConfig, SQLiteTable } = require('drizzle-orm/sqlite-core');
const schema = require('../src/lib/db/schema.ts');

const root = path.resolve(__dirname, '..');
const migrationDir = path.join(root, 'drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(migrationDir, 'meta/_journal.json'), 'utf8'));
const bundle = fs.readFileSync(path.join(migrationDir, 'migrations.js'), 'utf8');
const db = new DatabaseSync(':memory:');
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';

try {
  let previous;
  for (const [i, entry] of journal.entries.entries()) {
    assert.equal(entry.idx, i, 'Local migration indexes must be consecutive');
    assert(entry.when > (journal.entries[i - 1]?.when ?? 0), 'Migration timestamps must increase');
    const name = `m${String(i).padStart(4, '0')}`;
    assert(
      bundle.includes(`import ${name} from './${entry.tag}.sql'`),
      `Unbundled migration: ${entry.tag}`,
    );
    assert(
      new RegExp(`\\b${name}\\b`).test(bundle.split('migrations:')[1] ?? ''),
      `Missing bundle key: ${name}`,
    );
    const snapshot = JSON.parse(
      fs.readFileSync(
        path.join(migrationDir, `meta/${String(i).padStart(4, '0')}_snapshot.json`),
        'utf8',
      ),
    );
    if (previous) assert.equal(snapshot.prevId, previous.id, 'Broken migration snapshot chain');
    db.exec(fs.readFileSync(path.join(migrationDir, `${entry.tag}.sql`), 'utf8'));
    for (const table of Object.values(snapshot.tables)) {
      const columns = db.prepare(`PRAGMA table_info(${quote(table.name)})`).all();
      assert.deepEqual(
        columns.map((c) => c.name).sort(),
        Object.keys(table.columns).sort(),
        `Columns drifted: ${table.name}`,
      );
      for (const column of columns) {
        const expected = table.columns[column.name];
        assert.equal(
          column.type.toLowerCase(),
          expected.type.toLowerCase(),
          `Type drifted: ${table.name}.${column.name}`,
        );
        assert.equal(
          Boolean(column.notnull),
          expected.notNull,
          `Nullability drifted: ${table.name}.${column.name}`,
        );
      }
      const expectedPk =
        Object.values(table.compositePrimaryKeys)[0]?.columns ??
        Object.values(table.columns)
          .filter((c) => c.primaryKey)
          .map((c) => c.name);
      assert.deepEqual(
        columns
          .filter((c) => c.pk)
          .sort((a, b) => a.pk - b.pk)
          .map((c) => c.name),
        expectedPk,
        `Primary key drifted: ${table.name}`,
      );
      const indexes = db.prepare(`PRAGMA index_list(${quote(table.name)})`).all();
      for (const index of Object.values(table.indexes)) {
        const actual = indexes.find((row) => row.name === index.name);
        assert(actual, `Missing index: ${index.name}`);
        assert.equal(
          Boolean(actual.unique),
          index.isUnique,
          `Index uniqueness drifted: ${index.name}`,
        );
        const indexed = db.prepare(`PRAGMA index_info(${quote(index.name)})`).all();
        assert.deepEqual(
          indexed.map((c) => c.name),
          index.columns,
          `Index columns drifted: ${index.name}`,
        );
      }
    }
    previous = snapshot;
  }
  const sqlFiles = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  assert.deepEqual(
    sqlFiles,
    journal.entries.map((entry) => `${entry.tag}.sql`).sort(),
    'Unregistered SQLite migration',
  );
  const tables = Object.values(schema)
    .filter((value) => is(value, SQLiteTable))
    .map(getTableConfig);
  assert.deepEqual(
    tables.map((table) => table.name).sort(),
    Object.keys(previous.tables).sort(),
    'Source schema has unmigrated tables',
  );
  for (const table of tables) {
    const expected = previous.tables[table.name];
    assert.deepEqual(
      table.columns.map((column) => column.name).sort(),
      Object.keys(expected.columns).sort(),
      `Unmigrated columns: ${table.name}`,
    );
    for (const column of table.columns) {
      assert.equal(
        column.getSQLType(),
        expected.columns[column.name].type,
        `Unmigrated type: ${table.name}.${column.name}`,
      );
      assert.equal(
        column.notNull,
        expected.columns[column.name].notNull,
        `Unmigrated nullability: ${table.name}.${column.name}`,
      );
    }
  }
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  console.log(
    `SQLite passed: ${journal.entries.length} migrations replayed and checked against each snapshot.`,
  );
} finally {
  db.close();
}
