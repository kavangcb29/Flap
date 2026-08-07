import { ctx } from '../state.js';

// Pre-allocate 50 text objects
export const textPool = Array.from({ length: 50 }, () => ({ active: false }));

function getFreeText() {
    for (let i = 0; i < textPool.length; i++) {
        if (!textPool[i].active) return textPool[i];
    }
    return null;
}

export function addFloatingText(x, y, text, color) {
    const t = getFreeText();
    if (!t) return;
    t.active = true;
    t.x = x;
    t.y = y;
    t.text = text;
    t.color = color || '#fff';
    t.life = 60;
    t.vy = -1.5;
}

export function handleFloatingTexts() {
    for (let i = 0; i < textPool.length; i++) {
        let ft = textPool[i];
        if (!ft.active) continue;
        
        ft.y += ft.vy;
        ft.life--;
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life / 60);
        ctx.fillStyle = ft.color;
        ctx.font = '900 24px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        
        if (ft.life <= 0) {
            ft.active = false;
        }
    }
}

export function resetFloatingTexts() {
    for (let i = 0; i < textPool.length; i++) {
        textPool[i].active = false;
    }
}
