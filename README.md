# Campus Passau — Uni·Quest

Juego web de un solo archivo (`index.html`): un campus de Passau explorable
estilo Pokémon, con mapa exterior, interiores de edificios y NPCs.

## Plano del campus

`plano-campus-passau.png` es el plano del mapa exterior con rejilla y
coordenadas, pensado para abrirlo en Paint y dibujar encima los cambios.
Incluye la leyenda de piezas de interior para diseñar salas nuevas.

Está versionado, así que basta con descargarlo del repositorio para tener la
última versión. Se genera a partir del propio `index.html`, de modo que se
regenera —y se vuelve a commitear— cada vez que cambia el mapa, para que la
imagen y el código nunca se desincronicen.

Para regenerarlo hacen falta Node.js y Chromium:

```sh
node tools/plano.js                 # genera tools/.plano-render.html
# y luego captura el PNG con el comando que imprime el script
```

## Validador de mapas

Al abrir `index.html` se ejecuta `validateMaps()`, que revisa la geometría de
cada sala y el cableado de cada puerta. Los errores salen por consola y en un
banner rojo sobre el juego; los avisos solo por consola. Se puede relanzar a
mano desde la consola del navegador:

```js
validateMaps()
```

Comprueba, entre otras cosas: que todas las filas de un mapa midan lo mismo,
que cada puerta exterior esté sobre una casilla `D`, que cada puerta interior
tenga un destino existente y una casilla de llegada pisable, que ninguna sala
se quede sin salida y que los edificios no se solapen.

## Objetos

Por el campus hay objetos sueltos que se recogen con el botón de acción,
poniéndose delante (o encima) y pulsando. Van a la mochila —tecla `I` o el
botón 🎒— y desde ahí se usan, se dejan caer o **se entregan**.

Entregar es en mano: hay que estar al lado de la persona, mejor mirándola de
frente, y darle el objeto desde la mochila. Si hay varias alrededor, el juego
pregunta a quién. Cada objeto sabe de quién es: su dueño se lo queda y lo
agradece, y quien no lo sea te lo devuelve, a veces diciéndote dónde llevarlo.
Cuando llevas encima algo de alguien, al hablar con esa persona sale también
la opción de entregárselo sin abrir la mochila.

Dónde está cada cosa y a quién le corresponde se define en `ITEMS`, dentro de
`index.html`.

## Tiempo, dinero y misiones

Tres contadores se guardan con la partida y se ven en la pantalla: la fecha y
el dinero arriba a la izquierda, y las misiones en el botón de la derecha,
debajo de la mochila.

**El tiempo.** El calendario del juego tiene meses de **14 días** (dos semanas
justas, así que todos empiezan en lunes), años de **168 días** (doce meses) y
estaciones de **42 días** (tres meses: dic-ene-feb, mar-abr-may, jun-jul-ago,
sep-oct-nov). La partida empieza el **1 de octubre**, cuando arranca el
semestre de invierno.

El día solo avanza durmiendo: en tu cuarto de la residencia
(Studentenwohnheim, cuarto 1) te pones delante de la cama, pulsas acción y
eliges «ir a dormir». La pantalla se apaga, aparece la fecha nueva y vuelve a
encenderse. La sala del dormitorio se marca en `INTERIORS` con
`dormitorio:true`; la cama es la pieza `'`.

**Las estaciones se ven.** El campus se dibuja entero por código, así que la
estación no cambia el mapa: cambia los colores con los que se pinta. En
invierno hay nieve en el suelo, en las copas, en los bancos y en los tejados,
y el río se vuelve gris azulado; en primavera el verde es tierno, hay flores
por la hierba y los árboles florecen en rosa; en otoño las copas se encienden
en naranja y quedan hojas caídas por el suelo. Verano es la paleta de siempre,
idéntica al píxel.

Todo sale de `PALETAS`, una tabla de colores por estación en `index.html`
(mismo orden que `ESTACIONES`). `PAL` guarda la que toca y `actualizarHud()`
la pone al día, así que no hay que consultarla en cada baldosa. Para retocar
una estación se cambian sus colores ahí y ya está; solo afecta al exterior,
los interiores no tienen estación.

**El dinero.** Se empieza con **50 €** y cada noche que se duerme entran
**10 €**. Se gasta en bebidas, comida y trámites: la Mensa, la cafetería del
Nikolakloster, el Gmoa, la expendedora del salón de la residencia, la máquina
de Informatik, el centro comercial, el registro de estudiantes y la
administración del centro de idiomas.

Por dentro se lleva en **céntimos** (enteros), para no arrastrar decimales
sueltos. Cualquier opción de diálogo puede cobrar con solo añadirle un
precio:

```js
choice:{q:"¿Qué te pongo?",opts:[
  {t:"Un café solo", precio:160, r:["Marchando."],
   sin:["Hoy no te llega, cielo."]},   // 'sin' es opcional
  {t:"Nada, gracias", r:["Cuando quieras."]},
]}
```

El precio sale en el botón, la opción se ve apagada si no llega el dinero y
al elegirla se cobra sola. Una opción puede llevar además `fn`, una función
que se ejecuta al cerrarse el diálogo (así es como la cama duerme).

**Las misiones.** El botón de la derecha lleva la cuenta de las que están en
curso y abre el panel (también con la tecla `M`). Cada misión se describe en
`MISIONES` con sus pasos, y se avanza desde donde toque:

```js
cumplirPaso('primera_noche','dormir');
```

Cuando no queda ningún paso suelto la misión se da por cumplida sola, se
cobra el premio si lo tiene y salta el aviso. Las marcadas con `inicial:true`
arrancan al empezar la partida. De momento hay dos, de rodaje, que enseñan
las dos mecánicas nuevas.

## Controles

En el ordenador: flechas o WASD para moverse, Z / Espacio / Enter para
interactuar, `I` para la mochila y `M` para las misiones.

En el móvil la pantalla entera es el mando y se reparte en dos mitades:

- **Mitad izquierda — joystick flotante.** No hay cruceta fija: el aro nace
  justo bajo el dedo, en el punto que sea, y le persigue si te sales de él.
  Así se juega igual de bien con el móvil vertical que horizontal, sin buscar
  a ciegas una esquina. El empuje es analógico: a medias se anda con tiento
  (2,5 casillas/s), a fondo al paso normal (6,5). Con el teclado se va a 7,5,
  que es el paso de siempre. El tacto se ajusta en dos grupos de constantes de
  `index.html`: `JOY_*` para el mando (zona muerta, recorrido, histéresis) y
  `CASILLAS_*` para la velocidad al andar, escrita directamente en casillas
  por segundo.
- **Mitad derecha — acción.** Un toque equivale a pulsar A (hablar, abrir
  puertas, recoger objetos). Si en vez de tocar arrastras, también sale el
  joystick, para poder jugar con la mano derecha.

El botón A viene colocado hacia el centro, separado del borde, y se puede
**arrastrar** para dejarlo donde caiga bien el pulgar. Cada orientación
recuerda su propia posición en `localStorage`.

La tecla `T` alterna los controles táctiles en el ordenador, útil para
probarlos sin un móvil.
