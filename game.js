// filepath: /home/usuario/Descargas/tic2-supermariomovemove-supermariomove-main/game.js

/**
 * Super Mario Move Move (Versión Canvas)
 * 
 * Justificación de la Migración:
 * Se migra el proyecto a Canvas (`<canvas>`) para un control más preciso de la renderización y físicas. 
 * El motor original DOM+CSS era correcto para casos muy básicos, pero Canvas permite incluir numerosos 
 * elementos (cientos de ladrillos y monedas), un flujo de actualización fluido (60 FPS puros) y el uso 
 * simplificado de un sistema de coordenadas espaciales sin saturar el árbol de nodos DOM.
 */

// --- 1. Referencias y Configuración del Canvas ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de la Interfaz (UI)
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const victoryOverlay = document.getElementById('victoryOverlay');
const loadingOverlay = document.getElementById('loadingOverlay');

const btnStart = document.getElementById('startBtn');
const btnRestart = document.getElementById('restartBtn');
const btnVictoryRestart = document.getElementById('victoryRestartBtn');

// Constantes globales del mundo
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const GRAVITY = 0.8;
const MAX_FALL_SPEED = 15;

// Variables de estado del bucle del juego
let lastTime = 0;
let isRunning = false;
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER', 'VICTORY'

// Estadísticas del jugador
let lives = 3;
let coinsCount = 0;

// Control de cámara para el scroll horizontal
let cameraX = 0;


// --- 2. Sistema de Carga de Recursos (Assets) ---
const IMAGES = {};
const imgNames = [
    'mario.png', 'bicho.png', 'suelo.png', 'caja.png', 'ladrillo.png', 
    'montana.png', 'nube.png', 'nubepeque.png', 'planta.png', 
    'tuberia.png', 'castillo.png', 'peach.png', 'moneda.png'
];

let imagesLoaded = 0;

/** Carga asíncrona de todas las imágenes. Inicia el juego cuando todas están listas. */
function loadImages(onComplete) {
    if (imgNames.length === 0) return onComplete();
    
    imgNames.forEach(name => {
        let img = new Image();
        img.src = 'img/' + name;
        img.onload = () => {
            // Guardamos la imagen en el diccionario quitando la extensión para fácil acceso
            IMAGES[name.split('.')[0]] = img;
            imagesLoaded++;
            if(imagesLoaded === imgNames.length) {
                onComplete();
            }
        };
        img.onerror = () => {
            console.error("Error cargando imagen: " + name);
        };
    });
}


// --- 3. Input (Controles por Teclado y Táctil) ---
const input = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false // Para evitar que se mantenga el salto pulsado infinitamente
};

// Eventos de teclado
window.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = true;
    if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = true;
    if(e.key === ' ' || e.key === 'Spacebar') { 
        if(!input.jumpPressed) {
            input.jump = true;
            input.jumpPressed = true;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
    if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
    if(e.key === ' ' || e.key === 'Spacebar') {
        input.jumpPressed = false;
        input.jump = false;
    }
});

// Eventos táctiles
function bindTouchBtn(btnId, actionName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const startAction = (e) => { e.preventDefault(); input[actionName] = true; };
    const endAction = (e) => { e.preventDefault(); input[actionName] = false; };
    
    btn.addEventListener('touchstart', startAction);
    btn.addEventListener('touchend', endAction);
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', endAction);
    btn.addEventListener('mouseleave', endAction);
}

bindTouchBtn('leftBtn', 'left');
bindTouchBtn('rightBtn', 'right');
bindTouchBtn('jumpBtn', 'jump');


// --- 4. Clases y Entidades del Juego ---

/** Utilidad para colisiones (Axis-Aligned Bounding Box) */
function checkCollision(r1, r2) {
    return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
    );
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 32; // Ancho del sprite colisionador
        this.h = 44; // Alto del sprite colisionador
        
        this.vx = 0;
        this.vy = 0;
        
        this.speed = 5;
        this.jumpForce = -15;
        this.onGround = false;
        
        // true: mira a la derecha, false: mira a la izquierda
        this.facingRight = true; 
    }

    update() {
        // --- Física Horizontal ---
        if (input.left) {
            this.vx = -this.speed;
            this.facingRight = false;
        } else if (input.right) {
            this.vx = this.speed;
            this.facingRight = true;
        } else {
            this.vx *= 0.8; // Fricción suave si no pulsamos teclas
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // --- Física Vertical (Salto y Gravedad) ---
        if (input.jump && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
            // Quitamos la bandera reactiva al salto
            input.jump = false; 
        }

        this.vy += GRAVITY;
        if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

        // Limite izquierdo de la pantalla
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        }
        
        // Límite fatal al caer al vacío
        if (this.y > GAME_HEIGHT + 100) {
            triggerDeath();
        }
    }

    draw(ctx) {
        // Permite aplicar escalado reflejado sin alterar todos los demás objetos
        ctx.save(); 
        
        // Mover el contexto al centro del personaje para el volteo
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        
        // Si va a la izquierda, escalar negativamente en X
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        
        // Dibujamos el sprite cargado, centrado acorde a la traslación previa
        if (IMAGES.mario) {
            ctx.drawImage(IMAGES.mario, -this.w/2, -this.h/2, this.w, this.h);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        }
        
        ctx.restore();
    }
}

class Entity {
    // Clase general para elementos (ladrillos, suelos, enemigos)
    constructor(type, x, y, w, h) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        
        // Solo para enemigos ('bicho')
        this.speedX = -1.5; 
        
        // Solo para monedas (evitar recolectar 2 veces)
        this.collected = false; 
    }

    update() {
        if (this.type === 'bicho') {
            // Movimiento lateral simple del enemigo
            this.x += this.speedX;
            // Cambiar de dirección arbitrariamente tras cierta distancia
            // o podrías agregar detección de bordes si los tuviera precalculados
        }
        
        // Pequeña animación de flotación de moneda (opcional)
        // ...se podría usar math.sin + tiempo
    }

    draw(ctx) {
        if (this.collected) return;
        
        let img = IMAGES[this.type];
        if (img) {
            // El suelo debe repetirse/escalar según el ancho fijado
            // En este prototipo lo dibujamos estirado o repetido por simplicidad
            if(this.type === 'suelo'){
                // Estirar
                ctx.drawImage(img, this.x, this.y, this.w, this.h);
            } else {
                ctx.drawImage(img, this.x, this.y, this.w, this.h);
            }
        } 
    }
}

class Decor {
    // Nubes, montañas... elementos sin colisión
    constructor(type, x, y, w, h) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    
    draw(ctx) {
        if (IMAGES[this.type]) {
            ctx.drawImage(IMAGES[this.type], this.x, this.y, this.w, this.h);
        }
    }
}


// --- 5. Estado Global y Escenario ---
let player;
let platforms = [];
let enemies = [];
let coins = [];
let decors = []; // Elementos ornamentales
let flagPole = null; // La meta (Princesa/castillo)

/** Construimos el nivel a base de recuadros coordenados */
function initLevel() {
    platforms = [];
    enemies = [];
    coins = [];
    decors = [];
    
    player = new Player(100, 480);
    cameraX = 0;
    
    // --- Suelo base (extenso) ---
    // Usamos varias cajas de suelo unidas con un margen de seguridad vertical
    platforms.push(new Entity('suelo', -100, 550, 1600, 50)); 
    platforms.push(new Entity('suelo', 1650, 550, 1500, 50)); // Foso entremedio
    
    // --- Decoraciones de fondo ---
    decors.push(new Decor('montana', 50, 365, 395, 200));
    decors.push(new Decor('nube', 200, 100, 120, 50));
    decors.push(new Decor('nubepeque', 500, 150, 79, 60));
    decors.push(new Decor('montana', 800, 467, 280, 83));
    decors.push(new Decor('planta', 1200, 505, 117, 48));
    
    // --- Plataformas saltables ---
    platforms.push(new Entity('caja', 400, 420, 40, 40));
    platforms.push(new Entity('ladrillo', 440, 420, 40, 40));
    platforms.push(new Entity('caja', 480, 420, 40, 40));
    
    platforms.push(new Entity('ladrillo', 650, 320, 40, 40));
    platforms.push(new Entity('ladrillo', 690, 320, 40, 40));

    // --- Tuberías (obstáculo) ---
    platforms.push(new Entity('tuberia', 900, 430, 80, 120));
    platforms.push(new Entity('tuberia', 1300, 450, 80, 100)); // H bajada a 100 y Y a 450 para que descanse en 550
    
    // --- Monedas coleccionables ---
    coins.push(new Entity('moneda', 445, 360, 30, 35));
    coins.push(new Entity('moneda', 655, 260, 30, 35));
    coins.push(new Entity('moneda', 925, 370, 30, 35));
    coins.push(new Entity('moneda', 1900, 480, 30, 35));

    // --- Enemigos ---
    // Colocaremos el "bicho" en el suelo antes de la primera brecha
    let e1 = new Entity('bicho', 1050, 510, 40, 40);
    // Bounding bounds manuales para que el enemigo patrulle en una pequeña área
    e1.patrolLeft = 1000;
    e1.patrolRight = 1150;
    // Sobrescribir update de enemigo
    e1.update = function() {
        this.x += this.speedX;
        if(this.x < this.patrolLeft) { this.x = this.patrolLeft; this.speedX *= -1; }
        if(this.x > this.patrolRight) { this.x = this.patrolRight; this.speedX *= -1; }
    };
    enemies.push(e1);
    
    let e2 = new Entity('bicho', 1800, 510, 40, 40);
    e2.patrolLeft = 1700; e2.patrolRight = 1900;
    e2.update = function() {
        this.x += this.speedX;
        if(this.x < this.patrolLeft) this.speedX *= -1;
        if(this.x > this.patrolRight) this.speedX *= -1;
    }
    enemies.push(e2);

    // --- Meta (Castillo y Peach) ---
    // Ubicación de victoria. El jugador gana al tocarla
    flagPole = {
        castillo: new Entity('castillo', 2800, 250, 300, 300),
        peach: new Entity('peach', 2900, 480, 40, 60)
    };
}


// --- 6. Lógica Principal de Colisiones ---

function handleCollisions() {
    player.onGround = false;
    let pRectOriginal = {x: player.x, y: player.y, w: player.w, h: player.h};

    // Aplicar Movimiento X y testear
    player.x += player.vx;
    let pRectX = {x: player.x, y: player.y, w: player.w, h: player.h};
    
    for (let p of platforms) {
        if (checkCollision(pRectX, p)) {
            // Colisión en X (Pared)
            if (player.vx > 0) { // Iba a la derecha
                player.x = p.x - player.w;
            } else if (player.vx < 0) { // Iba a la izquierda
                player.x = p.x + p.w;
            }
            player.vx = 0;
        }
    }

    // Aplicar Movimiento Y y testear
    player.y += player.vy;
    let pRectY = {x: player.x, y: player.y, w: player.w, h: player.h};

    for (let p of platforms) {
        if (checkCollision(pRectY, p)) {
            // Colisión en Y
            if (player.vy >= 0) { // Cae aterrizando
                player.y = p.y - player.h;
                player.onGround = true;
                player.vy = 0;
            } else if (player.vy < 0) { // Sube chocando cabeza
                player.y = p.y + p.h;
                player.vy = 0;
            }
        }
    }
    
    /** Interacción con Entidades Secundarias **/
    let pActRect = {x: player.x, y: player.y, w: player.w, h: player.h};

    // Enemigos
    for (let e of enemies) {
        if (checkCollision(pActRect, e)) {
            // ¿Saltó sobre el enemigo (caída) o le tocó el pecho de lado?
            // Verificamos si en el frame ANTERIOR sus pies estaban más altos que el centro del enemigo
            // y que esté yendo hacia abajo. Esto evita bugs cuando cae a gran velocidad (>15px/frame).
            let isStomping = player.vy > 0 && (pRectOriginal.y + pRectOriginal.h) < (e.y + e.h * 0.5);
            
            if (isStomping) {
                // Matar enemigo
                enemies = enemies.filter(enemy => enemy !== e); // Se borra de array
                player.vy = -10; // Rebote
            } else {
                triggerDeath();
            }
        }
    }

    // Monedas
    for (let c of coins) {
        if (!c.collected && checkCollision(pActRect, c)) {
            c.collected = true; 
            coinsCount++;
        }
    }

    // Meta (Peach)
    if (flagPole) {
        if (checkCollision(pActRect, flagPole.peach)) {
            triggerVictory();
        }
    }
}


// --- 7. Flujo del Juego (Game Loop) ---

function triggerGameOver() {
    gameState = 'GAMEOVER';
    gameOverOverlay.classList.add('visible');
}

function triggerDeath() {
    lives--;
    if (lives <= 0) {
        triggerGameOver();
    } else {
        // Reiniciar posiciones pero mantener monedas obtenidas
        initLevel();
    }
}

function triggerVictory() {
    gameState = 'VICTORY';
    victoryOverlay.classList.add('visible');
}

function startGame() {
    lives = 3;
    coinsCount = 0;
    
    initLevel();
    gameState = 'PLAYING';
    
    // Ocultar paneles UI
    startOverlay.classList.remove('visible');
    gameOverOverlay.classList.remove('visible');
    victoryOverlay.classList.remove('visible');
    
    if(!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function gameLoop(timestamp) {
    if (!isRunning) return;
    
    // Delta Time Calculation (Asegura consistencia independiente de FPS, aunque aquí 
    // asumimos velocidad directa por frame de 60fps simplificando el math a dt ~ 1)
    let dt = (timestamp - lastTime) / 16.666; 
    lastTime = timestamp;

    if (gameState === 'PLAYING') {
        // Actualizar Entidades
        player.update();
        enemies.forEach(e => e.update());
        
        handleCollisions();
        
        // Seguir al jugador con la cámara
        // Mantener a Mario hacia el centro-izquierda (px 300)
        let targetCameraX = player.x - 300; 
        if (targetCameraX < 0) targetCameraX = 0; // Evitar mostrar fuera del mapa izquierdo
        
        cameraX = targetCameraX;

        render();
    }

    requestAnimationFrame(gameLoop);
}

function render() {
    // 1. Limpiar pantalla entera 
    // (Fondo pintado por CSS, pero en JS es buena práctica usar clearRect si hubiese transparencias.
    // Nosotros re-dibujaremos el propio color base.)
    // ctx.clearRect(0,0, canvas.width, canvas.height); 
    // Ya que usamos skybox via CSS detrás de canvas que es temporalmente transparente, basta con clearRect o ningún repintado opaco si dibujamos siempre fondo:
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. Guardar contexto y aplicar transformaciones de cámara (Scroll)
    ctx.save();
    ctx.translate(-cameraX, 0); // Todo lo dibujado a continuación estará afectado por la cámara

    // --- Dibujar elementos por orden de Capas (Z-Index) ---
    
    // 3A Capa fondo profundo: Nubes, montañas
    decors.forEach(d => d.draw(ctx));

    // 3B Meta, Castillo etc
    if (flagPole) {
        flagPole.castillo.draw(ctx);
        flagPole.peach.draw(ctx);
    }
    
    // 3B Medio: Plataformas, Tuberías
    platforms.forEach(p => p.draw(ctx));
    
    // 3C Coleccionables y Entidades Dinámicas
    coins.forEach(c => c.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    
    // 3D Protagonista siempre en frente
    player.draw(ctx);

    // Restaurar transformaciones para dejar la cámara a punto.
    ctx.restore();

    // 4. Interfaz de Usuario (HUD) - FIJA, dibujada fuera del transform
    ctx.font = "bold 24px Arial";
    
    // Sombra del texto
    ctx.fillStyle = "black";
    ctx.fillText("Vidas: " + lives, 22, 42);
    ctx.fillText("Monedas: " + coinsCount, 22, 72);
    
    // Texto principal
    ctx.fillStyle = "white";
    ctx.fillText("Vidas: " + lives, 20, 40);
    ctx.fillStyle = "#ffcc00"; // Tonito dorado para monedas
    ctx.fillText("Monedas: " + coinsCount, 20, 70);
}


// --- 8. Inicialización ---

// Quitar panel de Start temporalmente si seguimos cargando imágenes
loadingOverlay.classList.add('visible');

// Inyectamos carga al iniciar
window.onload = () => {
    loadImages(() => {
        // Imágenes listas
        loadingOverlay.classList.remove('visible');
        startOverlay.classList.add('visible');
    });

    const preventFocus = (e) => e.target.blur();

    btnStart.addEventListener('click', (e) => { preventFocus(e); startGame(); });
    btnRestart.addEventListener('click', (e) => { preventFocus(e); startGame(); });
    btnVictoryRestart.addEventListener('click', (e) => { preventFocus(e); startGame(); });
};
