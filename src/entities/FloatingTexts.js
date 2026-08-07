import { ctx } from '../state.js';

export const floatingTexts = [];

export function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x: x, y: y, text: text, color: color, life: 40 });
}

export function handleFloatingTexts() {
    for (let i = 0; i < floatingTexts.length; i++) {
        let ft = floatingTexts[i];
        ft.y -= 1.2;
        ft.life--;
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.font = '800 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, ft.life / 40);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
            i--;
        }
    }
}

export function resetFloatingTexts() {
    floatingTexts.length = 0;
}
