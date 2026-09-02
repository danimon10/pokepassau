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

`node tools/artifact.js` genera `uniquest.artifact.html`, la versión
publicable como Artifact. Los tres archivos de salida están en `.gitignore`.

## Mapa de `index.html`

Las secciones están marcadas con cabeceras `//====`. Las que más se tocan:

| Zona | Qué hay |
|---|---|
| `MAPA EXTERIOR` | la rejilla del campus como array de cadenas |
| `TIEMPO, DINERO Y MISIONES` | calendario, cartera, misiones y dormir |
| Leyenda interior | qué significa cada letra de las rejillas de sala |
| `INTERIORS` | las salas: 83 rejillas con sus puertas y NPCs |
| `EDIFICIOS` | qué puerta del exterior lleva a qué sala |
| `VALIDADOR DE MAPAS` | las comprobaciones de geometría y cableado |
| `MANDO TACTIL` | joystick flotante y botón A |
| `MOVIMIENTO` | `tryMove` / `updateMove` |

## Detalles que se olvidan

- **Las puertas no se pisan.** Te colocas delante y empujas hacia ellas (o
  pulsas A). La misma puerta sirve para entrar y salir.
- **El lienzo es de píxel entero.** `player.px/py` no puede quedar en medio
  píxel o el pixel art se emborrona. Para velocidades fraccionarias se
  acumula el sobrante entre fotogramas y se avanza por enteros.
- **El tacto del mando se ajusta en dos grupos de constantes**, sin tocar
  nada más: `JOY_*` (zona muerta, recorrido, histéresis, en fracciones del
  radio del aro) y `PASO_*` (velocidad al andar, en píxeles por fotograma).
  Si el usuario dice que va rápido en el móvil, el número es `PASO_NORMAL`.
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
  El mes son 14 días, el año 168 y la estación cambia cada 42.
- **Las misiones se avanzan con `cumplirPaso(mision, paso)`**, desde donde se
  cumplan. La misión se cierra sola cuando no le queda ningún paso suelto: no
  hay que marcarla como hecha a mano.
