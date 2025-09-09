// js/theme.js

import { Elements } from './ui.js';
import { THEME_STORAGE_KEY } from './utils.js';

/**
 * Alterna entre el tema claro y oscuro.
 */
export function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    updateThemeButton(isDarkMode);
}

/**
 * Actualiza el icono del botón de alternancia de tema.
 * @param {boolean} isDarkMode - `true` si el tema es oscuro, `false` si es claro.
 */
export function updateThemeButton(isDarkMode) {
    Elements.themeToggleBtn.innerHTML = isDarkMode ? '☀️' : '🌙';
    Elements.themeToggleBtn.setAttribute('aria-label', isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
}

/**
 * Aplica el tema inicial al cargar la página.
 * Intenta cargar el tema guardado en localStorage o detecta la preferencia del sistema.
 */
export function applyInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let isDarkMode = false;

    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
    } else {
        isDarkMode = prefersDark;
    }

    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateThemeButton(isDarkMode);
}