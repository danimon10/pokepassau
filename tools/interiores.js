// Editor visual de los interiores.
//
//   node tools/interiores.js                 -> escribe tools/.interiores.html
//   node tools/interiores.js --import x.json -> mete los cambios en index.html
//
// Saca las 84 salas de index.html y las deja editar sobre una rejilla, con las
// baldosas dibujadas con el drawInTile de verdad, para que lo que se ve en la
// herramienta sea lo que se vera jugando.
//
// Para cada sala dice por que LADO del edificio se entra desde el campus
// (norte, sur, este u oeste), que es el dato que hace falta para colocar las
// salidas donde toca.
//
// Baldosas nuevas: se piden por descripcion ("una alfombra roja gastada") y
// salen guardadas como encargo, con un caracter provisional. El dibujo lo hace
// despues una persona; el juego no las entiende hasta entonces.
const fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..'), IDX=path.join(RAIZ,'index.html');

function bloque(src,ini,fin,cierre){
  const a=src.indexOf(ini); if(a<0) throw new Error('no encuentro '+ini);
  const b=src.indexOf(fin,a);
  return src.slice(a,b).slice(0, src.slice(a,b).lastIndexOf(cierre)+cierre.length);
}
function leer(){
  const s=fs.readFileSync(IDX,'utf8');
  let INTERIORS,BUILDINGS,BLD_GEO;
  eval(bloque(s,'const INTERIORS','//  EDIFICIOS','};').replace('const INTERIORS','INTERIORS'));
  eval(bloque(s,'const BUILDINGS = {','for(const k in BUILDINGS)','};').replace('const BUILDINGS','BUILDINGS'));
  eval(bloque(s,'const BLD_GEO=[','BLD_BY_KEY','];').replace('const BLD_GEO','BLD_GEO'));
  return {s,INTERIORS,BUILDINGS,BLD_GEO};
}
const ladoPuerta=(b,d)=> d[1]<b.y0 ? 'norte' : d[1]>b.y1 ? 'sur' : (d[0]<b.x0 ? 'oeste' : 'este');

// ====================== IMPORTAR ======================
if(process.argv[2]==='--import'){
  const f=process.argv[3];
  if(!f){ console.error('falta el archivo: node tools/interiores.js --import salas.json'); process.exit(1); }
  const d=JSON.parse(fs.readFileSync(f,'utf8'));
  let {s,INTERIORS}=leer();
  const errs=[];

  (d.salas||[]).forEach(sa=>{
    const I=INTERIORS[sa.clave];
    if(!I){ errs.push("la sala '"+sa.clave+"' no existe"); return; }
    const an=sa.grid[0].length;
    sa.grid.forEach((r,y)=>{ if(r.length!==an) errs.push(sa.clave+': la fila '+y+' mide '+r.length+' y no '+an); });
    // lo que estaba cableado por coordenadas tiene que seguir dentro
    const fuera=(x,y)=> x<0||y<0||x>=an||y>=sa.grid.length;
    (I.doors||[]).forEach(q=>{ if(fuera(q.x,q.y)) errs.push(sa.clave+': la puerta ('+q.x+','+q.y+') se queda fuera de la rejilla nueva'); });
    (I.salidas||[]).forEach(q=>{ if(fuera(q.x,q.y)) errs.push(sa.clave+': la salida ('+q.x+','+q.y+') se queda fuera'); });
    (I.npcs||[]).forEach(q=>{ if(fuera(q.x,q.y)) errs.push(sa.clave+': el NPC '+(q.name||'')+' ('+q.x+','+q.y+') se queda fuera'); });
    for(const k in (sa.giros||{})){
      const [gx,gy]=k.split(',').map(Number);
      if(fuera(gx,gy)) errs.push(sa.clave+': el giro ('+k+') cae fuera de la rejilla nueva');
      const q=sa.giros[k];
      if(!Number.isInteger(q)||q<1||q>3) errs.push(sa.clave+': el giro ('+k+') vale '+q+', y tiene que ser 1, 2 o 3');
    }
  });
  if(errs.length){ console.error('❌ No importo nada:\n· '+errs.join('\n· ')); process.exit(1); }

  let n=0;
  (d.salas||[]).forEach(sa=>{
    // se sustituye solo el array 'grid' de esa sala, sin tocar el resto
    const ini=s.indexOf("  "+sa.clave+": {");
    if(ini<0){ errs.push('no localizo el bloque de '+sa.clave); return; }
    let a=s.indexOf('grid:[', ini), b=s.indexOf('],', a)+2;
    // si ya habia un bloque de giros pegado al grid, se sustituye con el
    const resto=s.slice(b);
    // ojo: entre el grid y los giros va la linea de comentario, hay que saltarla
    const mg=resto.match(/^(\s*(?:\/\/[^\n]*\n\s*)?giros:\{[^}]*\},?)/);
    if(mg) b+=mg[1].length;
    const giros=sa.giros||{};
    const claves=Object.keys(giros).filter(k=>giros[k]);
    const txtGiros = claves.length
      ? '\n    // cuartos de vuelta a mano: solo cambian el dibujo, no lo que se pisa\n'
        +'    giros:{'+claves.map(k=>"'"+k+"':"+giros[k]).join(', ')+'},'
      : '';
    const nuevo='grid:[\n'+sa.grid.map(r=>'      "'+r+'"').join(',\n')+'\n    ],'+txtGiros;
    s=s.slice(0,a)+nuevo+s.slice(b);
    n++;
  });
  // --- mover NPCs, carteles, puertas y salidas que hayan cambiado de sitio ---
  // Se toca solo el 'x:' e 'y:' de cada elemento, buscandolo por su campo
  // estable (el nombre, el destino o la baldosa exterior). Los dialogos y todo
  // lo demas se quedan intactos.
  let movidos=0; const noHallados=[];
  function mueve(claveSala, marca, nx, ny, que){
    const ini=s.indexOf("  "+claveSala+": {");
    const fin=s.indexOf("\n  },", ini);
    const tro=s.slice(ini,fin);
    const j=tro.indexOf(marca);
    if(j<0){ noHallados.push(claveSala+' · '+que); return; }
    // hacia atras hasta la llave que abre ese elemento
    const abre=tro.lastIndexOf('{', j);
    const cab=tro.slice(abre, j);
    const m=cab.match(/^\{\s*x:\s*(\d+)\s*,\s*y:\s*(\d+)/);
    if(!m){ noHallados.push(claveSala+' · '+que); return; }
    if(+m[1]===nx && +m[2]===ny) return;
    const nuevoCab='{x:'+nx+',y:'+ny+cab.slice(m[0].length);
    s=s.slice(0,ini+abre)+nuevoCab+s.slice(ini+abre+cab.length);
    movidos++;
  }
  (d.salas||[]).forEach(sa=>{
    (sa.npcs||[]).forEach(q=>{ if(q.nuevo||q.quitar) return;
      mueve(sa.clave,'name:'+JSON.stringify(q.name), q.x, q.y, 'NPC '+q.name); });
    (sa.info||[]).forEach(q=>{ if(q.nuevo||q.quitar) return;
      mueve(sa.clave,'name:'+JSON.stringify(q.name), q.x, q.y, 'cartel '+q.name); });
    (sa.doors||[]).forEach(q=>
      mueve(sa.clave,"to:'"+q.to+"'", q.x, q.y, 'puerta a '+q.to));
    (sa.salidas||[]).forEach(q=>
      mueve(sa.clave,'at:['+q.at+']', q.x, q.y, 'salida a ('+q.at+')'));
  });

  fs.writeFileSync(IDX,s);
  console.log('✅ Importadas '+n+' sala(s)'+(movidos?', '+movidos+' elemento(s) recolocado(s)':'')+'.');
  if(noHallados.length){
    console.log('\n⚠ No he sabido localizar en el archivo:');
    noHallados.forEach(t=>console.log('  · '+t));
  }

  // --- NPCs y carteles nuevos o por quitar: eso lo hago a mano ---
  const porHacer=[];
  (d.salas||[]).forEach(sa=>{
    (sa.npcs||[]).concat(sa.info||[]).forEach(q=>{
      const tipo=(sa.npcs||[]).includes(q)?'NPC':'objeto';
      if(q.nuevo)  porHacer.push('AÑADIR  '+tipo+" '"+q.name+"' en "+sa.clave+' ('+q.x+','+q.y+'): '+(q.desc||'(sin describir)'));
      if(q.quitar) porHacer.push('QUITAR  '+tipo+" '"+q.name+"' de "+sa.clave);
    });
  });
  if(porHacer.length){
    console.log('\n👥 Gente y objetos pendientes (llevan dialogo, se escriben a mano):');
    porHacer.forEach(t=>console.log('  · '+t));
  }

  const nuevas=d.baldosasNuevas||[], notas=d.notas||[];
  if(nuevas.length){
    console.log('\n📐 Baldosas nuevas por dibujar (llevan caracter provisional):');
    nuevas.forEach(b=>console.log('  · '+b.nombre+'  ['+b.ch+']  '+(b.desc||'(sin descripcion)')));
  }
  if(notas.length){
    console.log('\n✏️  Cambios pedidos sobre baldosas que ya existen:');
    notas.forEach(x=>console.log("  · '"+x.ch+"'  "+x.nota));
  }
  console.log('\nAbre index.html: el validador dira si queda algo suelto.');
  process.exit(0);
}

// ====================== GENERAR ======================
const {s,INTERIORS,BUILDINGS,BLD_GEO}=leer();
const GEO={}; BLD_GEO.forEach(b=>GEO[b.key]=b);

// --- por que lado del edificio se entra a cada sala desde el campus ---
const entradas={};                       // clave de sala -> [{lado, at, edificio, cual}]
for(const k in BUILDINGS){
  const B=BUILDINGS[k], g=GEO[k]; if(!g) continue;
  const mete=(sala,d,cual)=>{ (entradas[sala]=entradas[sala]||[])
    .push({lado:ladoPuerta(g,d), at:[d[0],d[1]], edificio:g.label, cual}); };
  if(B.interior) mete(B.interior, B.door, 'principal');
  (B.extra||[]).forEach((d,i)=> mete(d[2]||B.interior, d, 'entrada '+(i+2)));
}
// --- desde que otras salas se llega a cada una ---
const desde={};
for(const k in INTERIORS) (INTERIORS[k].doors||[]).forEach(q=>{
  if(!q.to) return; (desde[q.to]=desde[q.to]||[]).push(INTERIORS[k].name||k); });

// --- a que edificio pertenece cada sala (para agrupar la lista) ---
const grupo={};
for(const k in BUILDINGS){
  const B=BUILDINGS[k], et=(GEO[k]||{}).label||k;
  const pendiente=[B.interior].concat((B.extra||[]).map(d=>d[2]).filter(Boolean));
  const visto=new Set();
  while(pendiente.length){
    const c=pendiente.shift(); if(!c||visto.has(c)||grupo[c]) continue;
    visto.add(c); grupo[c]=et;
    (INTERIORS[c]?.doors||[]).forEach(q=>{ if(q.to) pendiente.push(q.to); });
  }
}

// --- el dibujo de verdad: drawInTile + su ayudante shade ---
const drawInTileSrc=bloque(s,'function drawInTile','//  ESTADO','}');
const shadeSrc=(s.match(/function shade\([\s\S]*?\n\}/)||[''])[0];

// --- leyenda sacada de los propios 'case' del dibujo ---
function leyenda(txt){
  const out=[]; const re=/case '((?:\\.|[^'])*)':(.*)/g; let m, pend=[];
  while((m=re.exec(txt))){
    const ch=m[1].replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
                 .replace(/\\(.)/g,'$1');
    const com=(m[2].match(/\/\/\s*(.+?)\s*$/)||[])[1];
    pend.push(ch);
    if(com){ pend.forEach(c=>out.push({ch:c, txt:com})); pend=[]; }
  }
  pend.forEach(c=>out.push({ch:c, txt:''}));
  return out;
}
const sw1=drawInTileSrc.indexOf('switch(t)');
const sw2=drawInTileSrc.indexOf('switch(t)', sw1+10);
const legPatio =leyenda(drawInTileSrc.slice(sw1, sw2));
const legNormal=leyenda(drawInTileSrc.slice(sw2));

// --- caracteres ya ocupados, para que las baldosas nuevas no pisen ninguno ---
const ocupados=new Set();
for(const k in INTERIORS) (INTERIORS[k].grid||[]).forEach(r=>[...r].forEach(c=>ocupados.add(c)));
legPatio.concat(legNormal).forEach(l=>ocupados.add(l.ch));
// se sale del ASCII a proposito: dentro ya no queda casi nada libre
const libres='áéíóúñçüöäßªºµ¶§¢£¥·¤¦¨©«¬®¯°±²³´¸¹»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ'
  .split('').filter(c=>!ocupados.has(c));

const salas={};
for(const k in INTERIORS){
  const I=INTERIORS[k];
  salas[k]={ name:I.name||k, grid:I.grid, giros:I.giros||{}, isPatio:!!I.isPatio,
             doors:(I.doors||[]).map((q,i)=>({id:'d'+i, x:q.x, y:q.y, to:q.to,
                     destino:(INTERIORS[q.to]||{}).name||q.to})),
             salidas:(I.salidas||[]).map((q,i)=>({id:'s'+i, x:q.x, y:q.y, at:q.at})),
             npcs:(I.npcs||[]).map((q,i)=>({id:'n'+i, x:q.x, y:q.y, name:q.name})),
             info:(I.info||[]).map((q,i)=>({id:'i'+i, x:q.x, y:q.y, name:q.name})),
             entradas:entradas[k]||[], desde:desde[k]||[], edificio:grupo[k]||'(suelto)' };
}
// --- en que cajon va cada baldosa, para no tener 71 sueltas en la paleta ---
const CAJONES=[
  ['Paredes',      '#=¦+'],
  ['Suelos',       '.rakbl-_:'],
  ['Mobiliario',   'msDcuteKBWLIPZx^$|H R N O Q T i v z M'.replace(/ /g,'')],
  ['Tiendas',      'o()/&%@,[{]}F`;'],
  ['Vegetacion',   'pg~h'],
  ['Exteriores',   'nqwdyjf<>'],
  ['Puertas y escaleras', "1234567890!?*ACJYGVSUXE"],
];
const CAJONES_PATIO=[
  ['Paredes',      '#mM'],
  ['Suelos',       'p.bgs['],
  ['Mobiliario',   'Fnk'],
  ['Vegetacion',   'oOa'],
  ['Puertas y escaleras', 'GXEQ45'],
];
function reparte(leg, cajones){
  const puesto=new Set(), out=[];
  cajones.forEach(([nom,chars])=>{
    const items=leg.filter(l=>chars.includes(l.ch) && !puesto.has(l.ch));
    items.forEach(l=>puesto.add(l.ch));
    if(items.length) out.push({nom, items});
  });
  const sobra=leg.filter(l=>!puesto.has(l.ch));
  if(sobra.length) out.push({nom:'Otras', items:sobra});
  return out;
}
const carga={salas, legPatio, legNormal, drawInTileSrc, shadeSrc, libres,
             cajones:reparte(legNormal,CAJONES), cajonesPatio:reparte(legPatio,CAJONES_PATIO)};

const tpl=fs.readFileSync(path.join(__dirname,'interiores-template.html'),'utf8');
const cuerpo=tpl.replace('__DATOS__', ()=>JSON.stringify(carga));
const salida=path.join(__dirname,'.interiores.html');
fs.writeFileSync(salida,
  '<!doctype html><html lang="es"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>html,body{margin:0}</style></head><body>'+cuerpo+'</body></html>');

console.log(Object.keys(salas).length+' salas · '+legNormal.length+' baldosas normales · '
  +legPatio.length+' de patio · '+libres.length+' caracteres libres para nuevas');
console.log('\nEditor listo:  '+salida);
console.log('Abrelo en el navegador:  file://'+salida);
