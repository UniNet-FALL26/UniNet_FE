const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.endsWith('.tsx') ? [path.join(dir, entry.name)] : []); }
function attr(node, name) { return node.attributes.properties.find(prop => prop.name?.getText() === name); }
test('every transparent popup has a close callback and a separate outside touch target', () => {
  const missing = []; let checked = 0;
  for (const file of files('src')) {
    const source = fs.readFileSync(file, 'utf8'); if (!source.includes('<Modal')) continue;
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function walk(node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === 'Modal' && attr(node.openingElement, 'transparent')) {
        checked++;
        const root = node.children.find(ts.isJsxElement);
        const backdrop = root?.children.some(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText(sf) === 'Pressable' && attr(child, 'onPress') && /absoluteFill|backdrop/i.test(attr(child, 'style')?.getText(sf) || ''));
        if (!attr(node.openingElement, 'onRequestClose') || !backdrop) missing.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      ts.forEachChild(node, walk);
    }
    walk(sf);
  }
  assert.ok(checked > 30, `Only ${checked} popups checked`);
  assert.deepEqual(missing, [], 'Popups missing outside dismissal');
});
