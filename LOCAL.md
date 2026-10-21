# Grammar Rush por red local

La laptop del maestro es el servidor. Los alumnos usan sus navegadores en el mismo Wi-Fi o punto de acceso. No se requiere internet, PeerJS, WebRTC ni servicios de terceros durante la partida.

## Preparación (una sola vez)

Instala Node.js 22 o posterior en la laptop cuando tengas internet. Descarga el repositorio completo; conserva la carpeta `local` junto a `index.html`. El archivo offline HTML por sí solo es para jugar manualmente, no ejecuta el servidor multijugador.

## Crear tu Wi-Fi

Puedes usar un router sin conexión a internet o el hotspot de la laptop:

- **Ubuntu/Linux:** Configuración → Wi-Fi → menú → Activar punto de acceso. Elige nombre y contraseña. Si tu adaptador no admite hotspot, utiliza un router o adaptador compatible.
- **Windows:** Configuración → Red e internet → Zona con cobertura inalámbrica móvil. Configura nombre y contraseña y actívala. Algunos adaptadores/versiones requieren una conexión que compartir; en ese caso usa un router aunque no tenga internet.
- Conecta los celulares a esa red. Si dicen «Sin internet», selecciona permanecer conectado. Desactiva temporalmente el cambio automático a datos móviles.

Una página web no puede activar el adaptador Wi-Fi: este paso se realiza en el sistema operativo. No es necesario cambiar la conexión de la laptop si ya comparten un Wi-Fi que permite comunicación entre dispositivos.

## Iniciar y jugar

1. Linux: ejecuta `./iniciar-local.sh`. Windows: abre `iniciar-local.bat`. También puedes ejecutar `node local/server.cjs`.
2. El lanzador abre el navegador automáticamente. Mantén abierta la ventana del servidor y la laptop encendida.
3. En la laptop abre la dirección **Maestro** que muestra la ventana: `http://localhost:3000/?role=host`.
4. En cada celular abre una de las direcciones **Alumnos** que muestra el servidor, por ejemplo `http://192.168.137.1:3000/?role=client`. No escribas `localhost` en el celular.
5. Introduce el código de cuatro dígitos del maestro y el nombre del equipo. Inicia la partida cuando se hayan unido los equipos.
6. Las apuestas, puntos, temas, explicaciones y rondas automáticas funcionan como en el juego habitual. Se permite unirse a mitad de partida.

## Si un celular no abre la página

- Comprueba que el IP corresponda al hotspot/Wi-Fi actual: puede cambiar al cambiar de red. Si hay varias direcciones, usa la del adaptador Wi-Fi/hotspot.
- Permite Node.js/puerto TCP 3000 en el firewall para la red privada.
- Las redes de invitados y algunas redes escolares aíslan los dispositivos; usa tu hotspot o un router propio.
- Si el puerto está ocupado, ejecuta `PORT=3001 node local/server.cjs` en Linux y usa el puerto mostrado.
- Mantén la pestaña del maestro abierta; si recargas, la clase se recupera del almacenamiento de ese navegador y los alumnos pueden reconectarse.
- Detén el servidor con Ctrl+C cuando termine la clase. El servidor escucha en todas las interfaces de la laptop; úsalo en tu red de clase y no abras puertos del router hacia internet.

## Conexión online

El sitio público continúa usando PeerJS/WebRTC. Su negociación puede fallar por rutas o restricciones de red aun con buen ancho de banda. La app ya no llama «red lenta» a ese fallo, permite reintentar sin borrar el equipo y da más tiempo a establecer el canal. Para jugar sin depender de esas rutas usa esta versión local.
