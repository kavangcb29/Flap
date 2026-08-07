import { state, ctx } from '../state.js';
import { soundEffects } from '../audio.js';
import { createParticles } from './Particles.js';
import { createPipeDebris } from './Debris.js';
import { addFloatingText } from './FloatingTexts.js';
import { getProjectiles } from './Projectiles.js';
import { plane } from './Plane.js';
import { gameOver } from '../ui.js';

let enemies = [];
let boss = null;
let lastBossSpawnLevel = 0;

export function handleEnemies() {
    if (state.gameState !== 'PLAYING') return;

    if (state.currentLevel % 10 === 0 && state.currentLevel !== lastBossSpawnLevel && !boss) {
        spawnBoss();
        lastBossSpawnLevel = state.currentLevel;
    }

    if (Math.random() < 0.015 + (state.currentLevel * 0.001) && !boss && state.currentLevel % 10 !== 0) {
        spawnEnemy();
    }

    const projectiles = getProjectiles();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.x -= state.gameSpeed * 1.5;

        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            if (!p.active) continue;
            if (checkCollision(p, e)) {
                p.active = false;
                e.hp -= 10;
                addFloatingText(e.x, e.y, '-10', '#ff0000');
                if (e.hp <= 0) {
                    killEnemy(e, i);
                } else {
                    soundEffects.coin();
                }
                break;
            }
        }

        if (enemies[i] && checkCollision(e, plane)) {
             if (plane.shielded) {
                 plane.shielded = false;
                 plane.invincible = 60;
                 soundEffects.shieldBreak();
                 killEnemy(e, i);
                 continue;
             } else if (plane.invincible <= 0) {
                 gameOver();
                 return;
             }
        }

        if (enemies[i] && e.x + e.width < 0) {
            enemies.splice(i, 1);
        } else if (enemies[i]) {
            drawEnemy(e);
        }
    }

    if (boss) {
        boss.y += boss.vy;
        if (boss.y < 50 || boss.y > state.gameHeight - 50) boss.vy *= -1;

        if (boss.x > state.gameWidth - 150) {
            boss.x -= 2;
        }

        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            if (!p.active) continue;
            if (checkCollision(p, boss)) {
                p.active = false;
                boss.hp -= 10;
                addFloatingText(p.x, p.y, '-10', '#ff0000');
                soundEffects.coin();
                
                const bossHpBar = document.getElementById('boss-hp-fill');
                if (bossHpBar) bossHpBar.style.width = `${(boss.hp / boss.maxHp) * 100}%`;

                if (boss.hp <= 0) {
                    killBoss();
                }
            }
        }

        if (boss && checkCollision(boss, plane)) {
             if (plane.shielded) {
                 plane.shielded = false;
                 plane.invincible = 60;
                 soundEffects.shieldBreak();
             } else if (plane.invincible <= 0) {
                 gameOver();
                 return;
             }
        }

        if (boss) drawBoss();
    }
}

function spawnEnemy() {
    enemies.push({
        x: state.gameWidth + 50,
        y: 50 + Math.random() * (state.gameHeight - 100),
        width: 30,
        height: 30,
        hp: 20
    });
}

function drawEnemy(e) {
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(e.x, e.y, e.width, e.height);
}

function killEnemy(e, index) {
    enemies.splice(index, 1);
    soundEffects.explosion();
    createParticles(e.x, e.y, 15);
    createPipeDebris(e.x, e.y, '#ff0055');
    state.score += 5;
    addFloatingText(e.x, e.y, '+5', '#00ff00');
}

function spawnBoss() {
    boss = {
        x: state.gameWidth + 200,
        y: state.gameHeight / 2,
        width: 120,
        height: 120,
        maxHp: 500,
        hp: 500,
        vy: 3
    };
    const ui = document.getElementById('boss-hp-container');
    if (ui) ui.classList.remove('hidden');
    const bossHpBar = document.getElementById('boss-hp-fill');
    if (bossHpBar) bossHpBar.style.width = '100%';
}

function killBoss() {
    soundEffects.explosion();
    for(let i = 0; i<5; i++) {
        setTimeout(() => {
            if (!boss && i > 0) return; 
            const bx = boss ? boss.x : state.gameWidth - 150;
            const by = boss ? boss.y : state.gameHeight / 2;
            createParticles(bx + (Math.random()-0.5)*100, by + (Math.random()-0.5)*100, 20);
            createPipeDebris(bx + (Math.random()-0.5)*100, by + (Math.random()-0.5)*100, '#880000');
            soundEffects.explosion();
        }, i * 200);
    }
    state.score += 100;
    addFloatingText(boss.x, boss.y, '+100', '#00ff00');
    boss = null;
    const ui = document.getElementById('boss-hp-container');
    if (ui) ui.classList.add('hidden');
}

function drawBoss() {
    ctx.fillStyle = '#880000';
    ctx.fillRect(boss.x - boss.width/2, boss.y - boss.height/2, boss.width, boss.height);
}

function getRect(obj) {
    let left = obj.x;
    let right = obj.x + (obj.width || 0);
    let top = obj.y;
    let bottom = obj.y + (obj.height || 0);
    
    if (obj.width && obj.height) {
        if (obj === boss) {
            left = boss.x - boss.width/2;
            right = boss.x + boss.width/2;
            top = boss.y - boss.height/2;
            bottom = boss.y + boss.height/2;
        } else if (obj === plane) {
            left = plane.x - plane.width/2;
            right = plane.x + plane.width/2;
            top = plane.y - plane.height/2;
            bottom = plane.y + plane.height/2;
        } else if (obj.active !== undefined && obj.width === 20 && obj.height === 4) {
            left = obj.x;
            right = obj.x + obj.width;
            top = obj.y - obj.height/2;
            bottom = obj.y + obj.height/2;
        }
    }
    return {left, right, top, bottom};
}

function checkCollision(obj1, obj2) {
    const r1 = getRect(obj1);
    const r2 = getRect(obj2);
    return r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top;
}

export function resetEnemies() {
    enemies = [];
    boss = null;
    lastBossSpawnLevel = 0;
    const ui = document.getElementById('boss-hp-container');
    if (ui) ui.classList.add('hidden');
}
