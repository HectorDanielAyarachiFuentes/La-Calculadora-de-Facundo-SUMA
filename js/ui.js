// js/ui.js

import { setExplanation } from './utils.js';

// --- 1. SELECCIÓN DE ELEMENTOS ---
export const Elements = {
    numberInput: document.getElementById('numberInput'),
    addBtn: document.getElementById('addBtn'),
    calculateBtn: document.getElementById('calculateBtn'),
    resetBtn: document.getElementById('resetBtn'),
    replayBtn: document.getElementById('replayBtn'),
    svg: document.getElementById('calculation-svg'),
    explanationText: document.getElementById('explanation-text'), // Ya se usa en utils, pero se puede tener aquí para consistencia
    historyList: document.getElementById('history-list'),
    historySection: document.getElementById('history-section'),
    operandsContainer: document.getElementById('operands-container'),
    inputContainer: document.getElementById('input-container'),
    procedureSection: document.getElementById('procedure-section'),
    procedureList: document.getElementById('procedure-list'),
    motivationForKidBtn: document.getElementById('motivationForKid'),
    motivationForAdultBtn: document.getElementById('motivationForAdult'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
};

// --- 2. ESTADO GLOBAL DE UI ---
export const UIState = {
    numbersToSum: [],
    editingIndex: null,
};

// --- 4. LÓGICA DE LA INTERFAZ ---

/**
 * Añade un número a la lista de números a sumar.
 * @param {function} renderOperandsCallback - Callback para renderizar los operandos después de añadir.
 */
export function addNumber(renderOperandsCallback) {
    const value = Elements.numberInput.value.trim().replace(',', '.');
    if (value && isFinite(Number(value))) {
        UIState.numbersToSum.push(value);
        renderOperandsCallback();
        Elements.numberInput.value = '';
        Elements.numberInput.focus();
    } else {
        setExplanation(`"${Elements.numberInput.value}" no es un número válido.`);
    }
}

/**
 * Renderiza la lista de operandos en la UI.
 * @param {function} handleSaveEditCallback - Callback para guardar la edición de un número.
 * @param {function} handleDeleteNumberCallback - Callback para eliminar un número.
 * @param {function} handleEnterEditModeCallback - Callback para entrar en modo edición.
 */
export function renderOperands(handleSaveEditCallback, handleDeleteNumberCallback, handleEnterEditModeCallback) {
    Elements.operandsContainer.innerHTML = '';
    if (UIState.numbersToSum.length === 0) {
        Elements.operandsContainer.innerHTML = `<div style="color: #ccc; font-size: 1.2rem; width:100%; text-align:center; font-weight:400; padding: 4rem 0;">Tu suma aparecerá aquí</div>`;
    }

    UIState.numbersToSum.forEach((num, index) => {
        const item = document.createElement('div');
        item.className = 'operand-item';
        const deleteButtonHTML = `<button class="delete-btn" data-index="${index}">×</button>`;
        if (index === UIState.editingIndex) {
            item.innerHTML = `<input type="text" class="edit-input" value="${num.replace('.', ',')}" /> ${deleteButtonHTML}`;
            const input = item.querySelector('.edit-input');
            setTimeout(() => { input.focus(); input.select(); }, 0);
            input.addEventListener('blur', handleSaveEditCallback);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                if (e.key === 'Escape') { UIState.editingIndex = null; renderOperands(handleSaveEditCallback, handleDeleteNumberCallback, handleEnterEditModeCallback); }
            });
        } else {
            item.innerHTML = `<span class="operand-text" data-index="${index}">${num.replace('.', ',')}</span> ${deleteButtonHTML}`;
        }
        Elements.operandsContainer.appendChild(item);
    });

    Elements.calculateBtn.disabled = UIState.numbersToSum.length < 2 || UIState.editingIndex !== null;
    if (UIState.editingIndex !== null) {
        setExplanation("Editando... Pulsa Enter para guardar, o Esc para cancelar.");
    } else if (UIState.numbersToSum.length >= 2) {
        setExplanation("¡Listo para sumar! O sigue añadiendo números.");
    } else {
        setExplanation('Añade al menos dos números para empezar.');
    }
}

/**
 * Elimina un número de la lista.
 * @param {number} index - El índice del número a eliminar.
 * @param {function} renderOperandsCallback - Callback para renderizar los operandos después de eliminar.
 */
export function handleDeleteNumber(index, renderOperandsCallback) {
    UIState.editingIndex = null;
    UIState.numbersToSum.splice(index, 1);
    renderOperandsCallback();
}

/**
 * Entra en modo de edición para un número específico.
 * @param {number} index - El índice del número a editar.
 * @param {function} renderOperandsCallback - Callback para renderizar los operandos en modo edición.
 */
export function handleEnterEditMode(index, renderOperandsCallback) {
    UIState.editingIndex = parseInt(index, 10);
    renderOperandsCallback();
}

/**
 * Guarda el número editado.
 * @param {Event} event - El evento blur del input.
 * @param {function} renderOperandsCallback - Callback para renderizar los operandos después de guardar.
 */
export function handleSaveEdit(event, renderOperandsCallback) {
    const input = event.target;
    const index = UIState.editingIndex;
    if (index === null) return;
    const newValue = input.value.trim().replace(',', '.');
    if (newValue && isFinite(Number(newValue))) {
        UIState.numbersToSum[index] = newValue;
    } else {
        setExplanation(`"${input.value}" no es válido. Se restauró el valor anterior.`);
    }
    UIState.editingIndex = null;
    renderOperandsCallback();
}

/**
 * Cambia el modo de la interfaz (input o resultado).
 * @param {'input'|'calculating'|'result'} mode - El modo a establecer.
 */
export function setUIMode(mode) {
    Elements.inputContainer.classList.toggle('hidden', mode !== 'input');
    Elements.addBtn.classList.toggle('hidden', mode !== 'input'); // AddBtn también es parte del input
    Elements.calculateBtn.classList.toggle('hidden', mode !== 'input');
    Elements.replayBtn.classList.toggle('hidden', mode !== 'result');
    Elements.operandsContainer.classList.toggle('hidden', mode !== 'input');
    Elements.svg.classList.toggle('hidden', mode === 'input');
    Elements.procedureSection.classList.toggle('hidden', mode !== 'result'); // Ocultar al cambiar de modo
    if (mode === 'input') {
        Elements.procedureList.innerHTML = '';
        Elements.svg.innerHTML = '';
    }
}

/**
 * Reinicia la calculadora a su estado inicial.
 * @param {function} renderOperandsCallback - Callback para renderizar los operandos después del reseteo.
 * @param {function} resetCalculationStateCallback - Callback para resetear el estado de cálculo global.
 */
export function resetCalculator(renderOperandsCallback, resetCalculationStateCallback) {
    UIState.numbersToSum = [];
    UIState.editingIndex = null;
    resetCalculationStateCallback(); // Llama a la función que resetea el estado de cálculo
    setUIMode('input');
    renderOperandsCallback();
    setExplanation('Añade al menos dos números para empezar.');
}


// Lógica para los eventos de mouse en la lista de procedimientos (se moverá)
export function setupProcedureHover() {
    Elements.procedureList.addEventListener('mouseover', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.stepIndex) {
            const stepIndex = parseInt(li.dataset.stepIndex, 10);
            // La data de procedureSteps debe ser accesible aquí o pasarse como argumento
            // Por ahora, asumimos que se accederá globalmente o se pasará
            // Esto se refinará cuando integremos calculation.js
            // let stepData = procedureSteps[stepIndex]; // Ejemplo de cómo se accedería
            // if (stepData && Elements.svg.querySelector('#highlight-rect')) {
            //     Elements.svg.querySelector('#highlight-rect').setAttribute('x', stepData.x - COLUMN_WIDTH / 2);
            // }
        }
    });

    Elements.procedureList.addEventListener('mouseout', () => {
        const highlightRect = Elements.svg.querySelector('#highlight-rect');
        if (highlightRect) highlightRect.setAttribute('x', -1000);
    });
}


/**
 * Inicializa los manejadores de eventos básicos de UI.
 * @param {object} callbacks - Objeto con callbacks para las acciones principales.
 * @param {function} callbacks.addNumberHandler - Manejador para añadir números.
 * @param {function} callbacks.calculateHandler - Manejador para iniciar el cálculo.
 * @param {function} callbacks.resetHandler - Manejador para resetear la calculadora.
 * @param {function} callbacks.replayHandler - Manejador para repetir el cálculo.
 * @param {function} callbacks.deleteNumberHandler - Manejador para eliminar números.
 * @param {function} callbacks.enterEditModeHandler - Manejador para entrar en modo edición.
 * @param {function} callbacks.saveEditHandler - Manejador para guardar edición.
 * @param {function} callbacks.motivationForKidHandler - Manejador para motivación infantil.
 * @param {function} callbacks.motivationForAdultHandler - Manejador para motivación adulta.
 * @param {function} callbacks.themeToggleHandler - Manejador para cambiar el tema.
 * @param {function} callbacks.historyClickHandler - Manejador para clics en el historial.
 * @param {function} callbacks.renderOperandsUI - Funcion para renderizar los operandos.
 */
export function setupUIEventListeners(callbacks) {
    Elements.addBtn.addEventListener('click', callbacks.addNumberHandler);

    Elements.numberInput.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/,/g, '.');
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        e.target.value = value;
    });

    Elements.numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); callbacks.addNumberHandler(); } });
    Elements.calculateBtn.addEventListener('click', callbacks.calculateHandler);
    Elements.resetBtn.addEventListener('click', callbacks.resetHandler);
    Elements.replayBtn.addEventListener('click', callbacks.replayHandler);

    Elements.historyList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.index) {
            const index = parseInt(li.dataset.index, 10);
            callbacks.historyClickHandler(index);
        }
    });

    Elements.operandsContainer.addEventListener('click', (e) => {
        if (Elements.calculateBtn.disabled && UIState.editingIndex === null) return;
        if (e.target.classList.contains('delete-btn')) callbacks.deleteNumberHandler(e.target.dataset.index);
        else if (e.target.classList.contains('operand-text')) callbacks.enterEditModeHandler(e.target.dataset.index);
    });

    Elements.motivationForKidBtn.addEventListener('click', callbacks.motivationForKidHandler);
    Elements.motivationForAdultBtn.addEventListener('click', callbacks.motivationForAdultHandler);
    Elements.themeToggleBtn.addEventListener('click', callbacks.themeToggleHandler);

    // Los event listeners para el hover del procedimiento se añadirán en la lógica de cálculo
    // ya que necesitan acceso a `procedureSteps`
}