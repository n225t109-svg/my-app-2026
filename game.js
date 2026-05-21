/**
 * SPACE BATTLESHIP ODYSSEY - Engine
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
const activeItemsEl = document.getElementById('active-items');

// Game Settings
let gameActive = false;
let score = 0;
let level = 1;
let lastTime = 0;
let lastBulletTime = 0;
let lastItemTime = 0;
let screenShake = 0;
let bulletInterval = 1000;

// Power-up States
let shieldActive = 0;
let slowMoActive = 0;

// Canvas Resizing
function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// Input
const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
const updateMouse = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouse.x = clientX - rect.left;
    mouse.y = clientY - rect.top;
};
canvas.addEventListener('mousemove', updateMouse);
canvas.addEventListener('touchmove', (e) => { updateMouse(e); e.preventDefault(); }, { passive: false });

// Starfield Background
const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 0.5
}));

function drawStarfield() {
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.globalAlpha = star.size / 2;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed * (slowMoActive > 0 ? 0.3 : 1);
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
    ctx.globalAlpha = 1;
}

// Game Objects
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height * 0.8;
        this.hitboxRadius = 4;
        this.color = '#00f3ff';
        this.angle = 0;
    }

    update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        this.x += dx * 0.15;
        this.y += dy * 0.15;
        this.angle = dx * 0.05; // Bank effect
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shield Effect
        if (shieldActive > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Engine Fire
        ctx.fillStyle = '#ff3c00';
        ctx.beginPath();
        ctx.moveTo(-5, 10);
        ctx.lineTo(0, 20 + Math.random() * 10);
        ctx.lineTo(5, 10);
        ctx.fill();

        // Battleship Shape
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.moveTo(0, -20); // Nose
        ctx.lineTo(12, 10); // Right Wing
        ctx.lineTo(0, 5);   // Tail
        ctx.lineTo(-12, 10); // Left Wing
        ctx.closePath();
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.radius = type === 'solar' ? 8 : 4;
        this.color = type === 'solar' ? '#ff3c00' : (type === 'binary' ? '#00f3ff' : '#ff00ff');
    }

    update() {
        const factor = slowMoActive > 0 ? 0.3 : 1;
        this.x += this.vx * factor;
        this.y += this.vy * factor;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        if (this.type === 'solar') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    isOffscreen() {
        return (this.x < -50 || this.x > canvas.width + 50 || this.y < -50 || this.y > canvas.height + 50);
    }
}

class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'shield' or 'slowmo'
        this.radius = 12;
        this.color = type === 'shield' ? '#00f3ff' : '#f3ff00';
    }

    update() {
        this.y += 2 * (slowMoActive > 0 ? 0.3 : 1);
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = this.color;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'shield' ? 'S' : 'T', this.x, this.y + 4);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.alpha = 1;
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= 0.02; }
    draw() { ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 2, 2); ctx.globalAlpha = 1; }
}

let player = new Player();
let bullets = [];
let items = [];
let particles = [];

// Patterns
function spawnPattern() {
    const p = Math.random();
    
    if (p < 0.25) { // Spiral Petals
        const count = 12 + level;
        for(let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (score * 0.01);
            bullets.push(new Bullet(canvas.width / 2, -50, Math.cos(angle) * 3, Math.sin(angle) * 3 + 1, 'petal'));
        }
    } else if (p < 0.5) { // Binary Stream
        const x = Math.random() * canvas.width;
        for(let i = 0; i < 5; i++) {
            bullets.push(new Bullet(x, -50 - (i * 20), 0, 6, 'binary'));
        }
    } else if (p < 0.75) { // Solar Flare (expanding rings)
        const count = 15;
        const centerX = Math.random() * canvas.width;
        for(let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            bullets.push(new Bullet(centerX, -20, Math.cos(angle) * 2, Math.sin(angle) * 2, 'solar'));
        }
    } else { // Random Rain
        bullets.push(new Bullet(Math.random() * canvas.width, -20, (Math.random() - 0.5) * 2, 4 + Math.random() * 2));
    }
}

// Loop
function gameLoop(timestamp) {
    if (!gameActive) return;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawStarfield();

    if (screenShake > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake -= 1;
    }

    player.update();
    player.draw();

    // Power-up counters
    if (shieldActive > 0) shieldActive--;
    if (slowMoActive > 0) slowMoActive--;
    
    activeItemsEl.innerText = (shieldActive > 0 ? 'SHIELD ' : '') + (slowMoActive > 0 ? 'SLOW-MO' : '');

    // Spawning
    if (timestamp - lastBulletTime > bulletInterval) {
        spawnPattern();
        lastBulletTime = timestamp;
        score += 5;
        if (score % 250 === 0) {
            level++;
            bulletInterval = Math.max(200, bulletInterval - 100);
        }
    }

    // Items
    if (timestamp - lastItemTime > 8000) {
        items.push(new Item(Math.random() * canvas.width, -20, Math.random() > 0.5 ? 'shield' : 'slowmo'));
        lastItemTime = timestamp;
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        b.draw();

        const dx = b.x - player.x;
        const dy = b.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + player.hitboxRadius) {
            if (shieldActive > 0) {
                shieldActive = 0;
                bullets.splice(i, 1);
                screenShake = 10;
            } else {
                endGame();
            }
        }
        if (b.isOffscreen()) bullets.splice(i, 1);
    }

    // Item Collection
    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.update();
        it.draw();
        
        const dx = it.x - player.x;
        const dy = it.y - player.y;
        if (Math.sqrt(dx * dx + dy * dy) < it.radius + 15) {
            if (it.type === 'shield') shieldActive = 300;
            else slowMoActive = 300;
            items.splice(i, 1);
        }
        if (it.y > canvas.height) items.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.update(); p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    scoreEl.innerText = score;
    levelEl.innerText = level;

    if (screenShake > 0) ctx.restore();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameActive = true;
    score = 0; level = 1;
    shieldActive = 0; slowMoActive = 0;
    bullets = []; items = []; particles = [];
    player = new Player();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    lastTime = performance.now();
    lastBulletTime = lastTime;
    lastItemTime = lastTime;
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    screenShake = 30;
    for(let i = 0; i < 100; i++) particles.push(new Particle(player.x, player.y, '#ff3c00'));
    setTimeout(() => {
        finalScoreEl.innerText = score;
        gameOverScreen.classList.remove('hidden');
    }, 1200);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
