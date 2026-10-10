const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const skip = new Set(['node_modules', '.git', '.expo', 'dist', 'coverage', '.temp', '.branches']);
const errors = [];
let imports = 0;
let links = 0;
let routeLinks = 0;

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (skip.has(entry.name)) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

const all = files(root);
const routes = all
  .filter((file) => file.startsWith(path.join(root, 'app') + path.sep) && /\.[jt]sx?$/.test(file))
  .filter((file) => !/_layout\.[jt]sx?$/.test(file))
  .map(
    (file) =>
      '/' +
      path
        .relative(path.join(root, 'app'), file)
        .replace(/\.[jt]sx?$/, '')
        .split(path.sep)
        .filter((part) => !/^\(.+\)$/.test(part))
        .filter((part, i, parts) => !(part === 'index' && i === parts.length - 1))
        .join('/'),
  );

function routeExists(href) {
  const target =
    href
      .split(/[?#]/)[0]
      .split('/')
      .filter((part) => !/^\(.+\)$/.test(part))
      .join('/')
      .replace(/\/$/, '') || '/';
  return routes.some((route) => {
    const pattern = route
      .split('/')
      .map((part) => (/^\[.+\]$/.test(part) ? '[^/]+' : part))
      .join('/');
    return new RegExp(`^${pattern}$`).test(target);
  });
}

function importExists(file, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return true;
  const base = specifier.startsWith('@/')
    ? path.join(root, 'src', specifier.slice(2))
    : path.resolve(path.dirname(file), specifier);
  return [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.cjs',
    '.d.ts',
    '/index.ts',
    '/index.tsx',
    '/index.js',
  ].some((suffix) => fs.existsSync(base + suffix) && fs.statSync(base + suffix).isFile());
}

for (const file of all) {
  const relative = path.relative(root, file);
  if (/\.(?:[cm]?js|tsx?)$/.test(file)) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const checkImport = (node) => {
      if (!node || !ts.isStringLiteralLike(node)) return;
      imports += 1;
      if (!importExists(file, node.text)) errors.push(`${relative}: missing import ${node.text}`);
    };
    const checkRoute = (node) => {
      let href;
      if (node && ts.isStringLiteralLike(node)) href = node.text;
      if (node && ts.isTemplateExpression(node)) {
        href =
          node.head.text + node.templateSpans.map((span) => 'value' + span.literal.text).join('');
      }
      if (!href?.startsWith('/')) return;
      routeLinks += 1;
      if (!routeExists(href)) errors.push(`${relative}: missing route ${href}`);
    };
    const visit = (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        checkImport(node.moduleSpecifier);
      if (ts.isCallExpression(node)) {
        if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          node.expression.getText(source) === 'require'
        ) {
          checkImport(node.arguments[0]);
        }
        if (/\brouter\.(?:push|replace|navigate)$/.test(node.expression.getText(source))) {
          checkRoute(node.arguments[0]);
        }
      }
      if (ts.isPropertyAssignment(node) && /^(?:pathname|href)$/.test(node.name.getText(source))) {
        checkRoute(node.initializer);
      }
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'href') {
        checkRoute(
          node.initializer && ts.isJsxExpression(node.initializer)
            ? node.initializer.expression
            : node.initializer,
        );
      }
      if (
        relative === 'app.config.ts' &&
        ts.isPropertyAssignment(node) &&
        /^(?:icon|foregroundImage|backgroundImage|monochromeImage)$/.test(node.name.getText(source))
      ) {
        checkImport(node.initializer);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  if (file.endsWith('.md')) {
    const markdown = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const match of markdown.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1];
      if (/^(?:[a-z]+:|#|\/\/)/i.test(href)) continue;
      const target = decodeURIComponent(href.split(/[?#]/)[0]);
      links += 1;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
        errors.push(`${relative}: missing link ${href}`);
      }
    }
  }
}

const migrations = all.filter((file) => /supabase\/migrations\/.*\.sql$/.test(file));
const versions = new Set();
for (const file of migrations) {
  const match = path.basename(file).match(/^(\d{14})_[a-z0-9_]+\.sql$/);
  if (!match) errors.push(`Invalid Supabase migration name: ${path.basename(file)}`);
  else if (versions.has(match[1])) errors.push(`Duplicate Supabase migration version: ${match[1]}`);
  else versions.add(match[1]);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(pkg.private, 'The app must remain a private package');
for (const file of all) {
  if (/^(?:package-lock\.json|yarn\.lock|bun\.lockb?)$/.test(path.relative(root, file))) {
    errors.push(`Unexpected package-manager lockfile: ${path.basename(file)}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Integrity passed: ${imports} imports/assets, ${links} document links, ${routeLinks} static navigation links, ${migrations.length} server migrations.`,
  );
}
