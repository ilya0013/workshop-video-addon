// Рендер ролика с проверкой результата: node scripts/render.mjs <папка-ролика> [draft|standard|high]
// Код возврата рендера доверия не заслужил: проверяем, что файл
// обновился, длительность совпадает с data-duration композиции и файл декодируется целиком.
import { execSync } from 'node:child_process';
import { readFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const HF = 'npx --yes hyperframes@0.8.157';
const [dir, quality = 'high'] = process.argv.slice(2);
if (!dir || !existsSync(join(dir, 'index.html'))) {
  console.error('Укажите папку ролика с index.html, например: node scripts/render.mjs videos/01-test');
  process.exit(1);
}

const html = readFileSync(join(dir, 'index.html'), 'utf8');
const rootTag = html.match(/<[^>]*data-composition-id="[^"]+"[^>]*>/s)?.[0] ?? '';
const expected = Number(rootTag.match(/data-duration="([\d.]+)"/)?.[1]);
mkdirSync('renders', { recursive: true });
if (!expected) {
  console.error('ПРОВАЛ: не нашёл data-duration у корня композиции (элемент с data-composition-id)');
  process.exit(1);
}
const out = join('renders', `${basename(dir)}.mp4`);
const started = Date.now();

execSync(`${HF} render "${dir}" -q ${quality} -o "${out}"`, { stdio: 'inherit' });

const fail = (msg) => { console.error(`ПРОВАЛ: ${msg}`); process.exit(1); };
if (!existsSync(out) || statSync(out).mtimeMs < started) fail(`файл ${out} не обновился`);
const duration = Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString());
if (Math.abs(duration - expected) > 0.2) fail(`длительность ${duration} с вместо ${expected} с`);
execSync(`ffmpeg -v error -xerror -i "${out}" -f null -`, { stdio: 'inherit' });
console.log(`ГОТОВО: ${out} · ${(statSync(out).size / 1e6).toFixed(1)} МБ · ${duration.toFixed(2)} с · декодируется целиком`);
