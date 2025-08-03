document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SELECCIÓN DE ELEMENTOS Y ESTADO GLOBAL ---
    const numberInput = document.getElementById('numberInput');
    const addBtn = document.getElementById('addBtn');
    const numberList = document.getElementById('number-list');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const svg = document.getElementById('calculation-svg');
    const explanationText = document.getElementById('explanation-text');
    const historyList = document.getElementById('history-list');

    let numbersToSum = [];

    // --- CONSTANTES DE CONFIGURACIÓN DEL SVG ---
    const SVG_WIDTH = 500;
    const COLUMN_WIDTH = 30;
    const END_X = SVG_WIDTH - 40;
    const Y_START = 50; // Posición Y del primer número
    const ROW_HEIGHT = 40; // Espacio vertical entre números
    const Y_CARRY = 25;

    // --- 2. MANEJADORES DE EVENTOS ---
    numberInput.addEventListener('input', () => {
        numberInput.value = numberInput.value.replace(/[^0-9,.]/g, '');
    });
    addBtn.addEventListener('click', addNumberToList);
    numberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addNumberToList(); }
    });
    calculateBtn.addEventListener('click', startCalculation);
    resetBtn.addEventListener('click', resetCalculator);

    // --- 3. FUNCIONES PRINCIPALES ---
    
    function addNumberToList() {
        let value = numberInput.value.trim().replace(',', '.');
        if (value && !isNaN(parseFloat(value)) && isFinite(value)) {
            numbersToSum.push(value);
            renderNumberList();
            numberInput.value = '';
            numberInput.focus();
        } else {
            setExplanation("Por favor, ingresa un número válido.");
            numberInput.value = '';
        }
    }

    function renderNumberList() {
        numberList.innerHTML = '';
        numbersToSum.forEach(num => {
            const li = document.createElement('li');
            li.textContent = num.replace('.', ',');
            numberList.appendChild(li);
        });
        calculateBtn.disabled = numbersToSum.length < 2;
    }

    function resetCalculator() {
        numbersToSum = [];
        renderNumberList();
        svg.innerHTML = '';
        setExplanation('Añade al menos dos números para empezar.');
        calculateBtn.disabled = true;
        numberInput.disabled = false;
        addBtn.disabled = false;
        historyList.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} 200`); // Resetear viewBox
    }

    function startCalculation() {
        if (numbersToSum.length < 2) return;

        calculateBtn.disabled = true;
        numberInput.disabled = true;
        addBtn.disabled = true;
        svg.innerHTML = '';

        // *** LÓGICA REESCRITA PARA SUMAR TODOS LOS NÚMEROS A LA VEZ ***
        
        // 1. Preparar todos los números para que tengan la misma longitud
        let maxIntLength = 0;
        let maxFracLength = 0;
        numbersToSum.forEach(num => {
            const [intPart, fracPart = ''] = num.split('.');
            if (intPart.length > maxIntLength) maxIntLength = intPart.length;
            if (fracPart.length > maxFracLength) maxFracLength = fracPart.length;
        });

        const paddedNumbers = numbersToSum.map(num => {
            let [intPart, fracPart = ''] = num.split('.');
            const paddedInt = intPart.padStart(maxIntLength, '0');
            const paddedFrac = fracPart.padEnd(maxFracLength, '0');
            return paddedInt + paddedFrac;
        });
        
        const decimalPosition = maxFracLength;

        // 2. Animar la suma única con todos los números
        animateMultiSum(paddedNumbers, decimalPosition);
    }

    async function animateMultiSum(paddedNumbers, decimalPosition) {
        // Ajustar altura del SVG para que quepan todos los números
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);

        // Dibujar todos los números, la línea, etc.
        setupMultiLineSVG(paddedNumbers, decimalPosition);
        
        // Realizar el cálculo paso a paso
        const resultString = await performMultiLineStepByStep(paddedNumbers);

        // Formatear el resultado final con su punto decimal
        let finalResultString = resultString;
        if (decimalPosition > 0) {
            finalResultString = resultString.slice(0, -decimalPosition) + '.' + resultString.slice(-decimalPosition);
        }

        // Actualizar UI con el resultado final
        const historyText = numbersToSum.join(' + ').replace(/\./g, ',') + ` = ${finalResultString.replace('.', ',')}`;
        addToHistory(historyText);
        setExplanation(`¡Suma completada! El resultado final es ${finalResultString.replace('.', ',')}.`);
    }

    async function performMultiLineStepByStep(paddedNumbers) {
        let carry = 0;
        let resultString = '';
        const numDigits = paddedNumbers[0].length;

        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i;
            const x = END_X - (i * COLUMN_WIDTH);

            document.getElementById('highlight-rect').setAttribute('x', x - COLUMN_WIDTH / 2);
            await sleep(1500);

            let columnSum = carry;
            let explanationDigits = [];
            
            // Sumar el dígito de cada número en la columna actual
            paddedNumbers.forEach(numStr => {
                const digit = parseInt(numStr[digitIndex]);
                columnSum += digit;
                explanationDigits.push(digit);
            });

            let explanation = `Sumamos: ${explanationDigits.join(' + ')}`;
            if (carry > 0) explanation += ` + ${carry} (llevada)`;
            explanation += ` = ${columnSum}.`;
            setExplanation(explanation);
            
            await sleep(2000);

            const digitForColumn = columnSum % 10;
            carry = Math.floor(columnSum / 10);
            resultString = digitForColumn + resultString;
            
            const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
            svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digitForColumn));

            if (carry > 0) {
                setExplanation(`Escribimos ${digitForColumn} y llevamos ${carry}.`);
                const carryX = x - COLUMN_WIDTH;
                svg.appendChild(createSvgElement('text', { x: carryX, y: Y_CARRY, class: 'digit carry-text carry-animation' }, carry));
            } else {
                setExplanation(`Escribimos ${digitForColumn}. No hay llevada.`);
            }
        }
        
        if (carry > 0) {
            await sleep(2000);
            setExplanation(`Bajamos la última llevada: ${carry}.`);
            const finalCarryX = END_X - (numDigits * COLUMN_WIDTH);
            const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
            svg.appendChild(createSvgElement('text', { x: finalCarryX, y: resultY, class: 'digit result-text' }, carry));
            resultString = carry + resultString;
        }

        await sleep(1000);
        document.getElementById('highlight-rect').setAttribute('x', -1000);
        return resultString;
    }

    function setupMultiLineSVG(paddedNumbers, decimalPos) {
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;

        // Elementos de la UI (rectángulo de resaltado y signo +)
        svg.appendChild(createSvgElement('rect', {
            id: 'highlight-rect', x: -1000, y: 0, width: COLUMN_WIDTH, height: requiredHeight, class: 'highlight-rect'
        }));
        const plusX = END_X - (numDigits * COLUMN_WIDTH) - (COLUMN_WIDTH * 0.5);
        const plusY = Y_START + (paddedNumbers.length - 1) * ROW_HEIGHT;
        svg.appendChild(createSvgElement('text', {x: plusX, y: plusY, class: 'digit plus-sign-svg'}, '+'));

        // Dibujar cada número en su propia fila
        paddedNumbers.forEach((numStr, rowIndex) => {
            const y = Y_START + (rowIndex * ROW_HEIGHT);
            const colorClass = (rowIndex % 2 === 0) ? 'num1-text' : 'num2-text'; // Alternar colores
            for (let i = 0; i < numDigits; i++) {
                const x = END_X - (i * COLUMN_WIDTH);
                // Punto decimal
                if (decimalPos > 0 && i === decimalPos - 1) {
                    const decimalX = x + COLUMN_WIDTH / 2;
                    svg.appendChild(createSvgElement('text', { x: decimalX, y: y, class: 'decimal-point' }, '.'));
                }
                svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, numStr[numDigits - 1 - i]));
            }
        });

        // Línea de suma y punto decimal del resultado
        const lineY = Y_START + (paddedNumbers.length * ROW_HEIGHT) - (ROW_HEIGHT/2);
        svg.appendChild(createSvgElement('line', {
            x1: END_X - (numDigits * COLUMN_WIDTH) - COLUMN_WIDTH, y1: lineY, x2: END_X + COLUMN_WIDTH / 2, y2: lineY, class: 'sum-line'
        }));
        if (decimalPos > 0) {
            const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
            const decimalX = END_X - ((decimalPos - 1) * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
            svg.appendChild(createSvgElement('text', { x: decimalX, y: resultY, class: 'decimal-point' }, '.'));
        }
    }

    // --- 4. FUNCIONES DE AYUDA (sin cambios) ---
    function createSvgElement(tag, attrs, content = '') { /* ... */ }
    function setExplanation(text) { /* ... */ }
    function addToHistory(text) { /* ... */ }
    function sleep(ms) { /* ... */ }

    // Re-pegar aquí las implementaciones completas de las funciones de ayuda del script anterior
    function createSvgElement(tag, attrs, content = '') {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attrs) el.setAttribute(key, attrs[key]);
        if (content) el.textContent = content;
        return el;
    }
    function setExplanation(text) {
        explanationText.style.opacity = '0';
        setTimeout(() => {
            explanationText.textContent = text;
            explanationText.style.opacity = '1';
        }, 300);
    }
    function addToHistory(text) {
        const li = document.createElement('li');
        li.textContent = text;
        historyList.prepend(li);
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
