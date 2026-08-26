const fs=require('fs');
const s=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');

function grab(startMark,endMark,varName,closer){
  const st=s.indexOf(startMark), en=s.indexOf(endMark);
  let blk=s.slice(st,en); blk=blk.slice(0,blk.lastIndexOf(closer)+closer.length);
  let out; eval(blk.replace(startMark, varName+'=undefined; '+varName));
  return out===undefined?eval(varName):out;
}
const stO=s.indexOf('const OUTDOOR=['), enO=s.indexOf('//  INTERIORES');
let bO=s.slice(stO,enO); bO=bO.slice(0,bO.lastIndexOf('];')+2);
let OUTDOOR; eval(bO.replace('const OUTDOOR','OUTDOOR'));

const stG=s.indexOf('const BLD_GEO=['), enG=s.indexOf('BLD_BY_KEY');
let bG=s.slice(stG,enG); bG=bG.slice(0,bG.lastIndexOf('];')+2);
let BLD_GEO; eval(bG.replace('const BLD_GEO','BLD_GEO'));

const stB=s.indexOf('const BUILDINGS = {'), enB=s.indexOf('for(const k in BUILDINGS)');
let bB=s.slice(stB,enB); bB=bB.slice(0,bB.lastIndexOf('};')+2);
let BUILDINGS; eval(bB.replace('const BUILDINGS','BUILDINGS'));

const W=OUTDOOR[0].length, H=OUTDOOR.length;

// ---- buscar solares libres (hierba '.' sin edificio) ----
const occupied=[];
for(let y=0;y<H;y++){occupied.push([]);for(let x=0;x<W;x++)occupied[y][x]=false;}
BLD_GEO.forEach(b=>{for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++) if(occupied[y]) occupied[y][x]=true;});
const isFree=(x,y)=> OUTDOOR[y] && OUTDOOR[y][x]==='.' && !occupied[y][x];
function rectFree(x0,y0,w,h){
  for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){ if(!isFree(x,y))return false; }
  return true;
}
const used=[];for(let y=0;y<H;y++){used.push([]);for(let x=0;x<W;x++)used[y][x]=false;}
function rectUnused(x0,y0,w,h){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(used[y][x])return false;return true;}
const plots=[];
for(let n=0;n<5;n++){
  let best=null;
  for(let h=3;h<=5;h++)for(let w=4;w<=10;w++)
    for(let y=0;y<=H-h;y++)for(let x=0;x<=W-w;x++){
      if(!rectFree(x,y,w,h)||!rectUnused(x-1,y-1,w+2,h+2))continue;
      const area=w*h; if(!best||area>best.area) best={x,y,w,h,area};
    }
  if(!best)break;
  plots.push(best);
  for(let y=best.y-1;y<best.y+best.h+1;y++)for(let x=best.x-1;x<best.x+best.w+1;x++) if(used[y]&&x>=0&&x<W)used[y][x]=true;
}

const payload={OUTDOOR,BLD_GEO,BUILDINGS,plots};

console.log('W',W,'H',H,'edificios',BLD_GEO.length,'solares',plots.map(p=>`${p.w}x${p.h}@${p.x},${p.y}`).join(' '));

// inyectar los datos + drawInTile en la plantilla y dejar el HTML listo para capturar
const path=require('path');
const stI=s.indexOf('function drawInTile'), enI=s.indexOf('//  ESTADO');
let fnSrc=s.slice(stI,enI); fnSrc=fnSrc.slice(0,fnSrc.lastIndexOf('}')+1);
payload.drawInTileSrc=fnSrc;
const tpl=fs.readFileSync(path.join(__dirname,'plano-template.html'),'utf8');
const out=path.join(__dirname,'.plano-render.html');
// con FUNCION, no con cadena: si no, las secuencias $' del codigo de dibujo
// se interpretan como patrones de reemplazo y destrozan el JSON
fs.writeFileSync(out, tpl.replace('DATA_PLACEHOLDER', () => JSON.stringify(payload)));
console.log('\nHTML listo:', out);
console.log('Ahora captura el PNG con Chromium:\n');
console.log('  chromium --headless=new --disable-gpu --hide-scrollbars \\');
console.log('    --virtual-time-budget=4000 --force-device-scale-factor=1 \\');
console.log('    --window-size=1950,1420 --screenshot=plano-campus-passau.png \\');
console.log('    "file://' + out + '"');
