/**
 * La Calculadora de Facundo+ - Script Principal (Versión Final con Tutor Experto)
 * Autor: Hector Daniel Ayuarachi Fuentes - https://codepen.io/HectorDanielAyarachiFuentes - https://github.com/HectorDanielAyarachiFuentes
 * Fecha: 2024
 * Licencia: MIT
 * Descripción: La versión definitiva de "Facu, el Guía Numérico". Perfecciona la lógica de cierre
 * para explicar correctamente el último paso cuando hay una llevada final.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SELECCIÓN DE ELEMENTOS ---
    const numberInput = document.getElementById('numberInput');
    const addBtn = document.getElementById('addBtn');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const replayBtn = document.getElementById('replayBtn');
    const svg = document.getElementById('calculation-svg');
    const explanationText = document.getElementById('explanation-text');
    const historyList = document.getElementById('history-list');
    const historySection = document.getElementById('history-section');
    const operandsContainer = document.getElementById('operands-container');
    const inputContainer = document.getElementById('input-container');
    const procedureSection = document.getElementById('procedure-section');
    const procedureList = document.getElementById('procedure-list');
    const motivationForKidBtn = document.getElementById('motivationForKid');
    const motivationForAdultBtn = document.getElementById('motivationForAdult');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // --- 2. ESTADO GLOBAL Y CONSTANTES ---
    let numbersToSum = [];
    let calculationHistory = [];
    let editingIndex = null;
    let procedureSteps = [];
    let currentCalculationData = null;
    let hasExplainedPaddingZero = false;

    const SVG_WIDTH = 460;
    const COLUMN_WIDTH = 35;
    const END_X = SVG_WIDTH - 40;
    
    const Y_LABELS = 20;
    const Y_CARRY = 40;
    const Y_START = 70;
    const ROW_HEIGHT = 45;

    const HISTORY_STORAGE_KEY = 'facundoCalcHistory';
    const THEME_STORAGE_KEY = 'facundoCalcTheme';

    // --- 3. MANEJADORES DE EVENTOS ---
    addBtn.addEventListener('click', addNumber);

    numberInput.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/,/g, '.');
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        e.target.value = value;
    });

    numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNumber(); } });
    calculateBtn.addEventListener('click', () => startCalculation());
    resetBtn.addEventListener('click', resetCalculator);
    replayBtn.addEventListener('click', () => { if (currentCalculationData) startCalculation(currentCalculationData); });
    historyList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.index) {
            const index = parseInt(li.dataset.index, 10);
            showStaticResult(calculationHistory[index]);
        }
    });
    operandsContainer.addEventListener('click', (e) => {
        if (calculateBtn.disabled && editingIndex === null) return;
        if (e.target.classList.contains('delete-btn')) handleDeleteNumber(e.target.dataset.index);
        else if (e.target.classList.contains('operand-text')) handleEnterEditMode(e.target.dataset.index);
    });
    procedureList.addEventListener('mouseover', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.stepIndex) {
            const stepIndex = parseInt(li.dataset.stepIndex, 10);
            const stepData = procedureSteps[stepIndex];
            if (stepData) svg.querySelector('#highlight-rect').setAttribute('x', stepData.x - COLUMN_WIDTH / 2);
        }
    });
    procedureList.addEventListener('mouseout', () => {
        const highlightRect = svg.querySelector('#highlight-rect');
        if (highlightRect) highlightRect.setAttribute('x', -1000);
    });
    motivationForKidBtn.addEventListener('click', () => readRandomMotivation('kid'));
    motivationForAdultBtn.addEventListener('click', () => readRandomMotivation('adult'));
    themeToggleBtn.addEventListener('click', toggleTheme);

    // --- 4. LÓGICA DE LA INTERFAZ ---
    function addNumber() {
        const value = numberInput.value.trim().replace(',', '.');
        if (value && isFinite(Number(value))) {
            numbersToSum.push(value);
            renderOperands();
            numberInput.value = '';
            numberInput.focus();
        } else {
            setExplanation(`"${numberInput.value}" no es un número válido.`);
        }
    }

    function renderOperands() {
        operandsContainer.innerHTML = '';
        if (numbersToSum.length === 0) {
            operandsContainer.innerHTML = `<div style="color: #ccc; font-size: 1.2rem; width:100%; text-align:center; font-weight:400; padding: 4rem 0;">Tu suma aparecerá aquí</div>`;
        }
        numbersToSum.forEach((num, index) => {
            const item = document.createElement('div');
            item.className = 'operand-item';
            const deleteButtonHTML = `<button class="delete-btn" data-index="${index}">×</button>`;
            if (index === editingIndex) {
                item.innerHTML = `<input type="text" class="edit-input" value="${num.replace('.', ',')}" /> ${deleteButtonHTML}`;
                const input = item.querySelector('.edit-input');
                setTimeout(() => { input.focus(); input.select(); }, 0);
                input.addEventListener('blur', handleSaveEdit);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                    if (e.key === 'Escape') { editingIndex = null; renderOperands(); }
                });
            } else {
                item.innerHTML = `<span class="operand-text" data-index="${index}">${num.replace('.', ',')}</span> ${deleteButtonHTML}`;
            }
            operandsContainer.appendChild(item);
        });
        calculateBtn.disabled = numbersToSum.length < 2 || editingIndex !== null;
        if (editingIndex !== null) {
            setExplanation("Editando... Pulsa Enter para guardar, o Esc para cancelar.");
        } else if (numbersToSum.length >= 2) {
            setExplanation("¡Listo para sumar! O sigue añadiendo números.");
        } else {
            setExplanation('Añade al menos dos números para empezar.');
        }
    }

    function handleDeleteNumber(index) {
        editingIndex = null;
        numbersToSum.splice(index, 1);
        renderOperands();
    }

    function handleEnterEditMode(index) {
        editingIndex = parseInt(index, 10);
        renderOperands();
    }

    function handleSaveEdit(event) {
        const input = event.target;
        const index = editingIndex;
        if (index === null) return;
        const newValue = input.value.trim().replace(',', '.');
        if (newValue && isFinite(Number(newValue))) {
            numbersToSum[index] = newValue;
        } else {
            setExplanation(`"${input.value}" no es válido. Se restauró el valor anterior.`);
        }
        editingIndex = null;
        renderOperands();
    }

    function setUIMode(mode) {
        inputContainer.classList.toggle('hidden', mode !== 'input');
        calculateBtn.classList.toggle('hidden', mode !== 'input');
        replayBtn.classList.toggle('hidden', mode !== 'result');
        operandsContainer.classList.toggle('hidden', mode !== 'input');
        svg.classList.toggle('hidden', mode === 'input');
    }

    function resetCalculator() {
        numbersToSum = [];
        editingIndex = null;
        currentCalculationData = null;
        hasExplainedPaddingZero = false;
        setUIMode('input');
        renderOperands();
        setExplanation('Añade al menos dos números para empezar.');
        procedureSection.classList.add('hidden');
        procedureList.innerHTML = '';
        svg.innerHTML = '';
    }

    // --- 5. LÓGICA DEL CÁLCULO Y MANEJO DEL HISTORIAL ---
    function saveHistoryToLocalStorage() {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(calculationHistory));
    }

    function loadHistoryFromLocalStorage() {
        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (savedHistory) {
            calculationHistory = JSON.parse(savedHistory);
            renderHistory();
        }
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (calculationHistory.length > 0) {
            historySection.classList.remove('hidden');
            calculationHistory.forEach((calcData, index) => {
                const li = document.createElement('li');
                li.dataset.index = index;
                li.textContent = calcData.originalNumbers.join(' + ').replace(/\./g, ',') + ` = ${calcData.resultString.replace('.', ',')}`;
                historyList.appendChild(li);
            });
        } else {
            historySection.classList.add('hidden');
        }
    }

    async function startCalculation(replayData = null) {
        setUIMode('calculating');
        procedureSection.classList.add('hidden');
        procedureList.innerHTML = '';
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

                const intPadding = Array(paddedInt.length - intPart.length).fill(true);
                const fracPadding = Array(paddedFrac.length - fracPart.length).fill(true);
                const originalInt = Array(intPart.length).fill(false);
                const originalFrac = Array(fracPart.length).fill(false);
                isPaddingZeroMatrix.push([...intPadding, ...originalInt, ...originalFrac, ...fracPadding]);
            });

            calculationData = { 
                paddedNumbers, 
                decimalPosition: maxFracLength, 
                originalNumbers: [...numbersToSum],
                isPaddingZeroMatrix
            };
            addToHistory(calculationData);
        }

        currentCalculationData = calculationData;
        const { paddedNumbers, decimalPosition } = calculationData;
        await animateMultiSum(paddedNumbers, decimalPosition);

        setUIMode('result');
        renderProcedure();
        setupVoiceReader();
    }

    function addToHistory(calcData) {
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

    async function animateMultiSum(paddedNumbers, decimalPos) {
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);
        svg.innerHTML = '';
        setupMultiLineSVG(paddedNumbers, decimalPos);
        await performMultiLineStepByStep(paddedNumbers, decimalPos);
    }

    function showStaticResult(calcData) {
        currentCalculationData = calcData;
        procedureSteps = [];
        setUIMode('result');
        svg.innerHTML = '';
        hasExplainedPaddingZero = true;

        const { paddedNumbers, decimalPosition, resultString } = calcData;
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);

        setupMultiLineSVG(paddedNumbers, decimalPosition);

        let carry = 0;
        let allCarries = [];

        let sumTotal = BigInt(0);
        paddedNumbers.forEach(num => sumTotal += BigInt(num));
        let fullResultWithCarry = sumTotal.toString().padStart(paddedNumbers[0].length, '0');

        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i;
            let columnSum = carry;
            paddedNumbers.forEach(numStr => {
                columnSum += parseInt(numStr[digitIndex]);
            });
            const newCarry = Math.floor(columnSum / 10);
            const stepDigits = paddedNumbers.map(num => parseInt(num[digitIndex]));
            procedureSteps.push({ digits: stepDigits, carryIn: carry, sum: columnSum, resultDigit: columnSum % 10, carryOut: newCarry, x: END_X - (i * COLUMN_WIDTH) });

            carry = newCarry;
            if (carry > 0) {
                allCarries.push({ value: carry, x: END_X - ((i + 1) * COLUMN_WIDTH) });
            }
        }

        const resultWithPadding = resultString.replace('.', '').padStart(fullResultWithCarry.length, '0');

        for (let i = 0; i < resultWithPadding.length; i++) {
            const digit = resultWithPadding[resultWithPadding.length - 1 - i];
            const x = END_X - (i * COLUMN_WIDTH);
            svg.appendChild(createSvgElement('text', { x, y: Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT, class: 'digit result-text' }, digit));
        }

        allCarries.forEach(c => svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value)));

        if (decimalPosition > 0) {
            const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
            const decimalXForResult = END_X - (decimalPosition * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
            svg.appendChild(createSvgElement('text', { x: decimalXForResult, y: resultY, class: 'decimal-point' }, '.'));
        }

        setExplanation(`Mostrando el resultado de la suma: ${resultString.replace('.', ',')}.`);
        renderProcedure();
        setupVoiceReader();
    }

    async function performMultiLineStepByStep(paddedNumbers, decimalPos) {
        procedureSteps = [];
        let carry = 0;
        const numDigits = paddedNumbers[0].length;
        const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
        let allCarries = [];

        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i;
            const x = END_X - (i * COLUMN_WIDTH);
            document.getElementById('highlight-rect').setAttribute('x', x - COLUMN_WIDTH / 2);
            await sleep(1200);

            let columnSum = carry;
            let explanationDigits = [];
            paddedNumbers.forEach(numStr => {
                const digit = parseInt(numStr[digitIndex]);
                columnSum += digit;
                explanationDigits.push(digit);
            });

            const digitForColumn = columnSum % 10;
            const newCarry = Math.floor(columnSum / 10);
            procedureSteps.push({ digits: explanationDigits, carryIn: carry, sum: columnSum, resultDigit: digitForColumn, carryOut: newCarry, x });
            carry = newCarry;

            setExplanation(`Columna: ...${columnSum}. Se escribe ${digitForColumn}, se lleva ${carry}.`);
            svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digitForColumn));

            const prevCarryElement = svg.querySelector('.carry-text');
            if (prevCarryElement) prevCarryElement.remove();
            if (carry > 0) {
                allCarries.push({ value: carry, x: x - COLUMN_WIDTH });
                svg.appendChild(createSvgElement('text', { x: x - COLUMN_WIDTH, y: Y_CARRY, class: 'digit carry-text' }, carry));
            }
            await sleep(1500);
        }

        if (carry > 0) {
            setExplanation(`¡Casi terminamos! Agregamos la llevada que nos quedó, el ${carry}. Como no hay más que sumar, la ponemos abajo.`);
            await sleep(1500);
            svg.appendChild(createSvgElement('text', { x: END_X - (numDigits * COLUMN_WIDTH), y: resultY, class: 'digit result-text' }, carry));
        } else {
            setExplanation("¡Muy bien! Y como no nos llevamos nada, la cuenta está terminada.");
            await sleep(1500);
        }

        document.getElementById('highlight-rect').setAttribute('x', -1000);
        const finalFloatingCarry = svg.querySelector('.carry-text');
        if (finalFloatingCarry) finalFloatingCarry.remove();
        allCarries.forEach(c => svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value)));

        if (decimalPos > 0) {
            const decimalResultX = END_X - (decimalPos * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
            svg.appendChild(createSvgElement('text', { x: decimalResultX, y: resultY, class: 'decimal-point' }, '.'));
        }
    }

    function renderProcedure() {
        procedureList.innerHTML = '';
        if (procedureSteps.length === 0) return;
        procedureSection.classList.remove('hidden');
        procedureSteps.forEach((step, index) => {
            const li = document.createElement('li');
            li.dataset.stepIndex = index;
            let explanation = `<strong>Columna ${index + 1}:</strong> `;
            explanation += `Se suma ${step.digits.join(' + ')}`;
            if (step.carryIn > 0) explanation += ` + ${step.carryIn} (llevada)`;
            explanation += ` = ${step.sum}.`;
            explanation += ` Se escribe ${step.resultDigit}`;
            if (step.carryOut > 0) explanation += ` y se lleva ${step.carryOut}`;
            explanation += `.`;
            li.innerHTML = explanation;
            procedureList.appendChild(li);
        });
    }

    function setupMultiLineSVG(paddedNumbers, decimalPos) {
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.appendChild(createSvgElement('rect', { id: 'highlight-rect', x: -1000, y: 0, width: COLUMN_WIDTH, height: requiredHeight, class: 'highlight-rect' }));

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
                svg.appendChild(createSvgElement('text', { x, y: Y_LABELS, class: 'place-value-label' }, labelText));
            }
        }

        if (paddedNumbers.length > 1) {
            const plusX = END_X - (numDigits * COLUMN_WIDTH) - (COLUMN_WIDTH * 0.5);
            const plusY = Y_START + ((paddedNumbers.length - 1) * ROW_HEIGHT);
            svg.appendChild(createSvgElement('text', { x: plusX, y: plusY, class: 'digit plus-sign-svg' }, '+'));
        }
        paddedNumbers.forEach((numStr, rowIndex) => {
            const y = Y_START + (rowIndex * ROW_HEIGHT);
            const colorClass = (rowIndex % 2 === 0) ? 'num1-text' : 'num2-text';
            for (let i = 0; i < numDigits; i++) {
                const x = END_X - (i * COLUMN_WIDTH);
                const digit = numStr[numDigits - 1 - i];
                if (decimalPos > 0 && i === decimalPos) {
                    svg.appendChild(createSvgElement('text', { x: x + COLUMN_WIDTH / 2, y, class: 'decimal-point' }, '.'));
                }
                svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, digit));
            }
        });
        const lineY = Y_START + (paddedNumbers.length * ROW_HEIGHT) - (ROW_HEIGHT / 2);
        const lineStartX = END_X - (numDigits * COLUMN_WIDTH) - COLUMN_WIDTH * 1.5;
        const lineEndX = END_X + COLUMN_WIDTH / 2;
        svg.appendChild(createSvgElement('line', { x1: lineStartX, y1: lineY, x2: lineEndX, y2: lineY, class: 'sum-line-svg' }));
    }

    // --- 6. FUNCIONES AUXILIARES ---
    function createSvgElement(tag, attrs, content) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attrs) el.setAttribute(key, attrs[key]);
        if (content !== undefined) el.textContent = content;
        return el;
    }

    function setExplanation(text) {
        explanationText.style.opacity = '0';
        setTimeout(() => { explanationText.textContent = text; explanationText.style.opacity = '1'; }, 300);
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    // --- 7. LÓGICA DE VOZ Y MOTIVACIÓN ---
    const unidades = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
    const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve"];
    const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
    const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

    function numeroALetras(n) {
        if (n === 0) return "cero";
        if (n < 0) return "menos " + numeroALetras(Math.abs(n));
        let partes = [];
        if (Math.floor(n / 1000000) > 0) { const millones = Math.floor(n / 1000000); partes.push((millones === 1 ? "un millón" : numeroALetras(millones) + " millones")); n %= 1000000; }
        if (Math.floor(n / 1000) > 0) { const miles = Math.floor(n / 1000); partes.push((miles === 1 ? "mil" : numeroALetras(miles) + " mil")); n %= 1000; }
        if (Math.floor(n / 100) > 0) { const cent = Math.floor(n / 100); partes.push((cent === 1 && n % 100 > 0 ? "ciento" : centenas[cent])); n %= 100; }
        if (n > 0) {
            if (n < 10) { partes.push(unidades[n]); } else if (n < 20) { partes.push(especiales[n - 10]); } else if (n < 30) { partes.push("veinti" + unidades[n - 20]); } else { const dec = Math.floor(n / 10); let temp = decenas[dec]; if (n % 10 > 0) { temp += " y " + unidades[n % 10]; } partes.push(temp); }
        }
        return partes.join(" ");
    }

    const kidMotivations = ["Puedes brillar, ¡no importa de qué estés hecho!", "La perfección no existe, eres hermoso como eres. Con todas tus imperfecciones lograrás lo que quieras, te lo juro por Dieguito Maradona.", "¡Cada error es una oportunidad para aprender algo nuevo! ¡Sigue intentando!", "¡Eres más valiente de lo que crees y más inteligente de lo que piensas!", "¡Wow, qué bien lo estás haciendo! Cada suma te hace más fuerte.", "El secreto para salir adelante es empezar. ¡Y tú ya empezaste!"];
    const adultMotivations = ["NO ME RETES VIEJA CHOTA, NA MENTIRA XD!.", "Gracias por enseñar con paciencia. Estás construyendo la confianza de un niño, un número a la vez.", "Recuerda que el objetivo no es la respuesta correcta, sino el proceso de aprender y descubrir juntos.", "Tu apoyo y ánimo son las herramientas más importantes en este viaje de aprendizaje.", "Celebrar los pequeños logros crea grandes aprendices. ¡Sigue así!", "Enseñar es dejar una huella en el futuro. Gracias por tu dedicación."];
    
    const columnCompletePhrases = ["¡Perfecto!", "¡Así se hace!", "¡Muy bien!", "¡Genial!", "¡Vamos de maravilla!", "¡Eso es!"];
    const noCarryPhrases = ["¡Estupendo! Aquí no nos llevamos nada.", "¡Fácil! Como no nos llevamos nada, pasamos a la siguiente.", "¡Bien hecho! No hay llevada, así que seguimos."];
    const finalResultPhrases = ["¡Y lo logramos! ¡Qué gran trabajo has hecho!", "¡Misión cumplida! La suma es correcta. ¡Eres un genio de las mates!", "¡Terminamos! Y el resultado es perfecto. ¡Estoy muy orgulloso de ti!"];

    function getRandomPhrase(phrases) {
        return phrases[Math.floor(Math.random() * phrases.length)];
    }
    
    function leerEnVoz(texto) {
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(texto);
            utter.lang = 'es-ES';
            utter.rate = 1.0;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
        } else {
            console.warn("El navegador no soporta la API SpeechSynthesis.");
        }
    }

    function readRandomMotivation(type) {
        const phrases = type === 'kid' ? kidMotivations : adultMotivations;
        leerEnVoz(getRandomPhrase(phrases));
    }
    
    // ✅ NUEVO Y MEJORADO: La función final del tutor auditivo
    function setupVoiceReader() {
        if (!procedureList) return;

        const handleProcedureClick = (event) => {
            const listItem = event.target.closest('li');
            if (!listItem || !listItem.dataset.stepIndex) return;

            const stepIndex = parseInt(listItem.dataset.stepIndex, 10);
            const stepData = procedureSteps[stepIndex];
            if (!stepData) {
                leerEnVoz(listItem.textContent);
                return;
            }

            const { decimalPosition, isPaddingZeroMatrix } = currentCalculationData || {};
            const isDecimalColumn = decimalPosition > 0 && stepIndex < decimalPosition;
            const numDigits = currentCalculationData.paddedNumbers[0].length;
            const digitIndexInString = numDigits - 1 - stepIndex;

            const columnNames = {
                decimal: ["décimos", "centésimos", "milésimos", "diezmilésimos"],
                integer: ["unidades", "decenas", "centenas", "unidades de mil", "decenas de mil"]
            };

            let columnName = "";
            if (isDecimalColumn) {
                const decimalIndex = decimalPosition - 1 - stepIndex;
                columnName = columnNames.decimal[decimalIndex] || `la columna decimal ${decimalIndex + 1}`;
            } else {
                const integerIndex = stepIndex - (decimalPosition || 0);
                columnName = columnNames.integer[integerIndex] || `la columna de enteros ${integerIndex + 1}`;
            }
            
            let descripcion = `Vamos con la columna de las ${columnName}. `;
            
            let nonZeroDigits = [];
            let zeroCount = 0;
            let containsPaddingZero = false;

            stepData.digits.forEach((digit, rowIndex) => {
                if (digit === 0) {
                    zeroCount++;
                    const isPadding = isPaddingZeroMatrix && isPaddingZeroMatrix[rowIndex][digitIndexInString];
                    if (isPadding) {
                        containsPaddingZero = true;
                    }
                } else {
                    nonZeroDigits.push(digit);
                }
            });
            
            if (nonZeroDigits.length === 0 && stepData.carryIn === 0) {
                descripcion += `Aquí solo hay ceros, así que el resultado es cero. ¡Sencillo! `;
            } else {
                if (nonZeroDigits.length > 0) {
                    const nonZeroWords = nonZeroDigits.map(d => numeroALetras(d));
                    descripcion += `Sumamos ${nonZeroWords.join(' más ')}. `;
                }

                if (zeroCount > 0) {
                    descripcion += (zeroCount === 1) ? "Vemos que también hay un cero. " : `Vemos que también hay ${numeroALetras(zeroCount)} ceros. `;
                    descripcion += "Recuerda que, aunque están ahí, no suman valor a la columna. ";
                }
                
                if (containsPaddingZero && !hasExplainedPaddingZero) {
                    descripcion += `Uno de esos ceros lo pusimos nosotros para alinear los números. ¡Es una pequeña ayuda! `;
                    hasExplainedPaddingZero = true;
                }

                if (stepData.carryIn > 0) {
                    descripcion += `Y no olvidemos el ${numeroALetras(stepData.carryIn)} que nos estábamos llevando. `;
                }

                descripcion += `En total, la columna suma ${numeroALetras(stepData.sum)}. `;
                descripcion += `Por lo tanto, debajo de la línea escribimos el ${numeroALetras(stepData.resultDigit)}. `;
            }
            
            // ✅ NUEVO Y MEJORADO: Lógica de cierre para la última columna
            const isLastColumn = stepIndex === procedureSteps.length - 1;

            if (isLastColumn) {
                if (stepData.carryOut > 0) {
                    descripcion += `¡Atención, este es el último paso! Como ya no hay más columnas, ese ${numeroALetras(stepData.carryOut)} que nos llevábamos baja directamente para ser el primer número de nuestra respuesta final. `;
                }
                descripcion += getRandomPhrase(finalResultPhrases);
            } else {
                // Lógica para las columnas intermedias
                if (stepData.carryOut > 0) {
                    const nextColumnIndex = stepIndex - (decimalPosition || 0) + (isDecimalColumn ? 0 : 1);
                    const nextColumnName = columnNames.integer[nextColumnIndex] || "siguiente";
                    descripcion += `${getRandomPhrase(columnCompletePhrases)} Como el resultado fue mayor que nueve, nos llevamos ${numeroALetras(stepData.carryOut)} para la columna de las ${nextColumnName}. `;
                } else if (!(nonZeroDigits.length === 0 && stepData.carryIn === 0)) {
                    descripcion += `${getRandomPhrase(noCarryPhrases)} `;
                }
            }
            
            if (isDecimalColumn && stepIndex === decimalPosition - 1) {
                descripcion += `¡Momento clave! Como terminamos con los decimales, ahora ponemos la coma. ¡Y seguimos con los números enteros! `;
            }

            leerEnVoz(descripcion.replace(/ +/g, ' ').trim());
        };

        procedureList.removeEventListener('click', handleProcedureClick);
        procedureList.addEventListener('click', handleProcedureClick);
    }


    // --- 8. LÓGICA DE TEMA OSCURO ---
    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
        updateThemeButton(isDarkMode);
    }

    function updateThemeButton(isDarkMode) {
        themeToggleBtn.innerHTML = isDarkMode ? '☀️' : '🌙';
        themeToggleBtn.setAttribute('aria-label', isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }

    function applyInitialTheme() {
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

    // --- INICIALIZACIÓN ---
    function init() {
        applyInitialTheme();
        loadHistoryFromLocalStorage();
        resetCalculator();
    }

    init();
});
