# Super Mario Web — Canvas Edition

Este repositorio contiene una versión jugable estilo "Super Mario" completamente refactorizada utilizando el estándar **HTML5 `<canvas>`**, **CSS** (con Flexbox) y **JavaScript Vanilla**.

Se ha construido para cumplir requisitos educativos estrictos:
- Sin frameworks externos (React, Vue, Phaser, etc).
- Sin backend o base de datos.
- Archivos separados (`index.html`, `styles.css`, `game.js`).
- Físicas nativas (`gravity`, Axis-Aligned Bounding Box) programadas a mano.
- Diseño y controles _Responsive_ orientados tanto a ordenadores (Teclado) como pantallas táctiles (Móviles / Tablets).

---

## 🎮 Instrucciones de Ejecución (Local)

El juego carga imágenes localmente, lo cual puede generar problemas de CORS (Cross-Origin Resource Sharing) en algunos navegadores si se abre directamente el archivo HTML haciendo doble clic (`file:///`).

### Forma Recomendada (Live Server)
1. Abre el directorio del proyecto en **Visual Studio Code**.
2. Instala la extensión **Live Server** de Ritwick Dey.
3. Haz clic derecho en el archivo `index.html` y selecciona **"Open with Live Server"**.
4. Se abrirá una pestaña en tu navegador, lista para jugar.

### Forma Alternativa (Python/Node)
- Si tienes Python instalado, abre una terminal en la carpeta y pon `python3 -m http.server 8080`. Luego visita `http://localhost:8080` en tu navegador.
- Alternativamente, puedes usar `npx serve` de Node.

---

## 🚀 Instrucciones de Despliegue (GitHub Pages)

Dado que este proyecto está compuesto enteramente por archivos estáticos, desplegarlo en Internet es muy sencillo usando **GitHub Pages**.

1. Inicia sesión en [GitHub](https://github.com/) y crea un nuevo repositorio.
2. Sube todos los archivos de esta carpeta (`index.html`, `styles.css`, `game.js`, y la carpeta `img`) al repositorio creado.
3. Ve a la pestaña **⚙️ Settings (Ajustes)** de tu repositorio.
4. En la barra lateral izquierda, busca el apartado **"Pages"**.
5. En **"Source"** / **"Branch"**, selecciona la rama `main` (o `master`) y la carpeta raíz (`/root`).
6. Haz clic en **Save** (Guardar).
7. Después de uno o dos minutos, aparecerá un mensaje en la parte superior con un enlace: *Your site is published at `https://[tu-usuario].github.io/[tu-repo]/`*.
8. ¡Listo! Cualquier cambio en los recursos se actualizará automáticamente.

---

## 🛠 Arquitectura

### game.js
Contiene todo el motor.
- **Sistema de Carga (`loadImages`):** Asegura que todas las texturas de la carpeta `img/` estén listas antes de empezar.
- **Game Loop (`gameLoop`):** Repite tres funciones sagradas: actualizar input de forma delta asíncrona, manejar lógicas de colisión, y renderizar por capas (`render`).
- **Clase `Player` (Mario):** Implementa fuerza de salto, detección de inputs y _Sprite Flipping_ dependiendo de la dirección.
- **AABB (`checkCollision`):** Detector de colisiones geométrico sin depender de cajas CSS DOM.

### styles.css
Se encarga únicamente de hacer el _layout_ principal responsivo, centrar el `<canvas>` y sobreponer las pantallas de inicio, carga, o victoria preservando el `z-index`.

### index.html
Mantienen estructura semántica impecable importando las hojas de estilo y anclando el lienzo de dibujado estático.
