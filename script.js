// --- 1. Inicialización y Variables Globales ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const messageDisplay = document.getElementById('message');

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_Y = GAME_HEIGHT; 

let gameRunning = false;
let score = 0;
let frames = 0;
let spawnRate = 90; 
let gameSpeed = 5; 

// --- 2. Carga de Sprites (MODIFICADO) ---

// Sprites del juego
const runSpritePaths = ['sprites/01.png', 'sprites/03.png']; 
const jumpSpritePath = 'sprites/salto.png';
const collisionSpritePath = 'sprites/colision.png';
const obstacleSpritePaths = ['sprites/cristal01.png', 'sprites/cristal02.png', 'sprites/piedra.png'];
// --- NUEVO: Sprites de fondo ---
const bgCieloPath = 'sprites/fondo_cielo.png';
const bgLentoPath = 'sprites/fondo_lejano.png';
const bgMedioPath = 'sprites/fondo_medio.png';


let runSprites = [];
let jumpSprite = new Image();
let collisionSprite = new Image();
let obstacleSprites = []; 
// --- NUEVO: Variables para imágenes de fondo ---
let bgCieloSprite = new Image();
let bgLentoSprite = new Image();
let bgMedioSprite = new Image();


// --- MODIFICADO: Añadimos 3 imágenes de fondo al contador ---
let imagesToLoad = runSpritePaths.length + 2 + obstacleSpritePaths.length + 3; 
let imagesLoaded = 0;

function onImageLoad() {
    imagesLoaded++;
    if (imagesLoaded === imagesToLoad) {
        initializeGame(); // Inicia el juego cuando todo está cargado
    }
}

messageDisplay.innerHTML = "Cargando sprites...";
messageDisplay.classList.add('active');

// Cargar sprites de correr
runSpritePaths.forEach(path => {
    let img = new Image();
    img.src = path;
    img.onload = onImageLoad;
    runSprites.push(img);
});

// Cargar sprites de obstáculos
obstacleSpritePaths.forEach(path => {
    let img = new Image();
    img.src = path;
    img.onload = onImageLoad;
    obstacleSprites.push(img);
});

// Cargar sprites de salto y colisión
jumpSprite.src = jumpSpritePath;
jumpSprite.onload = onImageLoad;
collisionSprite.src = collisionSpritePath;
collisionSprite.onload = onImageLoad;

// --- NUEVO: Cargar sprites de fondo ---
bgCieloSprite.src = bgCieloPath;
bgCieloSprite.onload = onImageLoad;
bgLentoSprite.src = bgLentoPath;
bgLentoSprite.onload = onImageLoad;
bgMedioSprite.src = bgMedioPath;
bgMedioSprite.onload = onImageLoad;


// --- 3. Objeto del Jugador (Dino/Astronauta) ---
// (Sin cambios)
let dino = {
    width: 40,  
    height: 50,
    x: 50,
    y: GROUND_Y - 50,
    vy: 0, 
    gravity: 0.8,
    isJumping: false,
    baseY: GROUND_Y - 50,
    animationFrame: 0,   
    animationSpeed: 6,   
    currentSprite: null, 

    draw: function() {
        if (this.currentSprite && this.currentSprite.complete) {
            ctx.drawImage(this.currentSprite, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    },
    
    update: function() {
        if (gameRunning) { 
            this.vy += this.gravity;
            this.y += this.vy;
            
            if (this.y > this.baseY) {
                this.y = this.baseY;
                this.vy = 0;
                this.isJumping = false;
            }

            if (this.isJumping) {
                this.currentSprite = jumpSprite;
            } else {
                if (frames % this.animationSpeed === 0) {
                    this.animationFrame = (this.animationFrame + 1) % runSprites.length;
                }
                this.currentSprite = runSprites[this.animationFrame];
            }
        }
    },
    
    jump: function() {
        if (!this.isJumping && gameRunning) { 
            this.isJumping = true;
            this.vy = -14; 
        }
    }
};

// --- 4. Clase para Obstáculos ---
// (Sin cambios, usa la lógica de altura fija)
class Obstacle {
    constructor() {
        this.image = obstacleSprites[Math.floor(Math.random() * obstacleSprites.length)];

        const minHeight = 25;
        const maxHeight = 45; 
        this.height = Math.random() * (maxHeight - minHeight) + minHeight;

        const originalHeight = this.image.naturalHeight || 30;
        const originalWidth = this.image.naturalWidth || 30;
        
        const scale = this.height / originalHeight;
        this.width = originalWidth * scale;
        
        this.x = GAME_WIDTH; 
        this.y = GROUND_Y - this.height;
    }
    
    draw() {
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'red'; 
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    
    update() {
        this.x -= gameSpeed;
    }
}

let obstacles = [];

// --- 5. NUEVA CLASE PARA FONDOS (PARALLAX) ---
class BackgroundLayer {
    constructor(image, speedModifier) {
        this.image = image;
        this.width = GAME_WIDTH; // Asumimos que la imagen es del ancho del canvas (800px)
        this.height = GAME_HEIGHT; // Asumimos que la imagen es del alto del canvas (200px)
        this.speedModifier = speedModifier; // Un % de la gameSpeed (ej. 0.2 para 20%)
        this.speed = gameSpeed * this.speedModifier;
        this.x1 = 0;
        this.x2 = this.width; // La segunda imagen empieza justo a la derecha de la primera
        this.y = 0; 
    }

    update() {
        // Actualiza la velocidad en caso de que gameSpeed cambie
        this.speed = gameSpeed * this.speedModifier;
        
        // Mueve ambas imágenes
        this.x1 -= this.speed;
        this.x2 -= this.speed;

        // Si la imagen 1 se salió completamente por la izquierda, muévela a la derecha de la imagen 2
        if (this.x1 <= -this.width) {
            this.x1 = this.x2 + this.width;
        }
        // Si la imagen 2 se salió completamente por la izquierda, muévela a la derecha de la imagen 1
        if (this.x2 <= -this.width) {
            this.x2 = this.x1 + this.width;
        }
    }

    draw() {
        // Dibuja la imagen en la posición x1
        ctx.drawImage(this.image, this.x1, this.y, this.width, this.height);
        // Dibuja la imagen (la copia) en la posición x2 para el bucle infinito
        ctx.drawImage(this.image, this.x2, this.y, this.width, this.height);
    }
}

let backgroundLayers = [];
let staticBackground = null; // Para el cielo


// --- 6. Funciones del Juego (MODIFICADAS) ---

function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    score = 0;
    frames = 0;
    gameSpeed = 5;
    spawnRate = 90;
    obstacles = [];
    
    // --- NUEVO: Inicializar las capas de fondo ---
    backgroundLayers = [];
    staticBackground = bgCieloSprite; // El cielo no se mueve (o speedModifier = 0)
    // Añadir capas en orden (de atrás hacia adelante)
    backgroundLayers.push(new BackgroundLayer(bgLentoSprite, 0.2)); // 20% de gameSpeed
    backgroundLayers.push(new BackgroundLayer(bgMedioSprite, 0.4)); // 40% de gameSpeed
    // El "suelo" (obstáculos) se mueve al 100% de gameSpeed
    
    canvas.classList.remove('game-over');
    messageDisplay.classList.remove('active');
    
    dino.y = dino.baseY;
    dino.currentSprite = runSprites[0]; 
    
    gameLoop();
}

function gameOver() {
    gameRunning = false;
    canvas.classList.add('game-over');
    dino.currentSprite = collisionSprite; 
    messageDisplay.innerHTML = `GAME OVER. Puntuación: ${Math.floor(score)}. Presiona **ESPACIO** para reiniciar.`;
    messageDisplay.classList.add('active');
}

function checkCollision() {
    for (const obstacle of obstacles) {
        const hitX = dino.x < obstacle.x + obstacle.width && dino.x + dino.width > obstacle.x;
        const hitY = dino.y + dino.height > obstacle.y && dino.y < obstacle.y + obstacle.height;

        if (hitX && hitY) {
            return true;
        }
    }
    return false;
}

function updateGame() {
    // --- NUEVO: Actualizar fondos ---
    backgroundLayers.forEach(layer => layer.update());
    
    score += 0.1;
    scoreDisplay.textContent = Math.floor(score);
    
    if (frames % 300 === 0) {
        gameSpeed += 0.2; 
        if (spawnRate > 40) spawnRate -= 1; 
    }

    dino.update(); 

    frames++;
    if (frames % spawnRate === 0) {
        obstacles.push(new Obstacle());
    }
    
    obstacles = obstacles.filter(obstacle => {
        obstacle.update();
        return obstacle.x > -obstacle.width;
    });

    if (checkCollision()) {
        gameOver();
    }
}

function drawGame() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // --- NUEVO: Dibujar fondos primero ---
    // 1. Dibujar el cielo estático
    if (staticBackground && staticBackground.complete) {
        ctx.drawImage(staticBackground, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    // 2. Dibujar las capas dinámicas (parallax)
    backgroundLayers.forEach(layer => layer.draw());
    
    // --- Dibujar el juego (jugador y obstáculos) encima ---
    dino.draw();
    obstacles.forEach(obstacle => obstacle.draw());
}

// --- 7. Bucle Principal del Juego ---

function gameLoop() {
    drawGame(); 
    if (gameRunning) {
        updateGame();
        requestAnimationFrame(gameLoop);
    } 
}

// --- 8. Manejo de Entrada (MODIFICADO) ---

function initializeGame() {
    messageDisplay.innerHTML = "Presiona **ESPACIO** para empezar";
    messageDisplay.classList.add('active');
    
    // --- NUEVO: Inicializar y dibujar los fondos para la pantalla de inicio ---
    staticBackground = bgCieloSprite;
    backgroundLayers = [];
    backgroundLayers.push(new BackgroundLayer(bgLentoSprite, 0.2));
    backgroundLayers.push(new BackgroundLayer(bgMedioSprite, 0.4));
    
    // Dibujar el estado inicial
    if (staticBackground && staticBackground.complete) {
        ctx.drawImage(staticBackground, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    backgroundLayers.forEach(layer => layer.draw());
    // --- Fin fondos ---

    dino.currentSprite = runSprites[0];
    dino.draw(); // Dibujar al dino encima de los fondos
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (!gameRunning) {
            if (imagesLoaded === imagesToLoad) { // Asegurarse que todo esté cargado
                startGame();
            }
        } else {
            dino.jump();
        }
    }
});