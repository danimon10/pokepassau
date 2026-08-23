# Campus Passau — Uni·Quest

Juego web de un solo archivo (`index.html`): un campus de Passau explorable
estilo Pokémon, con mapa exterior, interiores de edificios y NPCs.

## Plano del campus

`plano-campus-passau.png` es el plano del mapa exterior con rejilla y
coordenadas, pensado para abrirlo en Paint y dibujar encima los cambios.
Incluye la leyenda de piezas de interior para diseñar salas nuevas.

Es un artefacto generado y no se versiona. Para crearlo o regenerarlo cuando
cambie el mapa:

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
