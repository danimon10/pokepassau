// Editor visual del mapa exterior.
//
//   node tools/editor.js                 -> escribe tools/.editor.html y lo abres en el navegador
//   node tools/editor.js --import x.json -> mete en index.html lo que hayas dibujado
//
// Saca el mapa que hay ahora en index.html, lo pinta sobre la rejilla y deja
// cargar el boceto de fondo para calcarlo. La misma plantilla se publica como
// Artifact; alli se guarda en la nube y aqui se descarga un mapa.json.
//
// LAS PUERTAS. Cada edificio lleva un array 'puertas' con un id estable:
//   'main'  la principal (BUILDINGS[k].door)
//   'e<i>'  la i-esima entrada de mas de siempre (BUILDINGS[k].extra[i])
//   'n<n>'  una puerta nueva, anadida en el editor
// El id es lo que permite mover las puertas de sitio sin perderles la pista:
// las 'salidas' de los interiores guardan la baldosa EXTERIOR de cada entrada,
// y se recolocan casandolas por id, no por posicion en la lista.
const fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..'), IDX=path.join(RAIZ,'index.html');

function bloque(src,ini,fin,cierre){
  const a=src.indexOf(ini); if(a<0) throw new Error('no encuentro '+ini);
  const b=src.indexOf(fin,a);
  return src.slice(a,b).slice(0, src.slice(a,b).lastIndexOf(cierre)+cierre.length);
}
function leer(){
  const s=fs.readFileSync(IDX,'utf8');
  const bO=bloque(s,'const OUTDOOR=[','//  INTERIORES','];');
  const bG=bloque(s,'const BLD_GEO=[','BLD_BY_KEY','];');
  const bB=bloque(s,'const BUILDINGS = {','for(const k in BUILDINGS)','};');
  const bD=s.includes('const DECOR_GEO=[') ? bloque(s,'const DECOR_GEO=[','//====','];') : 'const DECOR_GEO=[];';
  let OUTDOOR,BLD_GEO,BUILDINGS,DECOR_GEO;
  eval(bO.replace('const OUTDOOR','OUTDOOR'));
  eval(bG.replace('const BLD_GEO','BLD_GEO'));
  eval(bB.replace('const BUILDINGS','BUILDINGS'));
  eval(bD.replace('const DECOR_GEO','DECOR_GEO'));
  return {s,OUTDOOR,BLD_GEO,BUILDINGS,DECOR_GEO};
}
// las puertas de un edificio, con su id estable
function puertasDe(B){
  const ps=[{id:'main', x:B.door[0], y:B.door[1], to:null}];
  (B.extra||[]).forEach((d,i)=> ps.push({id:'e'+i, x:d[0], y:d[1], to:d[2]||null}));
  return ps;
}

// ====================== IMPORTAR ======================
if(process.argv[2]==='--import'){
  const f=process.argv[3];
  if(!f){ console.error('falta el archivo: node tools/editor.js --import mapa.json'); process.exit(1); }
  const d=JSON.parse(fs.readFileSync(f,'utf8'));
  let {s,BUILDINGS}=leer();

  const errs=[], SOL='TtWoBNLr';
  const An=d.outdoor[0].length, Al=d.outdoor.length;
  d.outdoor.forEach((r,y)=>{ if(r.length!==An) errs.push('la fila '+y+' mide '+r.length+' y no '+An); });

  // normalizar: aceptamos el formato nuevo ('puertas') y el viejo (door/extra)
  d.bld.forEach(b=>{
    if(!b.puertas) b.puertas=puertasDe({door:b.door, extra:b.extra});
  });

  const vistas={};
  d.bld.forEach(b=>{
    if(!BUILDINGS[b.key]) errs.push("el edificio '"+b.key+"' no existe en BUILDINGS");
    if(b.x1<b.x0||b.y1<b.y0) errs.push(b.key+': rectangulo del reves');
    if(b.x0<0||b.y0<0||b.x1>=An||b.y1>=Al) errs.push(b.key+': se sale del mapa');
    if(!b.puertas.some(p=>p.id==='main')) errs.push(b.key+': se ha quedado sin puerta principal');
    b.puertas.forEach(p=>{
      const k=p.x+','+p.y;
      if(vistas[k]) errs.push('la puerta ('+k+') la comparten '+b.key+' y '+vistas[k]);
      vistas[k]=b.key;
      if(d.outdoor[p.y][p.x]!=='D') errs.push(b.key+": la puerta ("+k+") no esta sobre 'D'");
      const dentro=p.x>=b.x0&&p.x<=b.x1&&p.y>=b.y0&&p.y<=b.y1;
      const pega=[[0,-1],[0,1],[-1,0],[1,0]].some(([ox,oy])=>{const x=p.x+ox,y=p.y+oy;
        return x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1;});
      if(dentro) errs.push(b.key+': la puerta ('+k+') esta dentro del edificio');
      else if(!pega) errs.push(b.key+': la puerta ('+k+') no toca el edificio');
    });
  });
  // se llega andando a todas las puertas desde donde aparece el jugador
  const mSp=s.match(/let player=\{\s*x:(\d+),y:(\d+)/);
  const sp=mSp?[+mSp[1],+mSp[2]]:null;
  if(sp){
    if(SOL.includes(d.outdoor[sp[1]][sp[0]]))
      errs.push('el jugador aparece en ('+sp+'), que no se puede pisar');
    else{
      const vis=new Set([sp.join(',')]), pila=[sp];
      while(pila.length){ const [x,y]=pila.pop();
        [[0,-1],[0,1],[-1,0],[1,0]].forEach(([ox,oy])=>{ const nx=x+ox,ny=y+oy,k=nx+','+ny;
          if(nx<0||ny<0||nx>=An||ny>=Al||vis.has(k)||SOL.includes(d.outdoor[ny][nx]))return;
          vis.add(k); pila.push([nx,ny]); }); }
      d.bld.forEach(b=>b.puertas.forEach(p=>{
        if(!vis.has(p.x+','+p.y)) errs.push('no se llega andando a la puerta de '+b.key+' ('+p.x+','+p.y+')'); }));
    }
  }
  if(errs.length){ console.error('❌ No importo nada, hay que arreglar esto antes:\n· '+errs.join('\n· ')); process.exit(1); }

  // --- de 'puertas' a door + extra ---
  d.bld.forEach(b=>{
    const pr=b.puertas.find(p=>p.id==='main');
    b.door=[pr.x,pr.y];
    const ex=b.puertas.filter(p=>p.id!=='main').map(p=> p.to?[p.x,p.y,p.to]:[p.x,p.y]);
    b.extra = ex.length?ex:null;
  });

  const OUT='const OUTDOOR=[\n'+d.outdoor.map(r=>'"'+r+'"').join(',\n')+'\n];';
  const GEO='const BLD_GEO=[\n'+d.bld.map(b=>{
    const ex=b.extra?` extra:${JSON.stringify(b.extra)},`:'';
    return `  {key:'${b.key}',${' '.repeat(Math.max(1,9-b.key.length))}x0:${b.x0},y0:${b.y0}, x1:${b.x1},y1:${b.y1}, door:[${b.door}],${ex} style:'${b.style}', roof:'${b.roof}', label:'${b.label}'},`;
  }).join('\n')+'\n];';
  const BLD='const BUILDINGS = {\n'+d.bld.map(b=>{
    const B=BUILDINGS[b.key], ex=b.extra?', extra:'+JSON.stringify(b.extra):'';
    return `  ${b.key}:${' '.repeat(Math.max(1,9-b.key.length))}{name:${JSON.stringify(B.name)}, door:[${b.door}]${ex}, interior:'${B.interior}'},`;
  }).join('\n')+'\n};';
  const DEC='// Edificios de relleno: se dibujan, no se entran y no tienen interior.\n'+
            '// Para dejar el campus sin ellos, basta con vaciar este array.\n'+
            'const DECOR_GEO=[\n'+(d.decor||[]).map(b=>{
    const bus=b.buses?' buses:true,':'';
    return `  {x0:${b.x0},y0:${b.y0}, x1:${b.x1},y1:${b.y1},${bus} style:'${b.style}', roof:'${b.roof}', decor:true},`;
  }).join('\n')+'\n];';

  const sust=(ini,fin,cierre,txt)=>{
    const a=s.indexOf(ini), b=s.indexOf(fin,a);
    s=s.slice(0,a)+txt+s.slice(s.lastIndexOf(cierre,b)+cierre.length);
  };
  sust('const OUTDOOR=[','//  INTERIORES','];',OUT);
  sust('const BUILDINGS = {','for(const k in BUILDINGS)','};',BLD);
  sust('const BLD_GEO=[','BLD_BY_KEY','];',GEO);
  if(s.includes('const DECOR_GEO=[')) sust('// Edificios de relleno','//====','];',DEC);

  // --- recolocar las 'salidas' de los interiores, casando por id ---
  // (una puerta movida arrastra consigo la baldosa donde aparece el jugador al salir)
  const cambio={};
  d.bld.forEach(b=>{
    const viejas=puertasDe(BUILDINGS[b.key]);
    viejas.forEach(v=>{
      const n=b.puertas.find(p=>p.id===v.id);
      if(n && (n.x!==v.x || n.y!==v.y)) cambio[v.x+','+v.y]=[n.x,n.y];
    });
  });
  let movidas=0;
  s=s.replace(/at:\[(\d+),\s*(\d+)\]/g,(m,x,y)=>{
    const n=cambio[x+','+y];
    if(!n) return m;
    movidas++; return 'at:['+n[0]+','+n[1]+']';
  });

  fs.writeFileSync(IDX,s);
  console.log('✅ Importado: '+An+'x'+Al+', '+d.bld.length+' edificios, '+(d.decor||[]).length+' decorativos'
    + (movidas?', '+movidas+' salidas de interior recolocadas':''));

  // puertas nuevas: entran, pero al salir dejan al jugador en la salida principal
  // hasta que se les abra su propio hueco dentro de la sala
  const nuevas=[];
  d.bld.forEach(b=>b.puertas.forEach(p=>{
    if(/^n\d+$/.test(p.id)) nuevas.push('  · '+b.key+' ('+b.label+') en ('+p.x+','+p.y+')'); }));
  if(nuevas.length){
    console.log('\n⚠ Puertas nuevas, todavia sin salida propia dentro de su sala:');
    console.log(nuevas.join('\n'));
    console.log('  Se entra por ellas, pero al salir el jugador aparece en la puerta');
    console.log("  principal. Hay que dibujarles una salida en el interior y anadirle");
    console.log("  su entrada en 'salidas'.");
  }
  console.log('\nAbre index.html en el navegador: el validador dira si queda algo suelto.');
  process.exit(0);
}

// ====================== GENERAR EL EDITOR ======================
const {OUTDOOR,BLD_GEO,BUILDINGS,DECOR_GEO}=leer();
const geo=BLD_GEO.map(b=>{
  const B=BUILDINGS[b.key]||{};
  return {...b, nombre:B.name||b.key, puertas:puertasDe({door:b.door, extra:B.extra||b.extra})};
});
const s=fs.readFileSync(IDX,'utf8');
const mSp=s.match(/let player=\{\s*x:(\d+),y:(\d+)/);
const carga={OUTDOOR, BLD_GEO:geo, DECOR_GEO, spawn: mSp?[+mSp[1],+mSp[2]]:null};

const tpl=fs.readFileSync(path.join(__dirname,'editor-template.html'),'utf8');
const cuerpo=tpl.replace('__DATOS__', ()=>JSON.stringify(carga));
// la plantilla es la misma que se publica como Artifact (solo el cuerpo);
// para abrirla como archivo suelto le ponemos el envoltorio
const salida=path.join(__dirname,'.editor.html');
fs.writeFileSync(salida,
  '<!doctype html><html lang="es"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>html,body{margin:0}</style></head><body>'+cuerpo+'</body></html>');

const nP=geo.reduce((n,b)=>n+b.puertas.length,0);
console.log('Mapa actual: '+OUTDOOR[0].length+'x'+OUTDOOR.length+', '
  +BLD_GEO.length+' edificios, '+nP+' puertas, '+DECOR_GEO.length+' decorativos');
console.log('\nEditor listo:  ' + salida);
console.log('Abrelo en el navegador:  file://' + salida);
console.log('Cuando termines, descarga el mapa.json y metelo con:');
console.log('  node tools/editor.js --import mapa.json');
