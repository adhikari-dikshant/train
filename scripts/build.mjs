import { cp, mkdir, rm, readFile, access } from 'node:fs/promises';

const files = ['index.html', 'style.css', 'script.js', 'journey-state.mjs', 'map-view.mjs', 'assets', 'vendor'];
const sources = await Promise.all(files.slice(0, 5).map(file => readFile(file, 'utf8')));
const references = [...sources.join('\n').matchAll(/(?:assets|vendor)\/[\w.-]+/g)].map(match => match[0]);
for (const path of new Set(references)) await access(path);
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of files) await cp(file, `dist/${file}`, { recursive: true });
console.log(`Static site ready. ${new Set(references).size} local asset references checked.`);
