// Shared helpers used across game client modules.
export function requireElement(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Missing required element: #${id}`);
    return element;
}
export function requireCanvas(id) {
    const element = requireElement(id);
    if (!(element instanceof HTMLCanvasElement)) {
        throw new Error(`Expected #${id} to be a canvas element`);
    }
    return element;
}
export function safeParseJson(payload) {
    try {
        return JSON.parse(payload);
    }
    catch {
        return null;
    }
}
export function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
}
