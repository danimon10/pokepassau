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
// Que piezas van GIRADAS respecto a su dibujo por defecto, con la misma regla
// que el juego: la escalera, si el tramo es mas ancho que alto; el mostrador,
// si la barra es mas alta que ancha (saltando el hueco del dependiente).
const g=I.grid;
function tramo(x,y,letras,salta){
  const es=(a,b)=>letras.includes((g[b]||'')[a]||'\u0000');
  const vis=new Set([x+','+y]), cola=[[x,y]];
  let x0=x,x1=x,y0=y,y1=y;
  const pasos = salta ? [[0,-1],[0,1],[-1,0],[1,0],[0,-2],[0,2],[-2,0],[2,0]]
                      : [[0,-1],[0,1],[-1,0],[1,0]];
  while(cola.length){ const [a,b]=cola.pop();
    x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);
    for(const [dx,dy] of pasos){ const k=(a+dx)+','+(b+dy);
      if(!vis.has(k)&&es(a+dx,b+dy)){ vis.add(k); cola.push([a+dx,b+dy]); } } }
  return {x0,x1,y0,y1};
}
const escH=[];
for(let y=0;y<g.length;y++)for(let x=0;x<g[0].length;x++){
  const c=g[y][x];
  if(c==='S'||c==='V'||c==='U'){ const t=tramo(x,y,'SVU');
    if((t.x1-t.x0)>(t.y1-t.y0)) escH.push(x+','+y); }
  else if(c==='c'){ const t=tramo(x,y,'c',true);
    if((t.y1-t.y0)>(t.x1-t.x0)) escH.push(x+','+y); }
}
// mascara de union de las rayas pintadas (1 arriba, 2 abajo, 4 izq, 8 der),
// igual que marcarLineas() en el juego, para que el plano y la partida
// dibujen exactamente el mismo trazado
const raya=(x,y)=>{const c=(g[y]||'')[x]; return c==='w'||c==='y'||c==='j'||c==='d'||c==='f';};
const conex={};
for(let y=0;y<g.length;y++)for(let x=0;x<g[0].length;x++){
  if(!raya(x,y)) continue;
  conex[x+','+y]=(raya(x,y-1)?1:0)|(raya(x,y+1)?2:0)|(raya(x-1,y)?4:0)|(raya(x+1,y)?8:0);
}
const payload={clave,I,drawInTileSrc:fn,marca,escH,conex,nota:process.argv[4]?process.argv[4].split('|'):null};
const tpl=fs.readFileSync(path.join(__dirname,'sala-template.html'),'utf8');
const out=path.join(__dirname,'.sala-render.html');
// ojo: el reemplazo va con FUNCION. Con una cadena, las secuencias $' y $&
// del codigo de dibujo se interpretan como patrones y destrozan el JSON.
fs.writeFileSync(out, tpl.replace('DATA_PLACEHOLDER', () => JSON.stringify(payload)));
console.log('HTML listo:', out);
console.log('captura:  chromium --headless=new --hide-scrollbars --virtual-time-budget=4000 \\');
console.log('            --window-size=1400,900 --screenshot=sala-'+clave+'.png "file://'+out+'"');
