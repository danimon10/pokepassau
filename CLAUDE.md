# Notas para Claude — Campus Passau · Uni·Quest

## Qué es esto

Un juego web estilo Pokémon sobre el campus de la Universidad de Passau.
**Todo vive en `index.html`**: no hay build, ni `package.json`, ni
dependencias. Se abre el archivo en el navegador y ya está. Los `tools/*.js`
son utilidades sueltas de Node que se ejecutan a mano, no parte del juego.

Idioma: **castellano en todo** — interfaz, diálogos, comentarios del código,
mensajes de commit y descripciones de PR. Los comentarios del código van casi
siempre **sin tildes** (una de cada siete las lleva, casi todas en las
cabeceras de sección); se sigue lo que haya alrededor.

## Cómo trabajamos

**Los retoques se acumulan en una rama, no uno por PR.** Cuando el usuario
pide varios ajustes seguidos sobre lo mismo (afinar un control, cambiar una
sala), van todos a la misma rama y se le avisa cuando el conjunto está listo
para mergear. Antes se abría un PR por cada ajuste y se quedaban descolgados
en cuanto él mergeaba el anterior.

Si el PR de la rama ya está mergeado y hay trabajo nuevo: rehacer la rama
sobre `main` (`git fetch origin main && git rebase origin/main`) y abrir un
PR **nuevo**. Nunca apilar sobre historia ya mergeada.

## Antes de dar algo por bueno

1. **Comprobar la sintaxis.** No hay linter. Extraer el `<script>` y pasarle
   `node --check` es la forma rápida de no publicar un archivo roto.
2. **Mirar el validador.** `validateMaps()` se ejecuta solo al cargar la
   página y saca un **banner rojo** sobre el juego si hay geometría o puertas
   mal. Los errores salen por consola; los avisos, solo por consola. Se puede
   relanzar a mano desde la consola del navegador.
3. **Probarlo de verdad en un navegador**, no solo leer el diff. Si el
   entorno trae Chromium y Playwright, se automatiza; si no, hay que decirlo
   en vez de dar por bueno lo que no se ha visto correr. Para el mando táctil
   hacen falta eventos táctiles reales: `page.touchscreen` no vale para
   varios dedos, hay que usar CDP (`Input.dispatchTouchEvent`) con una sesión
   `newCDPSession`. Probar en vertical (390×844) y horizontal (844×390) con
   `hasTouch: true`.

## Al tocar el mapa

`plano-campus-passau.png` está versionado y **se genera desde el propio
`index.html`**, así que hay que regenerarlo y commitearlo cada vez que cambia
el mapa, o imagen y código se desincronizan:

```sh
node tools/plano.js     # escribe tools/.plano-render.html e imprime el
                        # comando de Chromium para capturar el PNG
```

Para rediseñar una sala interior concreta hay una utilidad parecida, que
dibuja la rejilla con coordenadas encima:

```sh
node tools/sala.js <clave> [x0,y0,x1,y1,"etiqueta"]
```

**Para rehacer el reparto del campus, el editor visual.** Colocar edificios y
calles a ojo desde un boceto no sale bien; para eso está:

```sh
node tools/editor.js                  # escribe tools/.editor.html
node tools/editor.js --import x.json  # mete lo dibujado en index.html
```

Se abre en el navegador, carga el mapa que hay ahora, deja poner un boceto de
fondo para calcarlo y pinta casillas y edificios con el ratón. Al importar
comprueba lo mismo que el validador **y además** que desde donde aparece el
jugador se llega andando a todas las puertas; si algo falla no toca
`index.html`. También recoloca solo las `salidas` de los interiores.

**Para rediseñar interiores, el editor de salas.** Igual que el del mapa, pero
para las 84 rejillas de `INTERIORS`:

```sh
node tools/interiores.js                  # escribe tools/.interiores.html
node tools/interiores.js --import x.json  # mete las rejillas en index.html
```

Dibuja cada sala con el `drawInTile` de verdad, así que se ve lo que se verá
jugando, y para cada sala dice **por qué lado del edificio se entra desde el
campus** (norte, sur, este u oeste), que es el dato para colocar la salida en
el muro que toca. Las baldosas se pueden **girar** en cuartos de vuelta, y se
pueden **mover** las puertas, las salidas, los NPCs y los objetos de la sala,
que si no se quedan en sus coordenadas viejas al rediseñarla. También deja
**repintar la pared y el suelo** de cada sala, con siete combinaciones ya
hechas o con el selector de color. Deja pedir **baldosas nuevas por
descripción**: se guardan
como encargo con un carácter provisional y el dibujo se hace después a mano;
la gente y los objetos nuevos van igual, porque llevan diálogo.
Al importar toca el `grid`, los `giros`, el `tinte` y las coordenadas de lo
que se haya movido, y rechaza el cambio si una puerta, una salida o un NPC se
quedaría fuera de la rejilla nueva.

## Para escribir la historia, el editor de guion

La trama y sus retos de lengua no se escriben a mano en `index.html`: se
escriben en un esquema y de ahí sale un JSON con la forma que ya usa el juego.

```sh
node tools/guion.js              # escribe tools/.guion.html
node tools/guion.js --catalogo   # saca por consola lo que sabe del juego
```

Lee `index.html` cada vez que se genera, así que **conoce el juego**: los 164
personajes con la sala en la que están, las 85 salas, los objetos y las
misiones que ya existen. Escribir una escena con alguien que no está en el
juego es imposible: los nombres salen de una lista, no se teclean.

Lo que hay que saber para usarlo:

- **Se escribe como un esquema**, con `Enter` y `Tab`. Las categorías salen
  escribiendo sus primeras letras (`mis`, `esc`, `tar`, `dice`, `opc`…) y
  `Tab`; la gente, con `@nombre`.
- **El orden es capítulo › misión › escena › tarea**, y cada categoría solo
  puede colgar de las que le corresponden. El árbol no vive en la sangría: al
  exportar, cada fila lleva escrito su padre.
- **La mecánica y la función son dos ejes distintos.** Cómo se valida
  (elegir, hueco, ordenar, abierta…) no es lo mismo que qué se practica
  (saludar, pedir un favor, reclamar…). Un saludo puede pedirse de cualquiera
  de las cinco maneras.
- **El tratamiento es del personaje, no de la escena.** Se decide una vez y
  todas sus tareas lo heredan. `tools/guion.js` lo propone a partir del
  nombre (Herr, Frau, un oficio → usted; estudiante → tú).
- **Huecos:** `{correcta|falsa|falsa}` para el desplegable y
  `{=vale|también|así}` cuando se escribe y se aceptan varias formas.
- **En las tareas abiertas, el NPC repregunta; no puntúa.** Cada elemento de
  la rúbrica se escribe `nombre: sinónimos >> lo que pregunta el NPC si
  falta`. Así, una formulación buena que no se haya previsto cuesta una
  pregunta de más, no un suspenso; sin ese `>>` el personaje solo sabe
  rechazar, y la revisión lo avisa. Los elementos que se repiten en muchas
  tareas (saludo, cortesía, agradecimiento…) se marcan con una casilla en vez
  de reescribir los sinónimos en cada personaje.
- **`✦ Claude se encarga`** marca una fila como encargo: se apunta qué se
  quiere y esa línea sale en la lista de pendientes en vez de bloquear la
  revisión. El botón «Encargos a Claude» saca esa lista con el contexto de
  cada una (personaje, sala, tratamiento, mecánica, nivel) lista para pegar.
- **«Revisar» dice lo que impediría aplicarlo** sin preguntar nada: escenas
  sin personaje, tareas sin mecánica, una tarea abierta sin rúbrica, dos
  tareas colgando de la misma escena, prerrequisitos en círculo.
- El JSON exportado trae, por cada misión, su entrada de `MISIONES` ya hecha
  (`juego:{nombre, ic, desc, pista, pasos, premio}`), y guarda también el
  esquema en crudo para poder volver a importarlo.
- Importa el formato del editor viejo: traduce los tipos a los dos ejes y
  separa los «Distractores» que en realidad eran la reacción del NPC al fallo.

**Hay una copia publicada como Artifact** («Guion de Uni·Quest»), que es la
que el usuario usa de verdad porque es un enlace y no hay que ejecutar nada.
Allí el guion **se guarda en el servidor**, troceado en `guion/p0…pN` con un
`guion/indice`, así que se puede leer con `read_db` sin que él exporte nada;
abierto como archivo suelto no hay `window.claude` y queda `localStorage`.
Como el Artifact es una copia congelada, **lleva el catálogo del día en que se
publicó**: si se mueven o se renombran NPCs en `index.html`, hay que volver a
generarlo y republicarlo en *ese mismo* Artifact, igual que pasa con el juego.

`node tools/artifact.js` genera `uniquest.artifact.html`, la versión
publicable como Artifact. Los archivos de salida están en `.gitignore`.

**El juego publicado no se actualiza solo.** El usuario juega en el Artifact
«Uni·Quest Passau», que es una copia congelada de `index.html`; mergear en
`main` no la toca. Cada vez que se merge algo que se note jugando, hay que
regenerarlo y republicarlo en **ese mismo** Artifact, o él seguirá viendo el
juego viejo y creerá que los cambios no llegaron.

## Mapa de `index.html`

Las secciones están marcadas con cabeceras `//====`. Las que más se tocan:

| Zona | Qué hay |
|---|---|
| `MAPA EXTERIOR` | la rejilla del campus como array de cadenas |
| `TIEMPO, DINERO Y MISIONES` | calendario, cartera, misiones y dormir |
| `TAREAS DE LENGUA` | los retos del guion y el motor que los juega |
| Leyenda interior | qué significa cada letra de las rejillas de sala |
| `INTERIORS` | las salas: 83 rejillas con sus puertas y NPCs |
| `EDIFICIOS` | qué puerta del exterior lleva a qué sala |
| `VALIDADOR DE MAPAS` | las comprobaciones de geometría y cableado |
| `MANDO TACTIL` | joystick flotante y botón A |
| `MOVIMIENTO` | `tryMove` / `updateMove` |

## Detalles que se olvidan

- **Las puertas no se pisan.** Te colocas delante y empujas hacia ellas (o
  pulsas A). La misma puerta sirve para entrar y salir.
- **A las personas se les habla desde cerca, no pegado.** `RADIO_NPC` (en
  `INTERACCIÓN`) son los pasos —**andando**, no en línea recta— a los que se
  puede hablar con alguien: `npcCerca()` va abriendo anillos por casillas
  libres, así que una pared no deja conversar al otro lado. **Un mostrador
  sí:** al topar con un mueble de `ASOMABLES` (barras, escritorios, mesas y
  asientos) se mira quién hay justo detrás en línea recta, que es como se
  habla con quien atiende un bar, una tienda o un despacho. Las estanterías,
  las máquinas y los armarios no son de asomarse, y en el claustro
  (`patioMode`) las letras significan otra cosa: allí solo el banco. Si
  dentro del radio hay **más de una persona el radio se apaga** y hay que
  ponerse delante de quien sea, que elegir por el jugador sería adivinar. El
  aviso `!` salta sobre la persona a la que llega el radio, y desaparecer es
  justo la señal de que hay dos y toca acercarse. Puertas y objetos siguen
  pidiendo estar justo enfrente.
- **El vector de entrada** afina esa puntería: si chocas contra el muro (o la
  arboleda) que hay justo al lado de una abertura y sigues empujando hacia
  ella, el personaje se desliza una casilla y cruza. Distingue lo que
  **encierra** de lo que solo **amuebla** con los conjuntos `ESTRUCTURA_*`,
  aparte de los `SOLID_*` de siempre: contra una mesa, una farola o el agua no
  hace nada. Con los árboles no basta la letra, porque el mapa usa la misma
  para el linde y para el que está suelto en el césped: `arboleda()` lo decide
  mirando si tiene otro árbol al lado. Si hay abertura a los dos lados
  tampoco pasa nada, que elija el jugador.
- **El lienzo es de píxel entero.** `player.px/py` no puede quedar en medio
  píxel o el pixel art se emborrona. Para velocidades fraccionarias se
  acumula el sobrante entre fotogramas y se avanza por enteros.
- **El tacto del mando se ajusta en dos grupos de constantes**, sin tocar
  nada más: `JOY_*` (zona muerta, recorrido, histéresis, en fracciones del
  radio del aro) y `CASILLAS_*` (velocidad al andar, **en casillas por
  segundo**, tal como se nota al jugar). Si el usuario dice que va rápido en
  el móvil, el número es `CASILLAS_NORMAL`: se pone la cifra que pida, sin
  convertir nada. Vale cualquier valor, no solo los múltiplos de 60/n: el
  acumulador de píxeles guarda el sobrante también al cambiar de casilla.
- **Mientras se escribe, el teclado no es del juego.** El correo, los
  documentos y el cuaderno llevan `<input>` y `<textarea>` de verdad; los
  manejadores de teclado se saltan el evento con `escribiendo(e)` para no
  tragarse el espacio ni las flechas.
- **El guardado tolera fallos:** `localStorage` con respaldo en memoria, por
  si el navegador lo tiene bloqueado.
- **Las escenas automáticas** (escaleras) mueven al jugador solas con
  `guion`, sin pasar por `tryMove`. Lo que cambie del movimiento hay que
  comprobarlo también ahí.
- **El dinero va en céntimos**, siempre enteros: 1,20 € son `120`. Se cobra
  poniéndole `precio` a una opción de diálogo, nunca restando a mano; así el
  botón enseña el precio, se apaga si no llega y la compra cuenta para las
  misiones. Con `fn` la opción ejecuta algo al cerrarse el cuadro.
- **El día solo pasa durmiendo.** La cama (`'`) de la sala marcada con
  `dormitorio:true` es el único reloj del juego: no hay horas ni minutos.
  El mes son 7 días (lunes a domingo), el año 84, y la estación cambia con el
  mes. Las fechas que se escriban en diálogos y carteles tienen que caer entre
  el 1 y el 7: un «15 de octubre» ya no existe.
- **La estación se pinta, no se mapea.** Los colores del exterior salen de
  `PALETAS[estación]` a través de `PAL`; el mapa no cambia. Si tocas un color
  de `drawOutTile`, ponlo en las cuatro paletas, no como literal. Verano es la
  de siempre: cualquier cambio ahí se nota en el juego que ya existía.
- **Las misiones se avanzan con `cumplirPaso(mision, paso)`**, desde donde se
  cumplan. La misión se cierra sola cuando no le queda ningún paso suelto: no
  hay que marcarla como hecha a mano. Una misión con `prereq:['otra','otra']`
  se abre sola en cuanto están hechas todas las que espera (`abrirPorPrereq`),
  que es lo que en el editor del guion son los prerrequisitos: la historia
  avanza sin que ningún diálogo tenga que activar nada.
- **Los retos de lengua viven en `TAREAS`**, no en el NPC. Cada tarea dice a
  quién pertenece con la misma clave que usa el editor del guion
  (`'sala:Nombre'`), así que añadir una **no toca `INTERIORS`**: `startNPC`
  pregunta por `tareaDe(npc)` y, si su misión está activa y su paso suelto,
  abre el reto en vez de la charla de siempre; cuando ya está hecho, sus
  líneas de `despues` se añaden a lo que decía normalmente.
  La mecánica `single` se apoya en el `choice` del cuadro de diálogo de
  siempre, con las opciones barajadas. **Al fallar el cuadro no se cierra:**
  la persona contesta y vuelve a preguntar, y del segundo intento en adelante
  con la pista delante. Eso vale para todas las tareas cerradas; las abiertas
  (rúbrica) todavía no están hechas.
- **Las frases de una tarea `single` tienen que caber en un botón.** El cuadro
  de diálogo da para unos 40 caracteres por opción en una línea; si la frase
  del guion es más larga, se parte: la primera mitad va en la `consigna` y la
  elección se queda con lo que de verdad se está practicando.
- **Mover el mapa exterior toca más sitios de los que parece.** Además de
  `OUTDOOR`, `BUILDINGS` y `BLD_GEO` hay coordenadas absolutas del campus en:
  `OUT_NPCS`, el `player` inicial, el `spawn` de los objetos con
  `scene:'outdoor'`, la casilla de arranque que usa el validador para
  comprobar que se llega a los objetos, y las `salidas:[{at:[x,y]}]` de los
  interiores con dos entradas (`niko_patio`, `ekz1`, `ekz2`), que guardan la
  baldosa exterior donde aparece el jugador al salir. Si se olvidan, el
  jugador acaba dentro de un edificio o en el agua.
- **Cada entrada se dibuja en su lado** (`ladoPuerta` + `drawDoorAndSign`):
  al sur la hoja entera sobre la fachada, al este y al oeste una hoja
  estrecha en ese costado, y al norte solo una marca discreta en el borde
  del tejado, porque la puerta queda detrás del edificio. El cartel con las
  siglas va siempre al frente, aunque se entre por detrás.
- **Un edificio con más de una entrada necesita una salida por entrada
  dentro de su sala.** Se dibuja una casilla `X`/`E`/`U` en el muro que
  toque y se apunta en `salidas:[{x,y,at:[X,Y]}]`, donde `at` es la baldosa
  exterior. Si una salida no está en `salidas`, se sale por la principal.
  Solo puede quedar **una** salida suelta (sin entrada en `salidas`).
- **La cara de cada NPC sale de su nombre** (`aspectoNPC`): piel, color y
  corte de pelo salen de un revoltijo del nombre, y el genero del
  tratamiento, del oficio o de las listas `N_ELLA`/`N_EL`. Asi no hay que
  escribir 157 aspectos a mano. Cuando un personaje concreto tiene que ser
  de una manera, se le pone `aspecto:{pelo,corte,piel}` y eso manda sobre el
  nombre; los colores de pelo tienen nombre en `PELO` (rubio, cobrizo,
  rojizo...). Un nombre nuevo que no diga el genero se echa a suertes, asi
  que si importa, va a su lista.
- **El color de una sala se cambia con `tinte:{pared,suelo}`**, no con
  baldosas nuevas. `TINTABLES` apunta, de cada color de obra y de solado, de
  que base sale y cuanto se le sube o se le baja **canal a canal**, asi que
  con la base de siempre salen los colores exactos de siempre y ninguna sala
  sin tinte cambia. La escalera va con la pared, porque es obra; la madera, el
  vidrio, las plantas y los suelos con caracter propio (recepcion, aula,
  oficina, banos) no se tocan. Si anades un color de pared o de suelo a
  `drawInTile`, apuntalo en `TINTABLES` o esa sala se quedara a medio pintar.
- **Las baldosas de interior se pueden girar a mano** con `giros:{'x,y':1|2|3}`
  en la sala (cuartos de vuelta a la derecha). Es **solo el dibujo**: la letra
  de la rejilla no cambia, así que lo que se pisa y lo que no, tampoco. Es
  aparte del giro automático de la escalera y el mostrador (`marcarGiradas`),
  que sale de la forma del tramo. El giro se pinta con una **matriz de
  enteros**, no con `ctx.rotate()`: el coseno de 90° no sale exacto en coma
  flotante y el pixel art se emborrona.
- **Los muros se rematan solos** (`MURO` + `marcarLineas`): `#`, `=` y `¦`
  miran a sus vecinos y solo dibujan la cornisa arriba y la sombra abajo por
  donde quedan a la vista, así que un tramo largo sale liso y las esquinas
  —externas e internas— se cierran sin baldosas de esquina. Un muro de vidrio
  pegado a uno de obra hace esquina con él.
- **El peldaño cableado de una escalera es donde está su puerta.** Un tramo
  de `S`/`V`/`U` solo funciona si la casilla de la puerta es exactamente `V`:
  `activarPuerta` busca dentro del tramo un `doors` que caiga sobre una `V`.
  Al repintar una escalera se pierde muy fácil, así que el editor la recoloca
  sola bajo la puerta y deja el resto del tramo en `S`.
- **Las escaleras no guardan a dónde llegan.** `escaleraDe(destino, origen)`
  busca en la sala de destino la `V` cableada de vuelta y, si no la hay, la
  primera `V` o `U`. Así que basta con que cada planta tenga su escalera: se
  encuentran solas y se pueden mover libremente. Si el destino se queda sin
  ninguna, el jugador aparece en `(1,1)`.
- **`DECOR_GEO` son edificios que se dibujan pero no se entran**: sin puerta,
  sin cartel y sin interior, y el validador no los mira porque no están en
  `BUILDINGS`. Sirven para llenar la ciudad de fondo; se vacía el array y
  desaparecen.
