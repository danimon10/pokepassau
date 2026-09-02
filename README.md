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

## Controles

En el ordenador: flechas o WASD para moverse, y Z / Espacio / Enter para
interactuar.

En el móvil la pantalla entera es el mando y se reparte en dos mitades:

- **Mitad izquierda — joystick flotante.** No hay cruceta fija: el aro nace
  justo bajo el dedo, en el punto que sea, y le persigue si te sales de él.
  Así se juega igual de bien con el móvil vertical que horizontal, sin buscar
  a ciegas una esquina. El empuje es analógico: a medias se anda con tiento
  (~1,9 casillas/s), a fondo al paso normal (~3,8). Con el teclado se va al
  doble, que es el paso de siempre. El tacto se ajusta en dos grupos de
  constantes de `index.html`: `JOY_*` para el mando (zona muerta, recorrido,
  histéresis) y `PASO_*` para la velocidad al andar.
- **Mitad derecha — acción.** Un toque equivale a pulsar A (hablar, abrir
  puertas, recoger objetos). Si en vez de tocar arrastras, también sale el
  joystick, para poder jugar con la mano derecha.

El botón A viene colocado hacia el centro, separado del borde, y se puede
**arrastrar** para dejarlo donde caiga bien el pulgar. Cada orientación
recuerda su propia posición en `localStorage`.

La tecla `T` alterna los controles táctiles en el ordenador, útil para
probarlos sin un móvil.
