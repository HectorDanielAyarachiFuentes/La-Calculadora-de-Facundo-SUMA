// js/utils.js

export const SVG_WIDTH = 460;
export const COLUMN_WIDTH = 35;
export const END_X = SVG_WIDTH - 40;

export const Y_LABELS = 20;
export const Y_CARRY = 40;
export const Y_START = 70;
export const ROW_HEIGHT = 45;

export const HISTORY_STORAGE_KEY = 'facundoCalcHistory';
export const THEME_STORAGE_KEY = 'facundoCalcTheme';

/**
 * Crea un elemento SVG con los atributos dados y contenido opcional.
 * @param {string} tag - El nombre de la etiqueta SVG.
 * @param {object} attrs - Objeto de atributos a establecer en el elemento.
 * @param {string} [content] - Contenido de texto opcional para el elemento.
 * @returns {SVGElement} El elemento SVG creado.
 */
export function createSvgElement(tag, attrs, content) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    if (content !== undefined) el.textContent = content;
    return el;
}

const explanationTextElement = document.getElementById('explanation-text');

/**
 * Establece el texto de explicación con una animación de fade.
 * @param {string} text - El texto a mostrar.
 */
export function setExplanation(text) {
    if (!explanationTextElement) return;
    explanationTextElement.style.opacity = '0';
    setTimeout(() => {
        explanationTextElement.textContent = text;
        explanationTextElement.style.opacity = '1';
    }, 300);
}

/**
 * Espera un número de milisegundos.
 * @param {number} ms - El tiempo en milisegundos.
 * @returns {Promise<void>} Una promesa que se resuelve después del tiempo especificado.
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}