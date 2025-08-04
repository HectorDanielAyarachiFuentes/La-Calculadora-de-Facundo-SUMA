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

    // --- 2. ESTADO GLOBAL ---
    let numbersToSum = [];
    let calculationHistory = [];
    let editingIndex = null;
    let procedureSteps = [];
    let currentCalculationData = null; // *** NUEVO: Para saber qué cálculo se está mostrando

    // --- CONSTANTES ---
    const SVG_WIDTH = 460;
    const COLUMN_WIDTH = 35;
    const END_X = SVG_WIDTH - 40;
    const Y_START = 50;
    const ROW_HEIGHT = 45;
    const Y_CARRY = 25;
    const HISTORY_STORAGE_KEY = 'facundoCalcHistory';

    // --- 3. MANEJADORES DE EVENTOS ---
    addBtn.addEventListener('click', addNumber);
    numberInput.addEventListener('input', () => { numberInput.value = numberInput.value.replace(/[^0-9,.]/g, ''); });
    numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNumber(); } });
    calculateBtn.addEventListener('click', () => startCalculation());
    resetBtn.addEventListener('click', resetCalculator);
    // *** MODIFICADO: ReplayBtn ahora usa el cálculo actual ***
    replayBtn.addEventListener('click', () => { if (currentCalculationData) startCalculation(currentCalculationData); });
    // *** MODIFICADO: El clic en el historial ahora muestra el resultado al instante ***
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
        currentCalculationData = null; // Limpiar el cálculo actual
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
            const paddedNumbers = numbersToSum.map(num => {
                const parts = num.split('.');
                const intPart = parts[0] || '0';
                const fracPart = parts[1] || '';
                return intPart.padStart(maxIntLength, '0') + fracPart.padEnd(maxFracLength, '0');
            });
            calculationData = { paddedNumbers, decimalPosition: maxFracLength, originalNumbers: [...numbersToSum] };
            addToHistory(calculationData);
        }
        
        currentCalculationData = calculationData; // Guardar el cálculo actual
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
    
    // *** NUEVA FUNCIÓN PARA MOSTRAR RESULTADO ESTÁTICO ***
    function showStaticResult(calcData) {
        currentCalculationData = calcData; // Guardar como cálculo actual para el botón de repetir
        procedureSteps = []; // Reiniciar los pasos del procedimiento
        setUIMode('result'); // Cambiar a la vista de resultado
        svg.innerHTML = ''; // Limpiar el SVG
        
        const { paddedNumbers, decimalPosition, resultString } = calcData;
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);

        // 1. Dibujar la suma base (números y línea)
        setupMultiLineSVG(paddedNumbers, decimalPosition);

        // 2. Calcular y dibujar el resultado y las llevadas instantáneamente
        let carry = 0;
        let allCarries = [];
        let fullResultWithCarry = "";

        // Calcular el resultado completo incluyendo la última llevada
        let sumTotal = BigInt(0);
        paddedNumbers.forEach(num => sumTotal += BigInt(num));
        fullResultWithCarry = sumTotal.toString().padStart(numDigits + 1, '0');


        // Iterar para encontrar las llevadas
        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i;
            let columnSum = carry;
            paddedNumbers.forEach(numStr => {
                columnSum += parseInt(numStr[digitIndex]);
            });
            const newCarry = Math.floor(columnSum / 10);
            
            // Guardar en procedureSteps para la lectura de voz
            const stepDigits = paddedNumbers.map(num => parseInt(num[digitIndex]));
            procedureSteps.push({ digits: stepDigits, carryIn: carry, sum: columnSum, resultDigit: columnSum % 10, carryOut: newCarry, x: END_X - (i * COLUMN_WIDTH) });

            carry = newCarry;
            if (carry > 0) {
                allCarries.push({ value: carry, x: END_X - ((i + 1) * COLUMN_WIDTH) });
            }
        }
        
        // 3. Dibujar el resultado completo
        for (let i = 0; i < fullResultWithCarry.length; i++) {
            const digit = fullResultWithCarry[fullResultWithCarry.length - 1 - i];
            const x = END_X - (i * COLUMN_WIDTH);
            svg.appendChild(createSvgElement('text', { x, y: Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT, class: 'digit result-text' }, digit));
        }

        // 4. Dibujar todas las llevadas
        allCarries.forEach(c => svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value)));

        // 5. Dibujar el punto decimal si es necesario
        if (decimalPosition > 0) {
            const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
            const decimalXForResult = END_X - (decimalPosition * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
            svg.appendChild(createSvgElement('text', { x: decimalXForResult, y: resultY, class: 'decimal-point' }, '.'));
        }

        // 6. Actualizar UI
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
                    svg.appendChild(createSvgElement('text', { x: x + COLUMN_WIDTH / 2, y: y, class: 'decimal-point' }, '.'));
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

    const kidMotivations = [
        "Puedes brillar, ¡no importa de qué estés hecho!",
        "La perfección no existe, eres hermoso como eres. Con todas tus imperfecciones lograrás lo que quieras, te lo juro por Dieguito Maradona.",
        "¡Cada error es una oportunidad para aprender algo nuevo! ¡Sigue intentando!",
        "¡Eres más valiente de lo que crees y más inteligente de lo que piensas!",
        "¡Wow, qué bien lo estás haciendo! Cada suma te hace más fuerte.",
        "El secreto para salir adelante es empezar. ¡Y tú ya empezaste!"
    ];
    const adultMotivations = [
        "NO ME RETES VIEJA CHOTA, NA MENTIRA XD!.",
        "Gracias por enseñar con paciencia. Estás construyendo la confianza de un niño, un número a la vez.",
        "Recuerda que el objetivo no es la respuesta correcta, sino el proceso de aprender y descubrir juntos.",
        "Tu apoyo y ánimo son las herramientas más importantes en este viaje de aprendizaje.",
        "Celebrar los pequeños logros crea grandes aprendices. ¡Sigue así!",
        "Enseñar es dejar una huella en el futuro. Gracias por tu dedicación."
    ];

    function leerEnVoz(texto) {
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(texto);
            utter.lang = 'es-ES';
            utter.rate = 0.9;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
        } else {
            console.warn("El navegador no soporta la API SpeechSynthesis.");
        }
    }

    function readRandomMotivation(type) {
        const phrases = type === 'kid' ? kidMotivations : adultMotivations;
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        leerEnVoz(phrase);
    }

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

            let descripcion = `Columna ${stepIndex + 1}. ¡A ver qué tenemos aquí! `;
            const numerosQueSuman = stepData.digits.filter(d => d > 0);
            const cantidadDeCeros = stepData.digits.length - numerosQueSuman.length;

            if (cantidadDeCeros > 0) {
                if (cantidadDeCeros === 1) {
                    descripcion += `Veo un cero por aquí... pero recuerda, los ceros no suman, así que no lo contamos. `;
                } else {
                    descripcion += `¡Mira! Hay ${numeroALetras(cantidadDeCeros)} ceros. Pero como sabes, los ceros no suman nada. `;
                }
            }

            if (numerosQueSuman.length > 0) {
                const numerosEnPalabras = numerosQueSuman.map(d => numeroALetras(d));
                let listaDeNumeros;
                if (numerosEnPalabras.length > 2) {
                    const todosMenosElUltimo = numerosEnPalabras.slice(0, -1);
                    const ultimo = numerosEnPalabras[numerosEnPalabras.length - 1];
                    listaDeNumeros = todosMenosElUltimo.join(', ') + ' y ' + ultimo;
                } else {
                    listaDeNumeros = numerosEnPalabras.join(' y ');
                }
                descripcion += `Así que solo Sumamos ${listaDeNumeros}. `;
            } else if (cantidadDeCeros > 0) {
                descripcion += `Como solo hay ceros, el resultado es... ¡cero! `;
            }

            if (stepData.carryIn > 0) {
                descripcion += `Ah, ¡pero no nos olvidemos de sumar el ${numeroALetras(stepData.carryIn)} que guardamos antes! `;
            }

            if (numerosQueSuman.length === 0 && stepData.carryIn > 0) {
                 descripcion += `Así que el total es ${numeroALetras(stepData.sum)}. `;
            } else {
                 descripcion += `Todo eso nos da ${numeroALetras(stepData.sum)}. `;
            }

            descripcion += `Entonces, abajo ponemos un ${numeroALetras(stepData.resultDigit)}. `;

            if (stepIndex === procedureSteps.length - 1) {
                if (stepData.carryOut > 0) {
                    descripcion += `Y guardamos el ${numeroALetras(stepData.carryOut)}. Como ya no hay más columnas, lo ponemos al principio del resultado. ¡Y así terminamos la cuenta!`;
                } else {
                    descripcion += `¡Y como no nos sobró nada, hemos terminado la cuenta! ¡Buen trabajo!`;
                }
            } else {
                if (stepData.carryOut > 0) {
                    descripcion += `Y guardamos el ${numeroALetras(stepData.carryOut)} para la próxima columna.`;
                } else {
                    descripcion += `¡Genial! No necesitamos guardar nada para la próxima columna.`;
                }
            }
            leerEnVoz(descripcion.replace(/ +/g, ' ').trim());
        };

        procedureList.removeEventListener('click', handleProcedureClick);
        procedureList.addEventListener('click', handleProcedureClick);
    }

    // --- INICIALIZACIÓN ---
    function init() {
        loadHistoryFromLocalStorage();
        resetCalculator();
    }

    init();
});