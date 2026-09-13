// Editor del guion: la historia y sus retos de lengua.
//
//   node tools/guion.js                    -> escribe tools/.guion.html
//   node tools/guion.js --catalogo         -> saca el catalogo por consola
//
// Escribes el guion como un esquema con sangrias (capitulo > mision > escena >
// tarea) y sale un JSON que ya tiene la forma de las estructuras del juego:
// cada mision exportada trae su entrada de MISIONES lista, y cada escena dice
// que personaje, en que sala y con que mecanica.
//
// El editor NO inventa personajes: saca de index.html los NPC con su sala, las
// salas con su nombre, los objetos y las misiones que ya existen. Asi no se
// puede escribir una escena con alguien que no esta en el juego.
//
// Lo que no quieras escribir tu, lo marcas como encargo ('Claude se encarga')
// con una nota de lo que quieres, y sale aparte en la lista de pendientes.
const fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..'), IDX=path.join(RAIZ,'index.html');

// Recorta el trozo de fuente entre dos marcas y lo deja cerrado por 'cierre'.
function bloque(src,ini,fin,cierre){
  const a=src.indexOf(ini); if(a<0) throw new Error('no encuentro '+ini);
  const b=src.indexOf(fin,a);
  const t=src.slice(a,b);
  return t.slice(0, t.lastIndexOf(cierre)+cierre.length);
}

function leerJuego(){
  const s=fs.readFileSync(IDX,'utf8');
  let INTERIORS,OUT_NPCS,ITEMS,MISIONES;
  eval(bloque(s,'const INTERIORS','//  EDIFICIOS','};').replace('const INTERIORS','INTERIORS'));
  eval(bloque(s,'const OUT_NPCS=[','//====','];').replace('const OUT_NPCS','OUT_NPCS'));
  eval(bloque(s,'const ITEMS = {','// --- GUARDADO','};').replace('const ITEMS','ITEMS'));
  eval(bloque(s,'const MISIONES={','function estadoMision','};').replace('const MISIONES','MISIONES'));
  return {INTERIORS,OUT_NPCS,ITEMS,MISIONES};
}

// ---------------------------------------------------------------- tratamiento
// A quien se trata de usted. El tratamiento es del personaje, no de la escena:
// asi se decide una vez y todas sus tareas lo heredan. Son solo sugerencias,
// en el editor se cambian a mano.
const TRATOS_USTED=/^(herr|frau|prof|profesor|profesora|dr|rektor|sor|signora|el director|doctorando|bedelin)\b/i;
const OFICIOS_USTED=/^(archivero|bibliotecari|conserje|cajera|cocinero|jardinero|joyera|librero|panadera|kioskera|optico|óptico|recepcionista|revisor|taquillero|tabernero|ujier|vendedor|jubilado|hausmeister|técnico|tecnico|entrenador|monitor|lector|parroquiano|dependient|barista|cafetera)/i;
function tratoSugerido(nombre){
  const n=nombre.trim();
  if(/^(estudiante|becari|novata|novato|ciclista|viajera|tutora)/i.test(n)) return 'tu';
  if(TRATOS_USTED.test(n) || OFICIOS_USTED.test(n)) return 'usted';
  if(/\b(señor|señora)\b/i.test(n)) return 'usted';
  return 'tu';   // por defecto, gente de la edad del jugador
}

// ------------------------------------------------------------------ catalogo
function catalogo(){
  const {INTERIORS,OUT_NPCS,ITEMS,MISIONES}=leerJuego();

  const salas=[{clave:'outdoor', nombre:'Campus (exterior)'}];
  for(const k in INTERIORS) salas.push({clave:k, nombre:INTERIORS[k].name||k});

  const npcs=[];
  const apunta=(n,sala,nombreSala)=>{
    npcs.push({
      id: sala+':'+n.name,
      nombre: n.name, sala, nombreSala,
      x: n.x, y: n.y,
      trato: tratoSugerido(n.name),
      // si ya tiene dialogo escrito en el juego, conviene saberlo antes de
      // encargarle una tarea: puede que ya diga algo que contradiga la escena
      tieneDialogo: !!(n.lines && n.lines.length),
      tieneOpciones: !!n.choice,
    });
  };
  OUT_NPCS.forEach(n=>apunta(n,'outdoor','Campus (exterior)'));
  for(const k in INTERIORS)
    (INTERIORS[k].npcs||[]).forEach(n=>apunta(n,k,INTERIORS[k].name||k));

  const objetos=Object.keys(ITEMS).map(id=>({
    id, nombre:ITEMS[id].name, tipo:ITEMS[id].type||'',
    sala:(ITEMS[id].spawn||{}).scene||'',
  }));

  const misiones=Object.keys(MISIONES).map(id=>({
    id, nombre:MISIONES[id].nombre, ic:MISIONES[id].ic||'',
    pasos:(MISIONES[id].pasos||[]).map(p=>({id:p.id,t:p.t})),
  }));

  // salas con dormitorio y demas banderas que conviene no pisar
  const dormitorios=Object.keys(INTERIORS).filter(k=>INTERIORS[k].dormitorio);

  return {salas, npcs, objetos, misiones, dormitorios,
          generado:new Date().toISOString()};
}

// ------------------------------------------------------------------- arranque
const cat=catalogo();

if(process.argv[2]==='--catalogo'){
  console.log(JSON.stringify(cat,null,2));
  process.exit(0);
}

const tpl=fs.readFileSync(path.join(__dirname,'guion-template.html'),'utf8');
const salida=path.join(__dirname,'.guion.html');
fs.writeFileSync(salida, tpl.replace('__CATALOGO__', ()=>JSON.stringify(cat)));

const conOpciones=cat.npcs.filter(n=>n.tieneOpciones).length;
const usted=cat.npcs.filter(n=>n.trato==='usted').length;
console.log(cat.npcs.length+' personajes ('+usted+' de usted, '+(cat.npcs.length-usted)+' de tu, '
  +conOpciones+' con menu de opciones) · '+cat.salas.length+' salas · '
  +cat.objetos.length+' objetos · '+cat.misiones.length+' misiones ya en el juego');
console.log('\nEditor listo:  '+salida);
console.log('Abrelo en el navegador:  file://'+salida);
