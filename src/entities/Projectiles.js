import { state, ctx } from '../state.js';
import { soundEffects } from '../audio.js';

const PROJECTILE_SPEED = 15;
const projectiles = [];

export function shootLaser(x, y) {
    projectiles.push({
        x: x,
        y: y,
        width: 20,
        height: 4,
        active: true,
        color: state.laserColor || '#00FFFF'
    });
    soundEffects.laser();
}

export function handleProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.active) {
            projectiles.splice(i, 1);
            continue;
        }

        p.x += PROJECTILE_SPEED;
        if (p.x > state.gameWidth) {
            p.active = false;
        }

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y - p.height / 2, p.width, p.height);
        ctx.restore();
    }
}

export function getProjectiles() {
    return projectiles;
}

export function resetProjectiles() {
    projectiles.length = 0;
}
