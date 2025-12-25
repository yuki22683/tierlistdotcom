export const getContrastColor = (hexColor: string) => {
    if (!hexColor) return 'white';
    const hex = hexColor.replace('#', '');
    // Handle shorthand hex #F00
    const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'white';

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'black' : 'white';
}
