// Variantes del español: que el juego no hable solo de una.
//
//   node tools/variantes.js              -> lo que hay que mirar
//   node tools/variantes.js --todo       -> tambien lo que su personaje tiene permitido
//   node tools/variantes.js --glosario   -> el glosario entero, para ampliarlo
//
// La voz de casa es el español general (ver CLAUDE.md). Una marca de variante
// solo se le perdona a quien la declara en su ficha con habla:'es-ES': asi la
// excepcion esta escrita y se puede comprobar, en vez de colarse sin que nadie
// se entere. Las marcas 'graves' no se le perdonan a nadie.
//
// Mira el texto que ve el jugador: dialogos, carteles, objetos, retos e
// interfaz. Los comentarios del codigo no, que esos son para nosotros.
const fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..'), IDX=path.join(RAIZ,'index.html');

//==================================================================
//  GLOSARIO
//  v      = a que variante pertenece la marca
//  alt    = que se pone en la norma base
//  por    = por que, cuando no es obvio
//  grave  = fuera de toda boca, aunque el personaje sea de esa variante
//  dudoso = puede ser falso positivo; se mira a mano antes de tocar nada
//==================================================================
// \b no vale aqui: para JavaScript una tilde no es letra, asi que en «dia
// por delante» ve un «a por» que no esta. Se cambia cada \b por una mirada
// lateral con el alfabeto entero, segun caiga a la izquierda o a la derecha.
const LETRA='A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1';
function conTildes(re){
  const s=re.source
    // un \b detras de algo que ya ha casado (letra, ], ), *, +, ?) cierra
    // por la derecha; los que quedan abren por la izquierda
    .replace(/(?<=[A-Za-z0-9\]\)\*\+\?\}\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1])\\b/g, '(?!['+LETRA+'])')
    .replace(/\\b/g, '(?<!['+LETRA+'])');
  return new RegExp(s, re.flags);
}

const GLOSARIO=[
  // --- lo que no se escribe nunca ---
  {v:'es-ES', grave:true, re:/\bc[oó]g(e|er|es|en|í|ió|ía|ido|ela|elo)[a-záéíóúñ]*\b|\bcoj[oa]n?\b/i,
   alt:'tomar / agarrar / sacar / llevarse',
   por:'malsonante en Mexico, Argentina, Uruguay, Venezuela y parte de Centroamerica'},

  // --- gramatica ---
  {v:'es-ES', re:/\bvosotros\b|\bvuestr[oa]s?\b|\bos\s+(vais|hab[eé]is|ten[eé]is|pod[eé]is|dais|veis|qued[aá]is|apunt[aá]is)\b/i,
   alt:'ustedes / de ustedes', por:'vosotros solo se usa en España'},
  {v:'es-ES', re:/\b(vais|ten[eé]is|pod[eé]is|quer[eé]is|sab[eé]is|hac[eé]is|est[aá]is|sois|hab[eé]is|ven[ií]s|dec[ií]s|viv[ií]s)\b/i,
   alt:'la forma de ustedes (van, tienen, pueden...)', por:'conjugacion de vosotros'},
  {v:'es-ES', re:/\ba por\b/i, alt:'ir por / ir a buscar', por:'fuera de España no se dice, y no se deduce'},

  // --- pragmatica de mostrador ---
  {v:'es-ES', re:/\bqu[eé]\s+(te|le)\s+pongo\b|\bme\s+pones\b|\bp[oó]n(me|le)\b/i,
   alt:'¿que te sirvo? / ¿que le doy? / ¿que va a llevar?'},
  {v:'es-ES', re:/\bmarchando\b/i, alt:'¡enseguida! / ¡va saliendo! / ¡ahi va!'},
  {v:'es-ES', re:/\b(me|te|le|nos|les)\s+apetec\w+|\bapetece\b/i,
   alt:'tener ganas de / ¿que va a tomar? / ¿que desea?'},

  // --- muletillas e interjecciones ---
  {v:'es-ES', re:/(^|[¡«,(]\s*)anda\b\s*[,!.…]/i, alt:'dale / vamos (o quitarlo, que muchas veces sobra)'},
  {v:'es-ES', re:/(^|[¡«,(]\s*)venga\b\s*[,!.…]/i, alt:'vamos / dale'},
  {v:'es-ES', re:/(^|[¡«\s(])vale\s*[,.!…]/, alt:'de acuerdo / esta bien / listo'},
  {v:'es-ES', re:/\bhala\b|\bostras\b|\bjol[ií]n\w*\b|\bjod[eo]r\b|\bhostia\b/i, alt:'vaya / uy / caramba'},
  {v:'es-ES', re:/\bqu[eé] va\b(?!\s+(incluid|con|a\s+ser))/, alt:'para nada / que no'},
  {v:'es-ES', re:/\ben plan\b|\bpues nada\b|\bni de co[ñn]a\b/i, alt:'como / bueno / ni loco'},
  {v:'es-ES', re:/\bmaj[ao]s?\b|\bguay\b|\bmola[ns]?\b|\bchul[ao]s?\b|\bcutre\w*\b|\bchung[ao]s?\b|\bflip\w+\b/i,
   alt:'simpatico / genial / feo'},
  {v:'es-ES', re:/\bcurr(ar|o|as|an)\b|\bmogoll[oó]n\b|\bde pelis\b/i, alt:'trabajar / trabajo / un monton'},
  {v:'es-ES', re:/\bhace[nr]?\s+ilusi[oó]n\b|\bno te cortes\b|\bhecho polvo\b/i,
   alt:'da gusto / con confianza / agotado'},

  // --- lexico ---
  {v:'es-ES', re:/\bordenador(es)?\b/i,   alt:'computadora / computador'},
  {v:'es-ES', re:/\bm[oó]vil(es)?\b/i,    alt:'celular'},
  {v:'es-ES', re:/\bpatatas?\b/i,         alt:'papas'},
  {v:'es-ES', re:/\bnevera\b/i,           alt:'refrigerador / heladera'},
  {v:'es-ES', re:/\bbocadillos?\b/i,      alt:'sandwich'},
  {v:'es-ES', re:/\bgafas\b/i,            alt:'lentes / anteojos'},
  {v:'es-ES', re:/\bzapatillas\b/i,       alt:'tenis / zapatillas deportivas'},
  {v:'es-ES', re:/\bsudaderas?\b|\bjersey(s)?\b/i, alt:'buzo / sueter'},
  {v:'es-ES', re:/\ba boli\b|\bbol[ií]grafos?\b/i, alt:'a mano / con lapicero'},
  {v:'es-ES', re:/\bfolios?\b/i,          alt:'hojas'},
  {v:'es-ES', re:/\bzumos?\b/i,           alt:'jugo'},
  {v:'es-ES', re:/\bgrifos?\b/i,          alt:'llave / canilla'},
  {v:'es-ES', re:/\bacera\b/i,            alt:'vereda / banqueta'},
  {v:'es-ES', re:/\baparca\w*\b/i,        alt:'estacionar'},
  {v:'es-ES', re:/\btiritas?\b/i,         alt:'curita'},
  {v:'es-ES', re:/\btartas?\b/i,          alt:'pastel / torta'},
  {v:'es-ES', re:/\bmelocot[oó]n\w*\b|\bjud[ií]as\b|\balbaricoque\w*\b/i, alt:'durazno / frijoles / damasco'},

  // --- de mirar a mano: la misma palabra significa otra cosa ---
  {v:'es-ES', dudoso:true, re:/\bt[ií]os?\b|\bt[ií]as?\b/i,
   alt:'quitarlo (o el apelativo del personaje)', por:'puede ser tio/tia de familia'},
  {v:'es-ES', dudoso:true, re:/\bbillete(s)?\b/i,
   alt:'boleto / pasaje', por:'si es billete de banco, se dice igual en todas partes'},
  {v:'es-ES', dudoso:true, re:/\bsellos?\b/i,
   alt:'estampilla / timbre', por:'el de correos si; el de sellar un papel, no'},
  {v:'es-ES', dudoso:true, re:/\bpisos?\b/i,
   alt:'departamento', por:'solo si es vivienda; la planta de un edificio es piso en todas partes'},
  {v:'es-ES', dudoso:true, re:/\bconduc(ir|e|es|en)\b/i,
   alt:'manejar', por:'conducir se entiende en casi todas partes'},
  {v:'es-ES', dudoso:true, re:/\bpasta\b(?!\s+de\s+dientes)/i,
   alt:'plata / dinero', por:'no si es la de comer o la de dientes'},
];

GLOSARIO.forEach(g=>{ g.crudo=String(g.re); g.re=conTildes(g.re); });

//==================================================================
//  LO QUE DICE CADA UNO
//  Para saber a quien perdonarle una marca hay que saber quien habla.
//  De los NPC sale por lectura del juego; de los retos, del 'npc' de
//  cada tarea, que es la misma clave 'sala:Nombre'.
//==================================================================
function bloque(src,ini,fin,cierre){
  const a=src.indexOf(ini); if(a<0) throw new Error('no encuentro '+ini);
  const b=src.indexOf(fin,a);
  const t=src.slice(a,b);
  return t.slice(0, t.lastIndexOf(cierre)+cierre.length);
}

function leerJuego(src){
  let INTERIORS,OUT_NPCS;
  eval(bloque(src,'const INTERIORS','//  EDIFICIOS','};').replace('const INTERIORS','INTERIORS'));
  eval(bloque(src,'const OUT_NPCS=[','//====','];').replace('const OUT_NPCS','OUT_NPCS'));
  return {INTERIORS,OUT_NPCS};
}

// texto -> quien lo dice, y con que habla declarada
function quienHabla(src){
  const {INTERIORS,OUT_NPCS}=leerJuego(src);
  const de={}, habla={};
  const apunta=(n,sala,nombreSala)=>{
    const clave=sala+':'+n.name;
    habla[clave]=n.habla||'';
    const mete=t=>{ if(typeof t==='string' && t.trim()) de[t]={clave, quien:n.name, sala:nombreSala}; };
    (n.lines||[]).forEach(mete);
    if(n.choice){
      mete(n.choice.q);
      (n.choice.opts||[]).forEach(o=>{ mete(o.t); (o.r||[]).forEach(mete); });
    }
    for(const k in (n.careerLine||{})) mete(n.careerLine[k]);
  };
  OUT_NPCS.forEach(n=>apunta(n,'outdoor','campus'));
  for(const k in INTERIORS){
    const nombre=INTERIORS[k].name||k;
    (INTERIORS[k].npcs||[]).forEach(n=>apunta(n,k,nombre));
    // carteles y muebles: no son de nadie, van en la norma base
    (INTERIORS[k].info||[]).forEach(o=>(o.lines||[]).forEach(t=>{
      if(typeof t==='string' && t.trim() && !de[t]) de[t]={clave:'', quien:o.name||'cartel', sala:nombre};
    }));
  }
  return {de, habla};
}

//==================================================================
//  EL TEXTO QUE VE EL JUGADOR
//  Un lexer pequeño, que una apostrofe dentro de un comentario ("que si
//  no") tumba a cualquier cosa hecha con una expresion regular suelta.
//==================================================================
function cadenasJS(l, st){
  const out=[]; let i=0;
  while(i<l.length){
    if(st.bloque){
      const f=l.indexOf('*/',i);
      if(f<0) return out;
      st.bloque=false; i=f+2; continue;
    }
    const c=l[i];
    if(c==='/' && l[i+1]==='/') return out;                 // resto de linea
    if(c==='/' && l[i+1]==='*'){ st.bloque=true; i+=2; continue; }
    if(c==='"' || c==="'" || c==='`'){
      let j=i+1, s='';
      while(j<l.length && l[j]!==c){
        if(l[j]==='\\'){ s+=(l[j+1]||''); j+=2; continue; }
        s+=l[j++];
      }
      if(j<l.length) out.push(s);
      i=j+1; continue;
    }
    i++;
  }
  return out;
}

function frases(src){
  const lineas=src.split('\n'), out=[];
  let modo='html', st={bloque:false}, tarea='', npcTarea='';
  lineas.forEach((l,i)=>{
    const n=i+1;
    if(/<style/.test(l))    modo='style';
    if(/<script/.test(l)){  modo='script'; st={bloque:false}; }
    if(modo==='style'){ if(/<\/style>/.test(l)) modo='html'; return; }
    if(modo==='html'){
      (l.match(/>([^<>]+)</g)||[]).forEach(t=>{
        const s=t.slice(1,-1).trim();
        if(s.length>2 && /[a-záéíóúñ]/i.test(s)) out.push({n, s, ui:true});
      });
      return;
    }
    if(/<\/script>/.test(l)) modo='html';
    // dentro de TAREAS cada reto dice de quien es; asi sus frases tienen dueño
    const mt=l.match(/^\s{2}([a-z_0-9]+)\s*:\s*\{/);
    if(mt){ tarea=mt[1]; npcTarea=''; }
    const mn=l.match(/npc\s*:\s*'([^']+)'/);
    if(mn) npcTarea=mn[1];
    cadenasJS(l, st).forEach(s=>{
      if(s.length<4 || !/[a-záéíóúñ]/i.test(s)) return;
      out.push({n, s, npcTarea});
    });
  });
  return out;
}

//==================================================================
//  INFORME
//==================================================================
const src=fs.readFileSync(IDX,'utf8');

if(process.argv.includes('--glosario')){
  GLOSARIO.forEach(g=>{
    const t=g.grave?'GRAVE ':(g.dudoso?'dudoso':'      ');
    console.log(t+'  '+g.v+'  '+g.crudo.slice(0,66));
    console.log('          -> '+g.alt+(g.por?'   ('+g.por+')':''));
  });
  process.exit(0);
}

const todo=process.argv.includes('--todo');
const {de, habla}=quienHabla(src);
const texto=frases(src);

const hits=[];
texto.forEach(f=>{
  const duenyo=de[f.s] || (f.npcTarea ? {clave:f.npcTarea, quien:f.npcTarea.split(':')[1], sala:''} : null);
  const suHabla=duenyo ? (habla[duenyo.clave]||'') : '';
  GLOSARIO.forEach(g=>{
    const m=f.s.match(g.re); if(!m) return;
    const perdonado = !g.grave && suHabla===g.v;
    if(perdonado && !todo) return;
    hits.push({...f, g, m:m[0].trim(), duenyo, perdonado});
  });
});

const orden=h=>h.g.grave?0:(h.g.dudoso?2:1);
hits.sort((a,b)=>orden(a)-orden(b) || a.g.alt.localeCompare(b.g.alt) || a.n-b.n);

console.log('\nVARIANTES DEL ESPAÑOL — index.html\n');
let ultima='';
hits.forEach(h=>{
  const cab=(h.g.grave?'[fuera de toda boca] ':(h.g.dudoso?'[mirar a mano] ':'['+h.g.v+'] '))+'-> '+h.g.alt;
  if(cab!==ultima){
    console.log('\n'+cab);
    if(h.g.por) console.log('   '+h.g.por);
    ultima=cab;
  }
  const quien=h.ui ? 'interfaz' : (h.duenyo ? h.duenyo.quien : '—');
  console.log('   '+String(h.n).padStart(5)+'  '+quien.slice(0,26).padEnd(27)+' '+
              '«'+h.m+'»  '+h.s.slice(0,64)+(h.s.length>64?'…':'')+
              (h.perdonado?'   (permitido: habla '+h.g.v+')':''));
});

// El preterito perfecto no es un error en ningun sitio: es una frecuencia.
// Se cuenta para tenerlo a la vista, no se señala frase por frase.
const perf=texto.filter(f=>/\b(he|has|ha|hemos|han)\s+[a-záéíóúñ]+(ado|ido|to|cho|so)\b/i.test(f.s)).length;
const conHabla=Object.keys(habla).filter(k=>habla[k]).length;
const g=hits.filter(h=>h.g.grave).length, d=hits.filter(h=>h.g.dudoso).length;

console.log('\n'+'-'.repeat(70));
console.log(hits.length+' marcas: '+g+' fuera de toda boca, '+(hits.length-g-d)+
            ' de norma, '+d+' de mirar a mano');
console.log(Object.keys(habla).length+' personajes, '+conHabla+' con habla declarada');
console.log(perf+' frases en preterito perfecto (ha escrito, has visto). No esta mal en');
console.log('  ninguna parte, pero es la frecuencia de España: en America seria');
console.log('  «escribio», «viste». En los retos no puede decidir entre acierto y fallo.');
process.exit(g?1:0);
