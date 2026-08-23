// Dibuja una sala interior con rejilla y coordenadas, para poder rediseñarla.
//   node tools/sala.js <clave> [x0,y0,x1,y1,"etiqueta"]
const fs=require('fs'), path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const clave=process.argv[2];
if(!clave){ console.error('uso: node tools/sala.js <clave> [x0,y0,x1,y1,etiqueta]'); process.exit(1); }
const stI=s.indexOf('const INTERIORS'), enI=s.indexOf('//  EDIFICIOS');
let blk=s.slice(stI,enI); blk=blk.slice(0,blk.lastIndexOf('};')+2);
let INTERIORS; eval(blk.replace('const INTERIORS','INTERIORS'));
const I=INTERIORS[clave];
if(!I){ console.error('no existe la sala "'+clave+'". Hay: '+Object.keys(INTERIORS).join(', ')); process.exit(1); }
const stD=s.indexOf('function drawInTile'), enD=s.indexOf('//  ESTADO');
let fn=s.slice(stD,enD); fn=fn.slice(0,fn.lastIndexOf('}')+1);
let marca=null;
if(process.argv[3]){ const p=process.argv[3].split(','); marca=[+p[0],+p[1],+p[2],+p[3],p.slice(4).join(',')]; }
const payload={clave,I,drawInTileSrc:fn,marca,nota:process.argv[4]?process.argv[4].split('|'):null};
const tpl=fs.readFileSync(path.join(__dirname,'sala-template.html'),'utf8');
const out=path.join(__dirname,'.sala-render.html');
fs.writeFileSync(out, tpl.replace('DATA_PLACEHOLDER', JSON.stringify(payload)));
console.log('HTML listo:', out);
console.log('captura:  chromium --headless=new --hide-scrollbars --virtual-time-budget=4000 \\');
console.log('            --window-size=1400,900 --screenshot=sala-'+clave+'.png "file://'+out+'"');
