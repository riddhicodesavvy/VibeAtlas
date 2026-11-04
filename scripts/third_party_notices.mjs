import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const visited=new Set();const notices=[];const missing=[];
function findPackage(name,from){
 let current=from;
 while(current.startsWith(root)){
  const directory=path.join(current,'node_modules',name);
  if(fs.existsSync(path.join(directory,'package.json')))return directory;
  const parent=path.dirname(current);if(parent===current)break;current=parent;
 }
 throw new Error('Dependency not installed: '+name);
}
function visit(name,from){
 const directory=findPackage(name,from);if(visited.has(directory))return;visited.add(directory);
 const pkg=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
 const licenses=fs.readdirSync(directory).filter(file=>/^(licen[sc]e|copying|ofl)(\..*)?$/i.test(file)&&fs.statSync(path.join(directory,file)).isFile());
 if(!licenses.length)missing.push(pkg.name);
 notices.push(`${pkg.name} ${pkg.version}\nDeclared license: ${pkg.license||'See upstream'}\n${licenses.map(file=>fs.readFileSync(path.join(directory,file),'utf8')).join('\n')}\n`);
 for(const dependency of Object.keys(pkg.dependencies||{}))visit(dependency,directory);
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const name of Object.keys(pkg.dependencies||{}))visit(name,root);
if(missing.length)throw new Error('Review missing dependency notices: '+missing.join(', '));
fs.mkdirSync(path.join(root,'public/notices'),{recursive:true});
fs.writeFileSync(path.join(root,'public/notices/THIRD_PARTY_NOTICES.txt'),'VibeAtlas third-party software and font notices\nApplication code: MIT. Music/data/image rights are separately documented in docs/DATA_SOURCES.md.\n\n'+notices.join('\n'+'='.repeat(72)+'\n\n'));
console.log(`Bundled license notices for ${visited.size} production dependency packages.`);
