document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SELECCIÓN DE ELEMENTOS Y ESTADO GLOBAL ---
    const numberInput = document.getElementById('numberInput');
    const addBtn = document.getElementById('addBtn');
    const numberList = document.getElementById('number-list');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const replayBtn = document.getElementById('replayBtn');
    const svg = document.getElementById('calculation-svg');
    const explanationText = document.getElementById('explanation-text');
    const historyList = document.getElementById('history-list');

    let numbersToSum = [];
    let lastCalculationData = null;

    // --- CONSTANTES DE CONFIGURACIÓN DEL SVG ---
    const SVG_WIDTH = 500;
    const COLUMN_WIDTH = 30;
    const END_X = SVG_WIDTH - 40;
    const Y_START = 50;
    const ROW_HEIGHT = 40;
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
    replayBtn.addEventListener('click', handleReplay);

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
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} 200`);
        replayBtn.hidden = true;
        lastCalculationData = null;
    }

    function startCalculation() {
        if (numbersToSum.length < 2) return;
        calculateBtn.disabled = true;
        numberInput.disabled = true;
        addBtn.disabled = true;
        replayBtn.hidden = true;
        svg.innerHTML = '';
        
        let maxIntLength = 0, maxFracLength = 0;
        numbersToSum.forEach(num => {
            const [intPart, fracPart = ''] = num.split('.');
            if (intPart.length > maxIntLength) maxIntLength = intPart.length;
            if (fracPart.length > maxFracLength) maxFracLength = fracPart.length;
        });

        const paddedNumbers = numbersToSum.map(num => {
            let [intPart, fracPart = ''] = num.split('.');
            return intPart.padStart(maxIntLength, '0') + fracPart.padEnd(maxFracLength, '0');
        });
        
        const decimalPosition = maxFracLength;
        lastCalculationData = { paddedNumbers, decimalPosition };
        animateMultiSum(paddedNumbers, decimalPosition, true);
    }

    async function handleReplay() {
        if (!lastCalculationData) return;
        replayBtn.disabled = true;
        resetBtn.disabled = true;
        await animateMultiSum(lastCalculationData.paddedNumbers, lastCalculationData.decimalPosition, false);
        replayBtn.disabled = false;
        resetBtn.disabled = false;
    }

    async function animateMultiSum(paddedNumbers, decimalPosition, isFirstRun) {
        svg.innerHTML = '';
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);
        setupMultiLineSVG(paddedNumbers, decimalPosition);
        
        const resultString = await performMultiLineStepByStep(paddedNumbers);

        let finalResultString = resultString;
        if (decimalPosition > 0) {
            const integerPart = resultString.slice(0, -decimalPosition) || '0';
            const fractionalPart = resultString.slice(-decimalPosition);
            finalResultString = integerPart + '.' + fractionalPart;
        }

        if (isFirstRun) {
            const historyText = numbersToSum.join(' + ').replace(/\./g, ',') + ` = ${finalResultString.replace('.', ',')}`;
            addToHistory(historyText);
            setExplanation(`¡Suma completada! El resultado final es ${finalResultString.replace('.', ',')}.`);
            replayBtn.hidden = false;
        } else {
            setExplanation(`Viendo de nuevo... ¡El resultado es ${finalResultString.replace('.', ',')}!`);
        }
    }

    async function performMultiLineStepByStep(paddedNumbers) {
        let carry = 0;
        let resultString = '';
        const numDigits = paddedNumbers[0].length;

        for (let i = 0; i < numDigits; i++) {
            const existingCarry = svg.querySelector('.carry-text');
            if (existingCarry) {
                existingCarry.remove();
            }

            const digitIndex = numDigits - 1 - i;
            const x = END_X - (i * COLUMN_WIDTH);

            document.getElementById('highlight-rect').setAttribute('x', x - COLUMN_WIDTH / 2);
            await sleep(1500);

            let columnSum = carry;
            let explanationDigits = [];
            
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
            await sleep(2000);
        }
        
        if (carry > 0) {
            await sleep(1000);
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

        svg.appendChild(createSvgElement('rect', {
            id: 'highlight-rect', x: -1000, y: 0, width: COLUMN_WIDTH, height: requiredHeight, class: 'highlight-rect'
        }));
        const plusX = END_X - (numDigits * COLUMN_WIDTH) - (COLUMN_WIDTH * 0.5);
        const plusY = Y_START + (paddedNumbers.length - 1) * ROW_HEIGHT;
        svg.appendChild(createSvgElement('text', {x: plusX, y: plusY, class: 'digit plus-sign-svg'}, '+'));

        paddedNumbers.forEach((numStr, rowIndex) => {
            const y = Y_START + (rowIndex * ROW_HEIGHT);
            const colorClass = (rowIndex % 2 === 0) ? 'num1-text' : 'num2-text';
            for (let i = 0; i < numDigits; i++) {
                const x = END_X - (i * COLUMN_WIDTH);
                if (decimalPos > 0 && i === decimalPos - 1) {
                    const decimalX = x + COLUMN_WIDTH / 2;
                    svg.appendChild(createSvgElement('text', { x: decimalX, y: y, class: 'decimal-point' }, '.'));
                }
                svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, numStr[numDigits - 1 - i]));
            }
        });

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

    // --- FUNCIÓN AUXILIAR CORREGIDA ---
    function createSvgElement(tag, attrs, content = '') {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attrs) el.setAttribute(key, attrs[key]);
        // CORRECCIÓN: Se comprueba explícitamente para no ignorar el número 0.
        if (content !== '' && content !== null && content !== undefined) {
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
    function addToHistory(text) {
        const li = document.createElement('li');
        li.textContent = text;
        historyList.prepend(li);
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});