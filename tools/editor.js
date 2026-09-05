// Editor visual del mapa exterior.
//
//   node tools/editor.js                 -> escribe tools/.editor.html y lo abres en el navegador
//   node tools/editor.js --import x.json -> mete en index.html lo que hayas dibujado
//
// El editor saca el mapa que hay ahora mismo en index.html, lo pinta sobre una
// rejilla de 130x96 y deja cargar el boceto de fondo para calcarlo. Al terminar
// descarga un mapa.json que se vuelve a meter con --import.
const fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..'), IDX=path.join(RAIZ,'index.html');

// --- sacar un bloque 'const X = ...' de index.html y evaluarlo ---
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

// ====================== IMPORTAR ======================
if(process.argv[2]==='--import'){
  const f=process.argv[3];
  if(!f){ console.error('falta el archivo: node tools/editor.js --import mapa.json'); process.exit(1); }
  const d=JSON.parse(fs.readFileSync(f,'utf8'));
  let {s,BUILDINGS}=leer();

  // --- comprobaciones antes de tocar nada ---
  const errs=[], SOL='TtWoBNLr';
  const An=d.outdoor[0].length, Al=d.outdoor.length;
  d.outdoor.forEach((r,y)=>{ if(r.length!==An) errs.push('la fila '+y+' mide '+r.length+' y no '+An); });
  const vistas={};
  d.bld.forEach(b=>{
    if(!BUILDINGS[b.key]) errs.push("el edificio '"+b.key+"' no existe en BUILDINGS");
    if(b.x1<b.x0||b.y1<b.y0) errs.push(b.key+': rectangulo del reves');
    if(b.x0<0||b.y0<0||b.x1>=An||b.y1>=Al) errs.push(b.key+': se sale del mapa');
    [b.door].concat(b.extra||[]).forEach(q=>{
      const k=q[0]+','+q[1];
      if(vistas[k]) errs.push('la puerta ('+k+') la comparten '+b.key+' y '+vistas[k]);
      vistas[k]=b.key;
      if(d.outdoor[q[1]][q[0]]!=='D') errs.push(b.key+": la puerta ("+k+") no esta sobre 'D'");
      const dentro=q[0]>=b.x0&&q[0]<=b.x1&&q[1]>=b.y0&&q[1]<=b.y1;
      const pega=[[0,-1],[0,1],[-1,0],[1,0]].some(([ox,oy])=>{const x=q[0]+ox,y=q[1]+oy;
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
        [[0,-1],[0,1],[-1,0],[1,0]].forEach(([ox,oy])=>{ const nx=x+ox,ny=y+oy;
          if(nx<0||ny<0||nx>=An||ny>=Al)return; const k=nx+','+ny;
          if(vis.has(k)||SOL.includes(d.outdoor[ny][nx]))return; vis.add(k); pila.push([nx,ny]); }); }
      d.bld.forEach(b=>[b.door].concat(b.extra||[]).forEach(q=>{
        if(!vis.has(q[0]+','+q[1])) errs.push('no se llega andando a la puerta de '+b.key+' ('+q+')'); }));
    }
  }
  if(errs.length){ console.error('❌ No importo nada, hay que arreglar esto antes:\n· '+errs.join('\n· ')); process.exit(1); }

  // --- escribir los bloques ---
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

  // las 'salidas' de los interiores guardan la casilla exterior de cada puerta:
  // si la puerta se ha movido en el editor, hay que moverlas con ella
  const puertas={}; d.bld.forEach(b=>{
    const v=BUILDINGS[b.key];
    puertas[v.door.join(',')]=b.door;
    (v.extra||[]).forEach((q,i)=>{ if(b.extra&&b.extra[i]) puertas[q.slice(0,2).join(',')]=b.extra[i].slice(0,2); });
  });
  let movidas=0;
  s=s.replace(/at:\[(\d+),\s*(\d+)\]/g,(m,x,y)=>{
    const n=puertas[x+','+y];
    if(!n || (n[0]==+x && n[1]==+y)) return m;
    movidas++; return 'at:['+n[0]+','+n[1]+']';
  });

  fs.writeFileSync(IDX,s);
  console.log('✅ Importado: '+An+'x'+Al+', '+d.bld.length+' edificios, '+(d.decor||[]).length+' decorativos'
    + (movidas?', '+movidas+' salidas de interior recolocadas':''));
  console.log('   Abre index.html en el navegador: el validador te dira si queda algo suelto.');
  process.exit(0);
}

// ====================== GENERAR EL EDITOR ======================
const {OUTDOOR,BLD_GEO,BUILDINGS,DECOR_GEO}=leer();
// el editor necesita las 'extra' de BUILDINGS pegadas a cada BLD_GEO
const geo=BLD_GEO.map(b=>({...b, extra:(BUILDINGS[b.key]||{}).extra||b.extra}));
const carga={OUTDOOR,BLD_GEO:geo,DECOR_GEO};
const tpl=fs.readFileSync(path.join(__dirname,'editor-template.html'),'utf8');
const salida=path.join(__dirname,'.editor.html');
fs.writeFileSync(salida, tpl.replace('DATA_PLACEHOLDER', ()=>JSON.stringify(carga)));
console.log('Mapa actual: '+OUTDOOR[0].length+'x'+OUTDOOR.length+', '
  +BLD_GEO.length+' edificios, '+DECOR_GEO.length+' decorativos');
console.log('\nEditor listo:  ' + salida);
console.log('\nAbrelo en el navegador:  file://' + salida);
console.log('Cuando termines, descarga el mapa.json y metelo con:');
console.log('  node tools/editor.js --import ~/Descargas/mapa.json');
