/**
 * CYBER DODGE - Bullet Hell Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('current-score');
const levelEl = document.getElementById('current-level');
const finalScoreEl = document.getElementById('final-score');

// Game Settings
let gameActive = false;
let score = 0;
let level = 1;
let lastTime = 0;
let bulletInterval = 1000;
let lastBulletTime = 0;
let screenShake = 0;

// Canvas Resizing
function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// Input Handling
const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
const updateMouse = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouse.x = clientX - rect.left;
    mouse.y = clientY - rect.top;
};
canvas.addEventListener('mousemove', updateMouse);
canvas.addEventListener('touchmove', (e) => {
    updateMouse(e);
    e.preventDefault();
}, { passive: false });

// Game Objects
class Player {
    constructor() {
        this.radius = 6;
        this.hitboxRadius = 3;
        this.x = canvas.width / 2;
        this.y = canvas.height * 0.8;
        this.color = '#00f3ff';
    }

    update() {
        // Smoothly follow mouse
        this.x += (mouse.x - this.x) * 0.2;
        this.y += (mouse.y - this.y) * 0.2;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Inner Glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Outer Ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy, color = '#ff00ff', radius = 4) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Tail effect
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius / 2;
        ctx.stroke();
    }

    isOffscreen() {
        return (this.x < -20 || this.x > canvas.width + 20 || 
                this.y < -20 || this.y > canvas.height + 20);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.alpha = 1;
        this.color = color;
        this.size = Math.random() * 3 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

let player = new Player();
let bullets = [];
let particles = [];

// Patterns
function spawnPattern() {
    const type = Math.floor(Math.random() * 4);
    const centerX = Math.random() * canvas.width;
    const centerY = -20;
    
    switch(type) {
        case 0: // Spiral
            for(let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                bullets.push(new Bullet(centerX, centerY, Math.cos(angle) * 3, Math.sin(angle) * 3 + 2));
            }
            break;
        case 1: // Wave
            for(let i = 0; i < 5; i++) {
                bullets.push(new Bullet(i * (canvas.width / 4), -20, 0, 4, '#f3ff00'));
            }
            break;
        case 2: // Targeting
            const angle = Math.atan2(player.y - centerY, player.x - centerX);
            bullets.push(new Bullet(centerX, centerY, Math.cos(angle) * 5, Math.sin(angle) * 5, '#00f3ff', 6));
            break;
        case 3: // Random Rain
            bullets.push(new Bullet(Math.random() * canvas.width, -20, (Math.random() - 0.5) * 2, 3 + Math.random() * 3));
            break;
    }
}

// Game Loop
function gameLoop(timestamp) {
    if (!gameActive) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Clear with slight trail
    ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid
    drawGrid();

    // Screen Shake
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake -= 0.5;
    }

    player.update();
    player.draw();

    // Spawning
    if (timestamp - lastBulletTime > bulletInterval) {
        spawnPattern();
        lastBulletTime = timestamp;
        score += 10;
        
        // Difficulty scaling
        if (score % 200 === 0) {
            level++;
            bulletInterval = Math.max(300, bulletInterval - 50);
        }
    }

    // Bullets logic
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        b.draw();

        // Collision detection
        const dx = b.x - player.x;
        const dy = b.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < b.radius + player.hitboxRadius) {
            endGame();
        }

        if (b.isOffscreen()) {
            bullets.splice(i, 1);
        }
    }

    // Particles logic
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    // HUD Update
    scoreEl.innerText = score;
    levelEl.innerText = level;

    if (screenShake > 0) ctx.setTransform(1, 0, 0, 1, 0, 0);
    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    ctx.strokeStyle = '#00f3ff22';
    ctx.lineWidth = 1;
    const spacing = 40;
    for(let x = 0; x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for(let y = 0; y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function startGame() {
    gameActive = true;
    score = 0;
    level = 1;
    bulletInterval = 1000;
    bullets = [];
    particles = [];
    player = new Player();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    lastTime = performance.now();
    lastBulletTime = lastTime;
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    screenShake = 20;
    
    // Explosion particles
    for(let i = 0; i < 50; i++) {
        particles.push(new Particle(player.x, player.y, player.color));
    }

    setTimeout(() => {
        finalScoreEl.innerText = score;
        gameOverScreen.classList.remove('hidden');
    }, 1000);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
