// js/history.js

import { Elements } from './ui.js';
import { HISTORY_STORAGE_KEY } from './utils.js';

let calculationHistory = [];

/**
 * Guarda el historial de cálculos en el almacenamiento local.
 */
function saveHistoryToLocalStorage() {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(calculationHistory));
}

/**
 * Carga el historial de cálculos del almacenamiento local.
 */
export function loadHistory() {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
        calculationHistory = JSON.parse(savedHistory);
        renderHistory();
    }
}

/**
 * Renderiza el historial de cálculos en la lista de la UI.
 */
export function renderHistory() {
    Elements.historyList.innerHTML = '';
    if (calculationHistory.length > 0) {
        Elements.historySection.classList.remove('hidden');
        calculationHistory.forEach((calcData, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            li.textContent = calcData.originalNumbers.join(' + ').replace(/\./g, ',') + ` = ${calcData.resultString.replace('.', ',')}`;
            Elements.historyList.appendChild(li);
        });
    } else {
        Elements.historySection.classList.add('hidden');
    }
}

/**
 * Añade un nuevo cálculo al historial y lo guarda.
 * @param {object} calcData - Los datos del cálculo a añadir.
 */
export function addCalculationToHistory(calcData) {
    let result = BigInt(0);
    calcData.paddedNumbers.forEach(numStr => { result += BigInt(numStr); });
    let resultString = result.toString().padStart(calcData.decimalPosition + 1, '0');
    if (calcData.decimalPosition > 0) {
        const intPart = resultString.slice(0, -calcData.decimalPosition) || '0';
        const fracPart = resultString.slice(-calcData.decimalPosition);
        resultString = `${intPart}.${fracPart}`;
    }
    calcData.resultString = resultString;

    calculationHistory.unshift(calcData);
    saveHistoryToLocalStorage();
    renderHistory();
}

/**
 * Obtiene el historial de cálculos actual.
 * @returns {Array<object>} El array con los datos de los cálculos.
 */
export function getCalculationHistory() {
    return calculationHistory;
}