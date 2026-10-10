// Import data only: parse upstream TypeScript with the AST; never execute upstream code.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const upstream = process.argv[2];
if (!upstream) throw new Error('Usage: node scripts/import-body-art.cjs <upstream checkout>');
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties.map((p) => [p.name.getText().replaceAll('"', ''), literal(p.initializer)]),
    );
  }
  throw new Error(`Unexpected data node: ${node.getText().slice(0, 80)}`);
}
const models = {};
for (const [key, file] of Object.entries({
  maleFront: 'bodyFront',
  maleBack: 'bodyBack',
  femaleFront: 'bodyFemaleFront',
  femaleBack: 'bodyFemaleBack',
})) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(path.join(upstream, 'assets', `${file}.ts`), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const statement = source.statements.find(ts.isVariableStatement);
  const parts = literal(statement.declarationList.declarations[0].initializer);
  models[key] = parts.map(({ slug, path: paths }) => ({ slug, paths }));
}
fs.writeFileSync('assets/body/anatomy.json', JSON.stringify(models, null, 2) + '\n');
console.log('Imported four anatomy views, with upstream colours removed.');
