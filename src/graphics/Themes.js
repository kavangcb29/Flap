export const skins = [
    { name: 'Neon Pink', body: '#f72585', tail: '#b5179e', wing: '#4cc9f0' },
    { name: 'Golden Bomber', body: '#FFD700', tail: '#DAA520', wing: '#FFFFFF' },
    { name: 'Cyan Jet', body: '#00FFFF', tail: '#008B8B', wing: '#FFFFFF' },
    { name: 'Stealth Black', body: '#1a1a1a', tail: '#333333', wing: '#e74c3c' }
];

export let currentTheme = {
    name: 'Nature',
    bg: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 60%, #A5D6A7 100%)',
    mountains: '#2c3e50',
    pipe: '#2ECC71', pipeBorder: '#27ae60',
    planeBody: '#f72585', planeTail: '#b5179e', planeWing: '#4cc9f0'
};

export function setCurrentTheme(theme) {
    currentTheme = theme;
}
