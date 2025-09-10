// js/main.js

import { Elements, UIState, addNumber as uiAddNumber, renderOperands as uiRenderOperands,
         handleDeleteNumber as uiHandleDeleteNumber, handleEnterEditMode as uiHandleEnterEditMode,
         handleSaveEdit as uiHandleSaveEdit, setUIMode, resetCalculator as uiResetCalculator } from './ui.js';

import { setExplanation } from './utils.js';
import { loadHistory, getCalculationHistory } from './history.js';
import { applyInitialTheme, toggleTheme } from './theme.js';
import { readRandomMotivation } from './voiceAssistant.js';
import { startCalculation, showStaticResult, resetCalculationState, currentCalculationData, procedureSteps, hasExplainedPaddingZero, setupProcedureHover } from './calculation.js';


// --- FUNCIONES DE CÁLCULO Y SVG (YA NO ESTÁN AQUÍ, IMPORTADAS DE calculation.js) ---
// Ahora se importan directamente o se llaman a través de los callbacks.

// --- CALLBACKS PARA ui.js ---
const uiCallbacks = {
    addNumberHandler: () => uiAddNumber(() => uiCallbacks.renderOperandsUI()),
    calculateHandler: () => startCalculation(UIState.numbersToSum),
    renderOperandsUI: () => uiRenderOperands(uiCallbacks.saveEditHandler, uiCallbacks.deleteNumberHandler, uiCallbacks.enterEditModeHandler),
    resetHandler: () => uiResetCalculator(uiCallbacks.renderOperandsUI, resetCalculationState),
    replayHandler: () => {
        // currentCalculationData es exportado desde calculation.js
        if (currentCalculationData) startCalculation(UIState.numbersToSum, currentCalculationData);
    },
    deleteNumberHandler: (index) => uiHandleDeleteNumber(index, uiCallbacks.renderOperandsUI),
    enterEditModeHandler: (index) => uiHandleEnterEditMode(index, uiCallbacks.renderOperandsUI),
    saveEditHandler: (event) => uiHandleSaveEdit(event, uiCallbacks.renderOperandsUI),
    historyClickHandler: (index) => showStaticResult(getCalculationHistory()[index]),
    motivationForKidHandler: () => readRandomMotivation('kid'),
    motivationForAdultHandler: () => readRandomMotivation('adult'),
    themeToggleHandler: toggleTheme,
};


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    applyInitialTheme();
    loadHistory();
    uiCallbacks.renderOperandsUI();
    setExplanation('Añade al menos dos números para empezar.');

    // Configurar los event listeners de UI
    Elements.addBtn.addEventListener('click', uiCallbacks.addNumberHandler);
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
    Elements.numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); uiCallbacks.addNumberHandler(); } });
    Elements.calculateBtn.addEventListener('click', uiCallbacks.calculateHandler);
    Elements.resetBtn.addEventListener('click', uiCallbacks.resetHandler);
    Elements.replayBtn.addEventListener('click', uiCallbacks.replayHandler);
    Elements.historyList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.index) {
            const index = parseInt(li.dataset.index, 10);
            uiCallbacks.historyClickHandler(index);

            // ✅ MEJORA UX: Scroll automático en móvil al ver un resultado del historial.
            if (window.innerWidth < 1024) {
                document.getElementById('whiteboard').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
    Elements.operandsContainer.addEventListener('click', (e) => {
        if (Elements.calculateBtn.disabled && UIState.editingIndex === null) return;
        if (e.target.classList.contains('delete-btn')) uiCallbacks.deleteNumberHandler(e.target.dataset.index);
        else if (e.target.classList.contains('operand-text')) uiCallbacks.enterEditModeHandler(e.target.dataset.index);
    });
    Elements.motivationForKidBtn.addEventListener('click', uiCallbacks.motivationForKidHandler);
    Elements.motivationForAdultBtn.addEventListener('click', uiCallbacks.motivationForAdultHandler);
    Elements.themeToggleBtn.addEventListener('click', uiCallbacks.themeToggleHandler);

    // Los event listeners del hover del procedimiento se configuran desde calculation.js
    // ya que necesitan acceso a `procedureSteps` que está en ese módulo.
    // Solo necesitamos asegurarnos de que `setupProcedureHover` se llame cuando sea necesario.
    // En este caso, se llama después de cada `renderProcedure` dentro de `calculation.js`.

    // ✅ MEJORA UX: Scroll automático en móvil al ver un paso del procedimiento.
    Elements.procedureList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        // Solo hacemos scroll si se hizo clic en un paso y estamos en móvil (ancho < 1024px).
        if (li && window.innerWidth < 1024) {
            document.getElementById('whiteboard').scrollIntoView({
                behavior: 'smooth', // Animación de scroll fluida.
                block: 'start'      // Alinea la pizarra al inicio de la pantalla.
            });
        }
    });
});

// Manejo del botón de compartir de Facebook (considerar mover a un social.js si se añaden más)
window.fbAsyncInit = function() {
    FB.init({
        appId: '750701624513110', // Tu App ID
        xfbml: true,
        version: 'v18.0'
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const customFbShareBtn = document.getElementById('custom-fb-share-btn');
    if (customFbShareBtn) {
        customFbShareBtn.onclick = function() {
            FB.ui({
                method: 'share',
                href: 'https://hectordanielayarachifuentes.github.io/La-Calculadora-de-Facundo-SUMA/',
            }, function(response){});
        }
    }
});