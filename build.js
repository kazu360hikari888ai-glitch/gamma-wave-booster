#!/usr/bin/env node
/**
 * 配信用ファイルを dist/ に生成する。
 *
 * index.html はブラウザ内のBabelでJSXを変換しているため、
 * 起動のたびにBabel本体（数MB）のダウンロードと2600行の変換が走る。
 * ここで事前に変換しておくことで、配信版からはBabelが丸ごと不要になる。
 *
 * index.html 自体は変更しない（そのまま開いても動く状態を保つ）。
 * 実行には @babel/core と @babel/preset-react が必要（CIでインストールされる）。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babel = require('@babel/core');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

const BABEL_TAG_START = '<script type="text/babel">';
const BABEL_CDN_RE = /\s*<!-- Babel \(JSX変換に必要、SRIで保護\) -->\s*<script[^>]*babel\.min\.js"><\/script>/;

function fail(msg) {
    console.error('✗ ビルド失敗: ' + msg);
    process.exit(1);
}

function assert(cond, msg) {
    if (!cond) fail(msg);
}

// ---------------------------------------------------------------- 1. 読み込み
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const startIdx = html.indexOf(BABEL_TAG_START);
assert(startIdx !== -1, 'index.html に <script type="text/babel"> が見つかりません');
const codeStart = startIdx + BABEL_TAG_START.length;
const endIdx = html.indexOf('</script>', codeStart);
assert(endIdx !== -1, 'text/babel ブロックの閉じタグが見つかりません');

const jsx = html.slice(codeStart, endIdx);
assert(jsx.length > 10000, 'JSXの抽出結果が短すぎます（' + jsx.length + '文字）');

// ---------------------------------------------------------------- 2. 変換
let out;
try {
    out = babel.transformSync(jsx, {
        filename: 'app.jsx',
        presets: [['@babel/preset-react', { runtime: 'classic' }]],
        babelrc: false,
        configFile: false,
        compact: false,
        comments: false,
        sourceMaps: false,
    });
} catch (e) {
    fail('JSXの変換でエラー: ' + e.message);
}
const js = out.code;
assert(js.indexOf('React.createElement') !== -1, '変換結果に React.createElement がありません');
assert(js.indexOf('</div>') === -1 && !/<[A-Za-z][^>]*\/>/.test(js), '変換結果にJSXが残っています');

const hash = crypto.createHash('sha256').update(js).digest('hex').slice(0, 10);

// ---------------------------------------------------------------- 3. index.html を書き換え
let distHtml = html.slice(0, startIdx) + `<script src="./app.js?v=${hash}"></script>` + html.slice(endIdx + '</script>'.length);

assert(BABEL_CDN_RE.test(distHtml), 'BabelのCDN読み込みタグが見つかりません（index.html の構造が変わった可能性）');
distHtml = distHtml.replace(BABEL_CDN_RE, '');

assert(distHtml.indexOf('text/babel') === -1, '配信用HTMLに text/babel が残っています');
assert(distHtml.indexOf('babel.min.js') === -1, '配信用HTMLに babel.min.js が残っています');
assert(distHtml.indexOf('./app.js') !== -1, '配信用HTMLに app.js の読み込みがありません');

// ---------------------------------------------------------------- 4. Service Worker を書き換え
let sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

const SW_BABEL_LINE = /\s*'https:\/\/unpkg\.com\/@babel\/standalone[^']*',?\n/;
assert(SW_BABEL_LINE.test(sw), 'sw.js にBabelのキャッシュ指定が見つかりません');
sw = sw.replace(SW_BABEL_LINE, '\n');

const SW_CORE = "    './icons/icon.svg'\n";
assert(sw.indexOf(SW_CORE) !== -1, 'sw.js のコアアセット一覧が見つかりません');
sw = sw.replace(SW_CORE, `    './icons/icon.svg',\n    './app.js?v=${hash}'\n`);

const SW_CACHE_RE = /const CACHE_NAME = '[^']*';/;
assert(SW_CACHE_RE.test(sw), 'sw.js に CACHE_NAME が見つかりません');
// ビルドごとにキャッシュ名を変え、更新が確実に行き渡るようにする
sw = sw.replace(SW_CACHE_RE, `const CACHE_NAME = 'gamma-wave-booster-${hash}';`);

assert(sw.indexOf('@babel/standalone') === -1, 'sw.js にBabelが残っています');

// ---------------------------------------------------------------- 5. 出力
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

fs.writeFileSync(path.join(DIST, 'index.html'), distHtml);
fs.writeFileSync(path.join(DIST, 'app.js'), js);
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
fs.copyFileSync(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
fs.cpSync(path.join(ROOT, 'icons'), path.join(DIST, 'icons'), { recursive: true });

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('✓ ビルド完了 (' + hash + ')');
console.log('  dist/index.html  ' + kb(distHtml.length));
console.log('  dist/app.js      ' + kb(js.length) + '  ← JSX変換済み（Babel不要）');
console.log('  dist/sw.js       ' + kb(sw.length));
