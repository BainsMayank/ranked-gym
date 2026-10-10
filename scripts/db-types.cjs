const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'src/types/database.ts');
const args = process.argv.slice(2);
if (
  args.some((arg) => !['--local', '--linked', '--check'].includes(arg)) ||
  args.filter((arg) => ['--local', '--linked'].includes(arg)).length !== 1
) {
  console.error('Usage: node scripts/db-types.cjs (--local | --linked) [--check]');
  process.exit(1);
}
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'supabase',
    'gen',
    'types',
    'typescript',
    args.includes('--linked') ? '--linked' : '--local',
    '--schema',
    'public',
  ],
  {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, DO_NOT_TRACK: '1' },
  },
);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.status !== 0 || !result.stdout?.includes('export type Database =')) {
  console.error(
    result.error?.message ?? 'Database type generation failed. Existing types were preserved.',
  );
  process.exit(1);
}

async function main() {
  const prettier = await import('prettier');
  const config = await prettier.resolveConfig(target);
  const output = await prettier.format(result.stdout, { ...config, filepath: target });
  if (args.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== output) {
      throw new Error(
        'Database types have drifted. Regenerate with pnpm db:types for this database.',
      );
    }
    console.log('Database types match.');
    return;
  }
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, output, { flag: 'wx' });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  console.log('Database types regenerated.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
