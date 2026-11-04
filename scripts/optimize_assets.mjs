import fs from 'node:fs';
import sharp from 'sharp';
const source='public/editorial-stage.png',output='public/editorial-stage.webp';
if(!fs.existsSync(source))throw new Error('The licensed editorial source photograph is missing. See docs/DATA_SOURCES.md.');
await sharp(source).resize({width:1000,withoutEnlargement:true}).webp({quality:82}).toFile(output);
console.log(`Editorial image: ${fs.statSync(source).size} → ${fs.statSync(output).size} bytes. Original preserved.`);
