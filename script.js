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

    // --- 2. ESTADO GLOBAL ---
    let numbersToSum = [];
    let calculationHistory = [];
    let editingIndex = null;
    let procedureSteps = [];

    // --- CONSTANTES SVG ---
    const SVG_WIDTH = 460;
    const COLUMN_WIDTH = 35;
    const END_X = SVG_WIDTH - 40;
    const Y_START = 50;
    const ROW_HEIGHT = 45;
    const Y_CARRY = 25;

    // --- 3. MANEJADORES DE EVENTOS ---
    addBtn.addEventListener('click', addNumber);
    numberInput.addEventListener('input', () => { numberInput.value = numberInput.value.replace(/[^0-9,.]/g, ''); });
    numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNumber(); } });
    calculateBtn.addEventListener('click', () => startCalculation());
    resetBtn.addEventListener('click', resetCalculator);
    replayBtn.addEventListener('click', () => { if (calculationHistory.length > 0) startCalculation(calculationHistory[calculationHistory.length - 1]); });
    historyList.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li && li.dataset.index) startCalculation(calculationHistory[parseInt(li.dataset.index, 10)]); });
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
                    if (e.key === 'Enter') {
                        e.preventDefault(); input.blur();
                    }
                    if (e.key === 'Escape') {
                        editingIndex = null;
                        renderOperands();
                    }
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
        setUIMode('input');
        renderOperands();
        setExplanation('Añade al menos dos números para empezar.');
        procedureSection.classList.add('hidden');
        procedureList.innerHTML = '';
        svg.innerHTML = ''; // Clear SVG content on reset
    }

    // --- 5. LÓGICA DEL CÁLCULO ---
    async function startCalculation(replayData = null) {
        setUIMode('calculating');
        procedureSection.classList.add('hidden');
        procedureList.innerHTML = '';
        let calculationData;

        if (replayData) {
            calculationData = replayData;
        } else {
            // --- Padding y alineación de números ---
            let maxIntLength = 0;
            let maxFracLength = 0;
            numbersToSum.forEach(num => {
                const parts = num.split('.');
                const intPart = parts[0] || '0';
                const fracPart = parts[1] || '';
                if (intPart.length > maxIntLength) {
                    maxIntLength = intPart.length;
                }
                if (fracPart.length > maxFracLength) {
                    maxFracLength = fracPart.length;
                }
            });

            const paddedNumbers = numbersToSum.map(num => {
                const parts = num.split('.');
                const intPart = parts[0] || '0';
                const fracPart = parts[1] || '';
                const paddedInt = intPart.padStart(maxIntLength, '0');
                const paddedFrac = fracPart.padEnd(maxFracLength, '0');
                return paddedInt + paddedFrac;
            });

            calculationData = {
                paddedNumbers,
                decimalPosition: maxFracLength,
                originalNumbers: [...numbersToSum]
            };

            addToHistory(calculationData);
        }

        const { paddedNumbers, decimalPosition } = calculationData;
        await animateMultiSum(paddedNumbers, decimalPosition);

        // Buscar el cálculo correspondiente en el historial para obtener el resultado final
        const completedCalc = calculationHistory.find(c => c.originalNumbers.join() === calculationData.originalNumbers.join());
        const finalResultString = completedCalc ? completedCalc.resultString : "Error";

        setUIMode('result');
        setExplanation(`¡Suma completada! El resultado final es ${finalResultString.replace('.', ',')}.`);
        renderProcedure();
        setupVoiceReader(); // Configurar el lector de voz después de renderizar el procedimiento
    }

    function addToHistory(calcData) {
        historySection.classList.remove('hidden');
        const index = calculationHistory.length;

        let result = BigInt(0);
        calcData.paddedNumbers.forEach(numStr => {
            result += BigInt(numStr);
        });

        let resultString = result.toString().padStart(calcData.decimalPosition + 1, '0'); // Asegurarse de que haya espacio para el punto decimal

        if (calcData.decimalPosition > 0) {
            const intPart = resultString.slice(0, -calcData.decimalPosition) || '0';
            const fracPart = resultString.slice(-calcData.decimalPosition);
            resultString = `${intPart}.${fracPart}`;
        }

        calcData.resultString = resultString;
        calculationHistory.push(calcData);

        const li = document.createElement('li');
        li.dataset.index = index;
        li.textContent = calcData.originalNumbers.join(' + ').replace(/\./g, ',') + ` = ${resultString.replace('.', ',')}`;
        historyList.prepend(li);
    }

    async function animateMultiSum(paddedNumbers, decimalPos) {
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);
        svg.innerHTML = ''; // Clear previous SVG content
        setupMultiLineSVG(paddedNumbers, decimalPos);
        await performMultiLineStepByStep(paddedNumbers, decimalPos);
    }

    async function performMultiLineStepByStep(paddedNumbers, decimalPos) {
        procedureSteps = [];
        let carry = 0;
        const numDigits = paddedNumbers[0].length;
        const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
        let currentResultString = '';

        // Ajuste para la posición del punto decimal en el resultado final
        const decimalResultX = END_X - (decimalPos * COLUMN_WIDTH) + COLUMN_WIDTH / 2;

        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i; // Índice de derecha a izquierda
            const x = END_X - (i * COLUMN_WIDTH); // Posición X del dígito actual
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
            currentResultString = digitForColumn + currentResultString; // Construcción del resultado de derecha a izquierda

            setExplanation(`Columna: ...${columnSum}. Se escribe ${digitForColumn}, se lleva ${carry}.`);
            svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digitForColumn));

            // Eliminar la llevada anterior si existe antes de dibujar la nueva
            const prevCarryElement = svg.querySelector('.carry-text');
            if (prevCarryElement) prevCarryElement.remove();

            if (carry > 0) {
                // La llevada se dibuja una columna a la izquierda
                svg.appendChild(createSvgElement('text', { x: x - COLUMN_WIDTH, y: Y_CARRY, class: 'digit carry-text' }, carry));
            }
            await sleep(1500);
        }

        if (carry > 0) {
            setExplanation(`Se baja la última llevada: ${carry}.`);
            await sleep(1000);
            // La última llevada se coloca a la izquierda de la columna más a la izquierda
            svg.appendChild(createSvgElement('text', { x: END_X - (numDigits * COLUMN_WIDTH), y: resultY, class: 'digit result-text' }, carry));
        }

        // Limpiar el resaltado final
        document.getElementById('highlight-rect').setAttribute('x', -1000);
        // Eliminar cualquier llevada flotante que pudiera quedar
        const finalFloatingCarry = svg.querySelector('.carry-text');
        if (finalFloatingCarry) finalFloatingCarry.remove();

        // Dibujar el punto decimal en la posición correcta del resultado
        if (decimalPos > 0) {
            svg.appendChild(createSvgElement('text', {
                x: decimalResultX,
                y: resultY,
                class: 'decimal-point'
            }, '.'));
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
            // Mostrar los números de la columna y la llevada de entrada
            explanation += `Se suma ${step.digits.join(' + ')}`;
            if (step.carryIn > 0) explanation += ` + ${step.carryIn} (llevada)`;
            explanation += ` = ${step.sum}.`;
            // Indicar lo que se escribe y la llevada de salida
            explanation += ` Se escribe ${step.resultDigit} y se lleva ${step.carryOut}.`;
            li.innerHTML = explanation;
            procedureList.appendChild(li);
        });
    }

    function setupMultiLineSVG(paddedNumbers, decimalPos) {
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        // Rectángulo para resaltar la columna activa
        svg.appendChild(createSvgElement('rect', { id: 'highlight-rect', x: -1000, y: 0, width: COLUMN_WIDTH, height: requiredHeight, class: 'highlight-rect' }));

        // Dibujar el signo '+' si hay más de un número
        if (paddedNumbers.length > 1) {
            const plusX = END_X - (numDigits * COLUMN_WIDTH) - (COLUMN_WIDTH * 0.5);
            const plusY = Y_START + ((paddedNumbers.length - 1) * ROW_HEIGHT);
            svg.appendChild(createSvgElement('text', { x: plusX, y: plusY, class: 'digit plus-sign-svg' }, '+'));
        }

        // Dibujar cada número con sus dígitos alineados
        paddedNumbers.forEach((numStr, rowIndex) => {
            const y = Y_START + (rowIndex * ROW_HEIGHT);
            const colorClass = (rowIndex % 2 === 0) ? 'num1-text' : 'num2-text'; // Colores alternos para los números

            for (let i = 0; i < numDigits; i++) {
                const x = END_X - (i * COLUMN_WIDTH); // Posición X del dígito (de derecha a izquierda)
                const digit = numStr[numDigits - 1 - i]; // Obtener el dígito correcto

                // Dibujar el punto decimal si corresponde
                if (decimalPos > 0 && i === decimalPos) {
                    svg.appendChild(createSvgElement('text', { x: x + COLUMN_WIDTH / 2, y: y, class: 'decimal-point' }, '.'));
                }
                // Dibujar el dígito
                svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, digit));
            }
        });

        // Dibujar la línea de suma
        const lineY = Y_START + (paddedNumbers.length * ROW_HEIGHT) - (ROW_HEIGHT / 2);
        const lineStartX = END_X - (numDigits * COLUMN_WIDTH) - COLUMN_WIDTH * 1.5; // Ajustar inicio de la línea
        const lineEndX = END_X + COLUMN_WIDTH / 2; // Ajustar fin de la línea
        svg.appendChild(createSvgElement('line', { x1: lineStartX, y1: lineY, x2: lineEndX, y2: lineY, class: 'sum-line-svg' }));
    }

    // --- 6. FUNCIONES AUXILIARES ---
    function createSvgElement(tag, attrs, content) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attrs) {
            el.setAttribute(key, attrs[key]);
        }
        if (content !== undefined) {
            el.textContent = content;
        }
        return el;
    }

    function setExplanation(text) {
        explanationText.style.opacity = '0';
        setTimeout(() => {
            explanationText.textContent = text;
            explanationText.style.opacity = '1';
        }, 300);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Funciones de lectura en voz alta ---
    const unidades = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
    const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve"];
    const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
    const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

    function numeroALetras(n) {
        if (n === 0) return "cero";
        if (n < 0) return "menos " + numeroALetras(Math.abs(n));

        let partes = [];

        if (Math.floor(n / 1000000) > 0) {
            const millones = Math.floor(n / 1000000);
            partes.push((millones === 1 ? "un millón" : numeroALetras(millones) + " millones"));
            n %= 1000000;
        }

        if (Math.floor(n / 1000) > 0) {
            const miles = Math.floor(n / 1000);
            partes.push((miles === 1 ? "mil" : numeroALetras(miles) + " mil"));
            n %= 1000;
        }

        if (Math.floor(n / 100) > 0) {
            const cent = Math.floor(n / 100);
            partes.push((cent === 1 && n % 100 > 0 ? "ciento" : centenas[cent]));
            n %= 100;
        }

        if (n > 0) {
            if (n < 10) {
                partes.push(unidades[n]);
            } else if (n < 20) {
                partes.push(especiales[n - 10]);
            } else if (n < 30) {
                partes.push("veinti" + unidades[n - 20]);
            } else {
                const dec = Math.floor(n / 10);
                let temp = decenas[dec];
                if (n % 10 > 0) {
                    temp += " y " + unidades[n % 10];
                }
                partes.push(temp);
            }
        }

        return partes.join(" ");
    }

    function leerEnVoz(texto) {
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(texto);
            utter.lang = 'es-ES'; // Español
            utter.rate = 0.9; // Velocidad ligeramente más lenta
            window.speechSynthesis.cancel(); // Detener cualquier lectura previa
            window.speechSynthesis.speak(utter);
        } else {
            console.warn("El navegador no soporta la API SpeechSynthesis.");
        }
    }

    function setupVoiceReader() {
        if (!procedureList) return;

        procedureList.addEventListener('click', (event) => {
            const listItem = event.target.closest('li');
            if (!listItem) return;

            const textoCompleto = listItem.textContent;
            // Intentamos extraer los números para una lectura más estructurada
            const numerosEnTexto = textoCompleto.match(/(\d+)(?:\s*[\+\s]\s*(\d+))?(?:\s*=\s*(\d+))?/);

            if (numerosEnTexto) {
                const num1 = parseInt(numerosEnTexto[1]);
                const num2 = numerosEnTexto[2] ? parseInt(numerosEnTexto[2]) : null;
                const resultadoParcial = numerosEnTexto[3] ? parseInt(numerosEnTexto[3]) : null;

                let fraseVoz = "";
                if (num2 !== null && resultadoParcial !== null) { // Formato: "Se suma X + Y = Z"
                    fraseVoz = `Se suma ${numeroALetras(num1)} más ${numeroALetras(num2)}, que da ${numeroALetras(resultadoParcial)}`;
                } else if (num2 !== null) { // Formato: "Se suma X + Y" (para la explicación del paso)
                     fraseVoz = `En esta columna, sumamos ${numeroALetras(num1)} más ${numeroALetras(num2)}`;
                } else if (resultadoParcial !== null) { // Formato: "Resultado: Z"
                    fraseVoz = `El resultado final es ${numeroALetras(resultadoParcial)}`;
                } else { // Si solo hay un número o no se puede parsear
                     fraseVoz = textoCompleto;
                }
                 leerEnVoz(fraseVoz.replace(/ +/g, ' ').trim()); // Limpiar espacios extra y leer

            } else {
                leerEnVoz(textoCompleto); // Leer el texto completo si no se pueden extraer números
            }
        });
    }

    // --- INICIALIZACIÓN ---
    resetCalculator();
});