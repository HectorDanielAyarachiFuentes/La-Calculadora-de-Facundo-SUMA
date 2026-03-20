// js/calculation.js

import { Elements, setUIMode, UIState } from './ui.js';
import { setExplanation, createSvgElement, sleep, SVG_WIDTH, COLUMN_WIDTH, END_X, Y_LABELS, Y_CARRY, Y_START, ROW_HEIGHT } from './utils.js';
import { addCalculationToHistory, getCalculationHistory } from './history.js';
import { setupVoiceReader, leerEnVoz } from './voiceAssistant.js';

// --- ESTADO GLOBAL DE CÁLCULO DENTRO DEL MÓDULO ---
export let currentCalculationData = null;
export let procedureSteps = [];
export let hasExplainedPaddingZero = false; // Para el tutor de voz
let currentCalculationId = 0; // Token para abortar cálculos huérfanos

/**
 * Resetea el estado de cálculo a sus valores iniciales.
 */
export function resetCalculationState() {
    currentCalculationData = null;
    procedureSteps = [];
    hasExplainedPaddingZero = false;
    currentCalculationId++; // Aborta cualquier cálculo previo en curso
    Elements.svg.innerHTML = ''; // Limpiar SVG al resetear
    Elements.procedureList.innerHTML = ''; // Limpiar lista de procedimientos
    Elements.procedureSection.classList.add('hidden'); // Ocultar sección de procedimiento
}

/**
 * Inicia el proceso de cálculo, ya sea una nueva suma o una repetición.
 * @param {Array<string>} numbersToSum - Los números originales a sumar.
 * @param {object} [replayData=null] - Datos de cálculo previos para repetición.
 * @returns {Promise<void>}
 */
export async function startCalculation(numbersToSum, replayData = null) {
    currentCalculationId++; 
    const myCalcId = currentCalculationId;

    setUIMode('calculating');
    Elements.procedureSection.classList.add('hidden');
    Elements.procedureList.innerHTML = '';
    hasExplainedPaddingZero = false;
    let calculationData;

    if (replayData) {
        calculationData = replayData;
    } else {
        let maxIntLength = 0;
        let maxFracLength = 0;
        numbersToSum.forEach(num => {
            const parts = num.split('.');
            const intPart = parts[0] || '0';
            const fracPart = parts[1] || '';
            if (intPart.length > maxIntLength) maxIntLength = intPart.length;
            if (fracPart.length > maxFracLength) maxFracLength = fracPart.length;
        });

        const paddedNumbers = [];
        const isPaddingZeroMatrix = [];

        numbersToSum.forEach(num => {
            const parts = num.split('.');
            const intPart = parts[0] || '0';
            const fracPart = parts[1] || '';

            const paddedInt = intPart.padStart(maxIntLength, '0');
            const paddedFrac = fracPart.padEnd(maxFracLength, '0');
            paddedNumbers.push(paddedInt + paddedFrac);

            // Determinar ceros de relleno para la matriz
            const rowPadding = new Array(maxIntLength + maxFracLength).fill(false);
            
            // Ceros de relleno en la parte entera (izquierda)
            for(let k = 0; k < maxIntLength - intPart.length; k++) {
                rowPadding[k] = true;
            }
            // Ceros de relleno en la parte fraccionaria (derecha)
            for(let k = 0; k < maxFracLength - fracPart.length; k++) {
                rowPadding[maxIntLength + fracPart.length + k] = true;
            }
            isPaddingZeroMatrix.push(rowPadding);
        });

        calculationData = {
            paddedNumbers,
            decimalPosition: maxFracLength,
            originalNumbers: [...numbersToSum],
            isPaddingZeroMatrix
        };
        addCalculationToHistory(calculationData);
    }

    currentCalculationData = calculationData;
    const { paddedNumbers, decimalPosition } = currentCalculationData;
    await animateMultiSum(paddedNumbers, decimalPosition, myCalcId);

    if (currentCalculationId === myCalcId) {
        setUIMode('result');
        renderProcedure();
        setupVoiceReaderForCurrentCalculation();
        setupProcedureHover();
    }
}

/**
 * Anima la suma multi-línea paso a paso.
 * @param {Array<string>} paddedNumbers - Los números ya alineados con ceros.
 * @param {number} decimalPos - La posición del punto decimal.
 * @returns {Promise<void>}
 */
async function animateMultiSum(paddedNumbers, decimalPos, myCalcId) {
    procedureSteps = [];
    const numDigits = paddedNumbers[0].length;
    const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
    Elements.svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);
    Elements.svg.innerHTML = '';
    setupMultiLineSVG(paddedNumbers, decimalPos);
    await performMultiLineStepByStep(paddedNumbers, decimalPos, myCalcId);
}

/**
 * Pide al usuario que ingrese un número durante el Modo Práctica (Promesa).
 */
async function requireUserInput(x, y, correctAnswer, type) {
    return new Promise((resolve) => {
        // Columna es de 35px. Caja un poco más ancha para estar cómoda pero no solapar.
        const boxWidth = 38;
        const boxHeight = 48;
        
        const fo = createSvgElement('foreignObject', {
            x: x - boxWidth / 2, 
            y: y - boxHeight / 2, 
            width: boxWidth,
            height: boxHeight,
            style: 'overflow: visible;' // Para no recortar el box-shadow (resplandor)
        });
        
        const inputDiv = document.createElement('div');
        inputDiv.style.width = '100%';
        inputDiv.style.height = '100%';
        inputDiv.style.display = 'flex';
        inputDiv.style.alignItems = 'center';
        inputDiv.style.justifyContent = 'center';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'practice-input-overlay';
        input.style.width = '100%';
        input.style.height = '100%';
        
        if (type === 'carry') {
            input.style.fontSize = '20px';
            input.style.borderColor = '#3B82F6'; 
            input.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.6)';
        } else {
            input.style.fontSize = '26px';
        }
        
        inputDiv.appendChild(input);
        fo.appendChild(inputDiv);
        Elements.svg.appendChild(fo);
        
        setTimeout(() => input.focus(), 50);
        
        function checkAnswer() {
            if (input.value === '') return;
            if (parseInt(input.value, 10) === correctAnswer) {
                leerEnVoz(['¡Correcto!', '¡Muy bien!', '¡Excelente!'][Math.floor(Math.random() * 3)]);
                Elements.svg.removeChild(fo);
                resolve();
            } else {
                input.classList.remove('shake-error');
                void input.offsetWidth;
                input.classList.add('shake-error');
                leerEnVoz('Intenta otra vez.');
                input.value = '';
            }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
        
        input.addEventListener('input', () => {
             if (input.value.length >= correctAnswer.toString().length) {
                 checkAnswer();
             }
        });
    });
}

/**
 * Realiza la suma columna por columna con animaciones.
 * @param {Array<string>} paddedNumbers - Los números alineados.
 * @param {number} decimalPos - La posición del punto decimal.
 * @returns {Promise<void>}
 */
async function performMultiLineStepByStep(paddedNumbers, decimalPos, myCalcId) {
    let carry = 0;
    const numDigits = paddedNumbers[0].length;
    const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
    let allCarries = [];

    for (let i = 0; i < numDigits; i++) {
        if (currentCalculationId !== myCalcId) return; // Abortar si hubo reinicio
        const digitIndex = numDigits - 1 - i;
        const x = END_X - (i * COLUMN_WIDTH);
        Elements.svg.querySelector('#highlight-rect')?.setAttribute('x', x - COLUMN_WIDTH / 2);
        
        if (!UIState.isPracticeMode) {
            await sleep(1200);
            if (currentCalculationId !== myCalcId) return; // Abortar tras pausa
        }

        let columnSum = carry;
        let explanationDigits = [];
        paddedNumbers.forEach(numStr => {
            const digit = parseInt(numStr[digitIndex]);
            columnSum += digit;
            explanationDigits.push(digit);
        });

        const digitForColumn = columnSum % 10;
        const newCarry = Math.floor(columnSum / 10);
        procedureSteps.push({ digits: explanationDigits, carryIn: carry, sum: columnSum, resultDigit: digitForColumn, carryOut: newCarry, x, stepIndex: i });
        carry = newCarry;

        setExplanation(`Columna: ...${columnSum}. Se escribe ${digitForColumn}, se lleva ${carry}.`);
        
        if (UIState.isPracticeMode) {
            setExplanation(`¡Tu turno! ¿Cuánto es la suma principal de esta columna?`);
            await requireUserInput(x, resultY, digitForColumn, 'result');
            if (currentCalculationId !== myCalcId) return; // Abortar si cambiaron en medio del input
        }
        
        Elements.svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digitForColumn));

        const prevCarryElement = Elements.svg.querySelector('.carry-text');
        if (prevCarryElement) prevCarryElement.remove();
        if (carry > 0) {
            allCarries.push({ value: carry, x: x - COLUMN_WIDTH });
            
            if (UIState.isPracticeMode) {
                setExplanation(`¿Y cuánto nos llevamos a la siguiente columna?`);
                await requireUserInput(x - COLUMN_WIDTH, Y_CARRY, carry, 'carry');
                if (currentCalculationId !== myCalcId) return;
            }
            
            Elements.svg.appendChild(createSvgElement('text', { x: x - COLUMN_WIDTH, y: Y_CARRY, class: 'digit carry-text' }, carry));
        }
        
        if (!UIState.isPracticeMode) {
            await sleep(1500);
        } else {
            await sleep(400); // Pausa corta tras el éxito en modo práctica
        }
    }

    if (currentCalculationId !== myCalcId) return;

    if (carry > 0) {
        setExplanation(`¡Casi terminamos! Agregamos la llevada que nos quedó, el ${carry}. Como no hay más que sumar, la ponemos abajo.`);
        
        const finalX = END_X - (numDigits * COLUMN_WIDTH);
        if (UIState.isPracticeMode) {
            setExplanation(`El último paso. ¿Qué número baja directo?`);
            await requireUserInput(finalX, resultY, carry, 'result');
            if (currentCalculationId !== myCalcId) return;
        } else {
            await sleep(1500);
            if (currentCalculationId !== myCalcId) return;
        }
        Elements.svg.appendChild(createSvgElement('text', { x: finalX, y: resultY, class: 'digit result-text' }, carry));
        procedureSteps.push({
            digits: [],
            carryIn: carry,
            sum: carry,
            resultDigit: carry,
            carryOut: 0,
            x: END_X - (numDigits * COLUMN_WIDTH),
            isFinalCarry: true,
            stepIndex: numDigits
        });
    } else {
        setExplanation("¡Muy bien! Y como no nos llevamos nada, la cuenta está terminada.");
        await sleep(1500);
    }
    
    if (currentCalculationId !== myCalcId) return;

    Elements.svg.querySelector('#highlight-rect')?.setAttribute('x', -1000);
    const finalFloatingCarry = Elements.svg.querySelector('.carry-text');
    if (finalFloatingCarry) finalFloatingCarry.remove();
    allCarries.forEach(c => Elements.svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value)));

    if (decimalPos > 0) {
        const decimalResultX = END_X - (decimalPos * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
        Elements.svg.appendChild(createSvgElement('text', { x: decimalResultX, y: resultY, class: 'decimal-point' }, '.'));
    }
}

/**
 * Muestra el resultado de un cálculo anterior de forma estática en el SVG.
 * @param {object} calcData - Los datos del cálculo a mostrar.
 */
export function showStaticResult(calcData) {
    currentCalculationData = calcData;
    procedureSteps = [];
    setUIMode('result');
    Elements.svg.innerHTML = '';
    hasExplainedPaddingZero = true;

    const { paddedNumbers, decimalPosition, resultString } = calcData;
    const numDigits = paddedNumbers[0].length;
    const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
    Elements.svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);

    setupMultiLineSVG(paddedNumbers, decimalPosition);

    let carry = 0;
    let allCarries = [];

    // Recalcular los carries y pasos para el modo estático
    for (let i = 0; i < numDigits; i++) {
        const digitIndex = numDigits - 1 - i;
        let columnSum = carry;
        paddedNumbers.forEach(numStr => {
            columnSum += parseInt(numStr[digitIndex]);
        });
        const newCarry = Math.floor(columnSum / 10);
        const stepDigits = paddedNumbers.map(num => parseInt(num[digitIndex]));

        procedureSteps.push({ digits: stepDigits, carryIn: carry, sum: columnSum, resultDigit: columnSum % 10, carryOut: newCarry, x: END_X - (i * COLUMN_WIDTH), stepIndex: i });

        carry = newCarry;
        if (carry > 0) {
            allCarries.push({ value: carry, x: END_X - ((i + 1) * COLUMN_WIDTH) });
        }
    }
    // Añadir el paso final de llevada si existe
    if (carry > 0) {
        procedureSteps.push({
            digits: [],
            carryIn: carry,
            sum: carry,
            resultDigit: carry,
            carryOut: 0,
            x: END_X - (numDigits * COLUMN_WIDTH),
            isFinalCarry: true,
            stepIndex: numDigits
        });
    }

    // Dibujar el resultado final
    const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
    const actualResultForDisplay = resultString.replace('.', '');

    let svgColumnIndex = 0;
    for (let i = actualResultForDisplay.length - 1; i >= 0; i--) {
        const digit = actualResultForDisplay[i];
        const x = END_X - (svgColumnIndex * COLUMN_WIDTH);
        Elements.svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digit));
        svgColumnIndex++;
    }

    // Dibujar las llevadas
    allCarries.forEach(c => Elements.svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value)));

    // Dibujar el punto decimal
    if (decimalPosition > 0) {
        const decimalXForResult = END_X - (decimalPosition * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
        Elements.svg.appendChild(createSvgElement('text', { x: decimalXForResult, y: resultY, class: 'decimal-point' }, '.'));
    }

    setExplanation(`Mostrando el resultado de la suma: ${resultString.replace('.', ',')}.`);
    renderProcedure();
    setupVoiceReaderForCurrentCalculation();
    setupProcedureHover();
}


/**
 * Configura los elementos SVG iniciales para la suma multi-línea.
 * @param {Array<string>} paddedNumbers - Los números ya alineados.
 * @param {number} decimalPos - La posición del punto decimal.
 */
function setupMultiLineSVG(paddedNumbers, decimalPos) {
    const numDigits = paddedNumbers[0].length;
    const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
    Elements.svg.appendChild(createSvgElement('rect', { id: 'highlight-rect', x: -1000, y: 0, width: COLUMN_WIDTH, height: requiredHeight, class: 'highlight-rect' }));

    const integerLabels = ['U', 'D', 'C', 'UM', 'DM'];
    const decimalLabels = ['d', 'c', 'm', 'dm'];

    for (let i = 0; i < numDigits; i++) {
        const x = END_X - (i * COLUMN_WIDTH);
        let labelText = '';

        if (i < decimalPos) {
            const decimalIndex = decimalPos - 1 - i;
            labelText = decimalLabels[decimalIndex] || '';
        } else {
            const integerIndex = i - decimalPos;
            labelText = integerLabels[integerIndex] || '';
        }

        if (labelText) {
            Elements.svg.appendChild(createSvgElement('text', { x, y: Y_LABELS, class: 'place-value-label' }, labelText));
        }
    }

    if (paddedNumbers.length > 1) {
        const plusX = END_X - (numDigits * COLUMN_WIDTH) - (COLUMN_WIDTH * 0.5);
        const plusY = Y_START + ((paddedNumbers.length - 1) * ROW_HEIGHT);
        Elements.svg.appendChild(createSvgElement('text', { x: plusX, y: plusY, class: 'digit plus-sign-svg' }, '+'));
    }
    paddedNumbers.forEach((numStr, rowIndex) => {
        const y = Y_START + (rowIndex * ROW_HEIGHT);
        const colorClass = (rowIndex % 2 === 0) ? 'num1-text' : 'num2-text';
        for (let i = 0; i < numDigits; i++) {
            const x = END_X - (i * COLUMN_WIDTH);
            const digit = numStr[numDigits - 1 - i];
            if (decimalPos > 0 && i === decimalPos) {
                Elements.svg.appendChild(createSvgElement('text', { x: x + COLUMN_WIDTH / 2, y, class: 'decimal-point' }, '.'));
            }
            Elements.svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, digit));
        }
    });
    const lineY = Y_START + (paddedNumbers.length * ROW_HEIGHT) - (ROW_HEIGHT / 2);
    const lineStartX = END_X - (numDigits * COLUMN_WIDTH) - COLUMN_WIDTH * 1.5;
    const lineEndX = END_X + COLUMN_WIDTH / 2;
    Elements.svg.appendChild(createSvgElement('line', { x1: lineStartX, y1: lineY, x2: lineEndX, y2: lineY, class: 'sum-line-svg' }));
}

/**
 * Renderiza la lista de pasos del procedimiento en la UI.
 */
export function renderProcedure() {
    Elements.procedureList.innerHTML = '';
    if (procedureSteps.length === 0) {
        Elements.procedureSection.classList.add('hidden');
        return;
    }
    Elements.procedureSection.classList.remove('hidden');

    procedureSteps.forEach((step, index) => {
        const li = document.createElement('li');
        li.className = 'anim-pop-in';
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.style.animationDelay = `${index * 50}ms`; // Retraso escalonado
        li.dataset.stepIndex = step.stepIndex;
        let explanationContent = `<strong>Paso ${index + 1}:</strong> `;

        if (step.isFinalCarry) {
            explanationContent += `<strong>Llevada final:</strong> El ${step.carryIn} que nos quedaba baja directamente.`;
        } else {
            explanationContent += `Columna de las ${getColumnaName(step.stepIndex, currentCalculationData.decimalPosition)}. `;
            explanationContent += `Se suma ${step.digits.join(' + ')}`;
            if (step.carryIn > 0) explanationContent += ` + ${step.carryIn} (llevada)`;
            explanationContent += ` = ${step.sum}.`;
            explanationContent += ` Se escribe ${step.resultDigit}`;
            if (step.carryOut > 0) explanationContent += ` y se lleva ${step.carryOut}`;
            explanationContent += `.`;
        }

        // La estructura interna del LI es importante para el estilo (flexbox) y para el lector de voz.
        li.innerHTML = `<span class="procedure-text">${explanationContent}</span><span class="speaker-icon" aria-hidden="true">🔊</span>`;
        Elements.procedureList.appendChild(li);
    });
}

/**
 * Helper para obtener el nombre de la columna.
 * Se mantendrá aquí por ahora, pero podría ser parte del módulo de voz.
 */
function getColumnaName(stepIndex, decimalPosition) {
    const intLabels = ['unidades', 'decenas', 'centenas', 'unidades de mil', 'decenas de mil'];
    const decLabels = ['décimos', 'centésimos', 'milésimos', 'diezmilésimos'];

    if (stepIndex < decimalPosition) {
        const decIdx = decimalPosition - 1 - stepIndex;
        return decLabels[decIdx] || `decimal ${decIdx + 1}`;
    } else {
        const intIdx = stepIndex - decimalPosition;
        return intLabels[intIdx] || `entera ${intIdx + 1}`;
    }
}

/**
 * Configura el tutor de voz para el cálculo actual.
 */
function setupVoiceReaderForCurrentCalculation() {
    setupVoiceReader(
        procedureSteps,
        currentCalculationData,
        hasExplainedPaddingZero,
        (val) => { hasExplainedPaddingZero = val; }, // Setter para hasExplainedPaddingZero
        getColumnaName
    );
}

/**
 * Configura los manejadores de eventos para la interactividad de la lista de procedimientos.
 * Se llama después de que la lista se ha renderizado.
 */
export function setupProcedureHover() {
    Elements.procedureList.removeEventListener('mouseover', handleMouseOverProcedure);
    Elements.procedureList.removeEventListener('mouseout', handleMouseOutProcedure);

    Elements.procedureList.addEventListener('mouseover', handleMouseOverProcedure);
    Elements.procedureList.addEventListener('mouseout', handleMouseOutProcedure);
}

function handleMouseOverProcedure(e) {
    const li = e.target.closest('li');
    if (li && li.dataset.stepIndex) {
        const stepIndex = parseInt(li.dataset.stepIndex, 10);
        const stepData = procedureSteps.find(s => s.stepIndex === stepIndex); // Buscar por stepIndex
        if (stepData && Elements.svg.querySelector('#highlight-rect')) {
            Elements.svg.querySelector('#highlight-rect').setAttribute('x', stepData.x - COLUMN_WIDTH / 2);
        }
    }
}

function handleMouseOutProcedure() {
    const highlightRect = Elements.svg.querySelector('#highlight-rect');
    if (highlightRect) highlightRect.setAttribute('x', -1000);
}