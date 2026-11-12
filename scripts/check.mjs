import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const dir of ['public','api','server','scripts']) {
  for (const file of readdirSync(dir)) if (/\.(mjs|js)$/.test(file)) execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
}
JSON.parse(readFileSync('vercel.json','utf8'));
console.log('Sintassi JavaScript e configurazione Vercel verificate. Nessuna dipendenza da installare.');
