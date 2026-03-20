// js/main.js

import { Elements, UIState, addNumber as uiAddNumber, renderOperands as uiRenderOperands,
         handleDeleteNumber as uiHandleDeleteNumber, handleEnterEditMode as uiHandleEnterEditMode,
         handleSaveEdit as uiHandleSaveEdit, setUIMode, resetCalculator as uiResetCalculator } from './ui.js';

import { setExplanation, setSpeedMultiplier } from './utils.js';
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

    if (Elements.practiceModeToggle) {
        Elements.practiceModeToggle.addEventListener('change', (e) => {
            UIState.isPracticeMode = e.target.checked;
            // Si el niño ya está en media suma o terminó la suma, reiniciar automáticamente
            if (currentCalculationData) {
                if (window.speechSynthesis) window.speechSynthesis.cancel(); // Detener voz anterior
                uiCallbacks.replayHandler();
            }
        });
    }

    if (Elements.speedBtns) {
        Elements.speedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                Elements.speedBtns.forEach(b => b.classList.remove('active'));
                const targetBtn = e.currentTarget;
                targetBtn.classList.add('active');
                setSpeedMultiplier(parseFloat(targetBtn.dataset.speed));
            });
        });
    }

    if (Elements.downloadBtn) {
        Elements.downloadBtn.addEventListener('click', () => {
            if (!currentCalculationData || !currentCalculationData.resultString) return;
            try {
                drawSumCard(currentCalculationData);
            } catch (error) {
                console.error('Error al generar la tarjeta:', error);
            }
        });
    }

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

// ─── DESCARGA: Tarjeta Premium con Canvas 2D ─────────────────────────────────
/**
 * Genera y descarga una tarjeta visual de suma con diseño premium.
 * @param {object} calcData - Datos del cálculo actual.
 */
function drawSumCard(calcData) {
    const { paddedNumbers, decimalPosition, originalNumbers, resultString, isPaddingZeroMatrix } = calcData;
    const isDarkMode = document.body.classList.contains('dark-mode');

    // ── Parámetros de diseño ──────────────────────────────────────────────────
    const SCALE = 2;
    const CARD_W = 900;                // Más ancho para acomodar procedimiento
    const DIGIT_FONT_SIZE = 46;
    const COL_W = 48;
    const ROW_H = 60;
    const LABEL_FONT_SIZE = 14;
    const PAD_TOP = 76;
    const LABEL_GAP = 36;              // Distancia etiqueta→dígito (más espacio)
    const ROWS_START_Y = PAD_TOP + 50 + LABEL_GAP;

    const numDigits = paddedNumbers[0].length;
    const numRows   = paddedNumbers.length;

    // Pasos del procedimiento (importados como binding live)
    const steps = procedureSteps || [];

    const calcAreaH = ROWS_START_Y + (numRows + 1) * ROW_H + 90;

    // Panel izquierdo
    const PROC_W     = 310;
    const PROC_PAD   = 22;
    const STEP_LINE_H = 22;
    const PROC_TOP   = PAD_TOP + 20;
    const procAreaH  = PROC_TOP + steps.length * STEP_LINE_H + 60;

    const CARD_H = Math.max(calcAreaH, procAreaH) + 10;
    const calcLeft = steps.length > 0 ? PROC_W + 14 : 0;

    const canvas = document.createElement('canvas');
    canvas.width  = CARD_W * SCALE;
    canvas.height = CARD_H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // ── Fondo ─────────────────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, '#1e2435');
    bg.addColorStop(1, '#2a3655');
    roundRect(ctx, 0, 0, CARD_W, CARD_H, 20);
    ctx.fillStyle = bg;
    ctx.fill();

    // ── Franja superior tricolor ──────────────────────────────────────────────
    const stripGrad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    stripGrad.addColorStop(0, '#6e48aa');
    stripGrad.addColorStop(0.5, '#4a90d9');
    stripGrad.addColorStop(1, '#20c997');
    roundRect(ctx, 0, 0, CARD_W, 6, { tl: 20, tr: 20, bl: 0, br: 0 });
    ctx.fillStyle = stripGrad;
    ctx.fill();

    // ── Título ────────────────────────────────────────────────────────────────
    ctx.font = `700 21px 'Nunito', 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('🧮 La Calculadora de Facundo +', CARD_W / 2, 44);

    // ── Separador vertical ───────────────────────────────────────────────────-
    if (steps.length > 0) {
        ctx.beginPath();
        ctx.moveTo(calcLeft, PAD_TOP + 10);
        ctx.lineTo(calcLeft, CARD_H - 30);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── Panel izquierdo: Procedimiento ───────────────────────────────────────-
    if (steps.length > 0) {
        ctx.font = `700 12px 'Nunito', 'Segoe UI', sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.textAlign = 'left';
        ctx.fillText('PROCEDIMIENTO', PROC_PAD, PROC_TOP);

        ctx.beginPath();
        ctx.moveTo(PROC_PAD, PROC_TOP + 7);
        ctx.lineTo(PROC_W - PROC_PAD, PROC_TOP + 7);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const intLabelsProc = ['unidades', 'decenas', 'centenas', 'u. mil', 'd. mil'];
        const decLabelsProc = ['décimos', 'centésimos', 'milésimos'];
        const getColName = (idx) => {
            if (idx < decimalPosition) return decLabelsProc[decimalPosition - 1 - idx] || `dec${idx}`;
            return intLabelsProc[idx - decimalPosition] || `col${idx}`;
        };

        steps.forEach((step, idx) => {
            const sy = PROC_TOP + 24 + idx * STEP_LINE_H;
            // Bullet
            ctx.beginPath();
            ctx.arc(PROC_PAD + 5, sy - 4, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = idx % 2 === 0 ? '#4a90d9' : '#20c997';
            ctx.fill();

            let text;
            if (step.isFinalCarry) {
                ctx.fillStyle = '#f97316';
                text = `Llevada ${step.carryIn} baja → ${step.resultDigit}`;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.72)';
                const col = getColName(step.stepIndex);
                const carry = step.carryIn > 0 ? `+${step.carryIn}↑ ` : '';
                text = `${col}: ${step.digits.join('+')} ${carry}= ${step.sum} → ${step.resultDigit}`;
            }

            ctx.font = `500 11.5px 'Nunito', 'Segoe UI', sans-serif`;
            ctx.textAlign = 'left';
            ctx.save();
            ctx.beginPath();
            ctx.rect(PROC_PAD + 13, sy - 14, PROC_W - PROC_PAD - 13, STEP_LINE_H);
            ctx.clip();
            ctx.fillText(text, PROC_PAD + 14, sy - 1);
            ctx.restore();
        });
    }

    // ── Columnas de la suma (alineadas a la derecha de la tarjeta) ────────────
    const contentRight = CARD_W - 28;
    const colX = (i) => contentRight - i * COL_W;

    // ── Etiquetas de valor posicional (BIEN SEPARADAS — LABEL_GAP px sobre dígitos) ──
    const intLabels = ['U', 'D', 'C', 'UM', 'DM', 'CM'];
    const decLabels = ['d', 'c', 'm'];
    const labelY = ROWS_START_Y - LABEL_GAP;   // ← separadas hacia arriba

    ctx.textAlign = 'center';
    for (let i = 0; i < numDigits; i++) {
        let label = '';
        if (i < decimalPosition) {
            label = decLabels[decimalPosition - 1 - i] || '';
        } else {
            label = intLabels[i - decimalPosition] || '';
        }
        if (!label) continue;
        ctx.font = `700 ${LABEL_FONT_SIZE}px 'Nunito', 'Segoe UI', sans-serif`;
        ctx.fillStyle = i < decimalPosition ? 'rgba(32,201,151,0.75)' : 'rgba(74,144,217,0.75)';
        ctx.fillText(label, colX(i), labelY);
    }

    // Línea sutil bajo las etiquetas
    ctx.beginPath();
    ctx.moveTo(colX(numDigits - 1) - COL_W * 0.4, labelY + 6);
    ctx.lineTo(colX(0) + COL_W * 0.4, labelY + 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Helper punto decimal ──────────────────────────────────────────────────
    const drawDecimalAt = (y, color = 'rgba(255,255,255,0.8)') => {
        if (decimalPosition > 0) {
            ctx.font = `700 ${DIGIT_FONT_SIZE}px 'Courier New', monospace`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText('.', colX(decimalPosition) + COL_W / 2, y);
        }
    };

    // ── Números operandos ─────────────────────────────────────────────────────
    const colors = ['#4a90d9', '#20c997', '#a855f7', '#f97316', '#ec4899'];
    for (let row = 0; row < numRows; row++) {
        const y = ROWS_START_Y + row * ROW_H;
        const baseColor = colors[row % colors.length];
        const paddingMatrix = isPaddingZeroMatrix ? isPaddingZeroMatrix[row] : null;

        ctx.textAlign = 'center';
        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i;
            const digit = paddedNumbers[row][digitIndex];
            const isPad = paddingMatrix && paddingMatrix[digitIndex];
            ctx.font = `700 ${DIGIT_FONT_SIZE}px 'Courier New', monospace`;
            ctx.fillStyle = isPad ? `${baseColor}44` : baseColor;
            ctx.fillText(digit, colX(i), y);
        }
        drawDecimalAt(y);

        if (numRows > 1 && row === numRows - 1) {
            const plusX = contentRight - numDigits * COL_W - COL_W * 0.4;
            ctx.font = `400 ${DIGIT_FONT_SIZE * 0.8}px 'Nunito', sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.textAlign = 'center';
            ctx.fillText('+', plusX, y);
        }
    }

    // ── Línea divisoria ───────────────────────────────────────────────────────
    const lineY = ROWS_START_Y + numRows * ROW_H - ROW_H * 0.2;
    const lineStartX = contentRight - numDigits * COL_W - COL_W;
    const lineEndX   = contentRight + COL_W * 0.3;
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY);
    ctx.lineTo(lineEndX, lineY);
    const lineGrad = ctx.createLinearGradient(lineStartX, 0, lineEndX, 0);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
    lineGrad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    lineGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Resultado ─────────────────────────────────────────────────────────────
    const resultY = ROWS_START_Y + (numRows + 1) * ROW_H - 8;
    const resultStr = resultString.replace('.', '');
    ctx.shadowColor = '#20e3a5';
    ctx.shadowBlur = 20;
    ctx.font = `900 ${DIGIT_FONT_SIZE}px 'Courier New', monospace`;
    ctx.fillStyle = '#20e3a5';
    ctx.textAlign = 'center';
    for (let i = 0; i < resultStr.length; i++) {
        ctx.fillText(resultStr[resultStr.length - 1 - i], colX(i), resultY);
    }
    if (decimalPosition > 0) {
        ctx.font = `700 ${DIGIT_FONT_SIZE}px 'Courier New', monospace`;
        ctx.fillText('.', colX(decimalPosition) + COL_W / 2, resultY);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // ── Expresión resumida ────────────────────────────────────────────────────
    const exprY = resultY + 36;
    const expr = originalNumbers.join(' + ').replace(/\./g, ',') + ' = ' + resultString.replace('.', ',');
    ctx.font = `600 15px 'Nunito', 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText(expr, (calcLeft + CARD_W) / 2, exprY);

    // ── Branding pie ──────────────────────────────────────────────────────────
    const brandY = CARD_H - 18;
    ctx.font = `400 12px 'Nunito', 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText('calculadorafacundo.github.io', CARD_W / 2, brandY);

    // ── Descargar ─────────────────────────────────────────────────────────────
    canvas.toBlob((blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Suma_Facundo_${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

/**
 * Dibuja un rectángulo redondeado. Acepta radios individuales o uno solo.
 */
function roundRect(ctx, x, y, w, h, radii) {
    const r = typeof radii === 'number'
        ? { tl: radii, tr: radii, br: radii, bl: radii }
        : radii;
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
    ctx.lineTo(x + r.bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.arcTo(x, y, x + r.tl, y, r.tl);
    ctx.closePath();
}