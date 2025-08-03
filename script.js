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
    const SVG_WIDTH = 460; const COLUMN_WIDTH = 35; const END_X = SVG_WIDTH - 40;
    const Y_START = 50; const ROW_HEIGHT = 45; const Y_CARRY = 25;

    // --- 3. MANEJADORES DE EVENTOS ---
    addBtn.addEventListener('click', addNumber);
    numberInput.addEventListener('input', () => { numberInput.value = numberInput.value.replace(/[^0-9,.]/g, ''); });
    numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNumber(); } });
    calculateBtn.addEventListener('click', () => startCalculation());
    resetBtn.addEventListener('click', resetCalculator);
    replayBtn.addEventListener('click', () => { if (calculationHistory.length > 0) startCalculation(calculationHistory[calculationHistory.length - 1]); });
    historyList.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li && li.dataset.index) startCalculation(calculationHistory[parseInt(li.dataset.index, 10)]); });
    operandsContainer.addEventListener('click', (e) => { if (calculateBtn.disabled && editingIndex === null) return; if (e.target.classList.contains('delete-btn')) handleDeleteNumber(e.target.dataset.index); else if (e.target.classList.contains('operand-text')) handleEnterEditMode(e.target.dataset.index); });
    procedureList.addEventListener('mouseover', (e) => { const li = e.target.closest('li'); if (li && li.dataset.stepIndex) { const stepIndex = parseInt(li.dataset.stepIndex, 10); const stepData = procedureSteps[stepIndex]; if (stepData) svg.querySelector('#highlight-rect').setAttribute('x', stepData.x - COLUMN_WIDTH / 2); } });
    procedureList.addEventListener('mouseout', () => { const highlightRect = svg.querySelector('#highlight-rect'); if (highlightRect) highlightRect.setAttribute('x', -1000); });

    // --- 4. LÓGICA DE LA INTERFAZ ---
    function addNumber() {
        const value = numberInput.value.trim().replace(',', '.');
        if (value && isFinite(Number(value))) {
            numbersToSum.push(value);
            renderOperands();
            numberInput.value = '';
            numberInput.focus();
        } else { setExplanation(`"${numberInput.value}" no es un número válido.`); }
    }

    function renderOperands() {
        operandsContainer.innerHTML = '';
        if (numbersToSum.length === 0) { operandsContainer.innerHTML = `<div style="color: #ccc; font-size: 1.2rem; width:100%; text-align:center; font-weight:400; padding: 4rem 0;">Tu suma aparecerá aquí</div>`; }
        numbersToSum.forEach((num, index) => {
            const item = document.createElement('div');
            item.className = 'operand-item';
            const deleteButtonHTML = `<button class="delete-btn" data-index="${index}">×</button>`;
            if (index === editingIndex) {
                item.innerHTML = `<input type="text" class="edit-input" value="${num.replace('.',',')}" /> ${deleteButtonHTML}`;
                const input = item.querySelector('.edit-input');
                setTimeout(() => { input.focus(); input.select(); }, 0);
                input.addEventListener('blur', handleSaveEdit);
                input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { editingIndex = null; renderOperands(); } });
            } else { item.innerHTML = `<span class="operand-text" data-index="${index}">${num.replace('.',',')}</span> ${deleteButtonHTML}`; }
            operandsContainer.appendChild(item);
        });
        calculateBtn.disabled = numbersToSum.length < 2 || editingIndex !== null;
        if (editingIndex !== null) { setExplanation("Editando... Pulsa Enter para guardar, o Esc para cancelar."); }
        else if (numbersToSum.length >= 2) { setExplanation("¡Listo para sumar! O sigue añadiendo números."); }
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
        if (newValue && isFinite(Number(newValue))) { numbersToSum[index] = newValue; }
        else { setExplanation(`"${input.value}" no es válido. Se restauró el valor anterior.`); }
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
            // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
            // 1. Encontrar la longitud máxima de las partes enteras y fraccionarias
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

            // 2. Crear los números "acolchados" (padded) para la alineación visual
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
            // --- FIN DE LA CORRECCIÓN DEFINITIVA ---
        }

        const { paddedNumbers, decimalPosition } = calculationData;
        await animateMultiSum(paddedNumbers, decimalPosition);
        
        const finalResultString = calculationHistory.find(c => c.originalNumbers.join() === calculationData.originalNumbers.join()).resultString;
        
        setUIMode('result');
        setExplanation(`¡Suma completada! El resultado final es ${finalResultString.replace('.', ',')}.`);
        renderProcedure();
    }

    function addToHistory(calcData) {
        historySection.classList.remove('hidden');
        const index = calculationHistory.length;
    
        let result = BigInt(0);
        calcData.paddedNumbers.forEach(numStr => {
            result += BigInt(numStr);
        });
    
        let resultString = result.toString().padStart(calcData.decimalPosition + 1, '0');
        
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
        svg.innerHTML = ''; 
        setupMultiLineSVG(paddedNumbers, decimalPos);
        await performMultiLineStepByStep(paddedNumbers, decimalPos);
    }
    
    async function performMultiLineStepByStep(paddedNumbers, decimalPos) {
        procedureSteps = [];
        let carry = 0, resultString = '', allCarries = [];
        const numDigits = paddedNumbers[0].length;
        const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
        if (decimalPos > 0) svg.appendChild(createSvgElement('text', { x: END_X - ((decimalPos) * COLUMN_WIDTH) + COLUMN_WIDTH / 2, y: resultY, class: 'decimal-point' }, '.'));

        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i, x = END_X - (i * COLUMN_WIDTH);
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
            resultString = digitForColumn + resultString;
            setExplanation(`Columna: ...${columnSum}. Se escribe ${digitForColumn}, se lleva ${carry}.`);
            svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digitForColumn));
            const prevCarry = svg.querySelector('.carry-text');
            if (prevCarry) prevCarry.remove();
            if (carry > 0) {
                allCarries.push({ value: carry, x: x - COLUMN_WIDTH });
                svg.appendChild(createSvgElement('text', { x: x - COLUMN_WIDTH, y: Y_CARRY, class: 'digit carry-text' }, carry));
            }
            await sleep(1500);
        }
        
        if (carry > 0) {
            setExplanation(`Se baja la última llevada: ${carry}.`);
            await sleep(1000);
            svg.appendChild(createSvgElement('text', { x: END_X - (numDigits * COLUMN_WIDTH), y: resultY, class: 'digit result-text' }, carry));
        }
        
        document.getElementById('highlight-rect').setAttribute('x', -1000);
        const finalFloatingCarry = svg.querySelector('.carry-text');
        if (finalFloatingCarry) finalFloatingCarry.remove();
        allCarries.forEach(c => svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value)));
    }

    function renderProcedure() {
        procedureList.innerHTML = '';
        if (procedureSteps.length === 0) return;
        procedureSection.classList.remove('hidden');
        procedureSteps.forEach((step, index) => {
            const li = document.createElement('li');
            li.dataset.stepIndex = index;
            let explanation = `<strong>Columna ${index + 1}:</strong> Se suma ${step.digits.join(' + ')}`;
            if (step.carryIn > 0) explanation += ` + ${step.carryIn} (llevada)`;
            explanation += ` = ${step.sum}. Se escribe ${step.resultDigit} y se lleva ${step.carryOut}.`;
            li.innerHTML = explanation;
            procedureList.appendChild(li);
        });
    }

    function setupMultiLineSVG(paddedNumbers, decimalPos) {
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.appendChild(createSvgElement('rect', { id: 'highlight-rect', x: -1000, y: 0, width: COLUMN_WIDTH, height: requiredHeight, class: 'highlight-rect' }));
        if (paddedNumbers.length > 1) { const plusX = END_X - (numDigits * COLUMN_WIDTH) - (COLUMN_WIDTH * 0.5); const plusY = Y_START + ((paddedNumbers.length - 1) * ROW_HEIGHT); svg.appendChild(createSvgElement('text', { x: plusX, y: plusY, class: 'digit plus-sign-svg' }, '+')); }
        paddedNumbers.forEach((numStr, rowIndex) => { const y = Y_START + (rowIndex * ROW_HEIGHT); const colorClass = (rowIndex % 2 === 0) ? 'num1-text' : 'num2-text'; for (let i = 0; i < numDigits; i++) { const x = END_X - (i * COLUMN_WIDTH); if (decimalPos > 0 && i === decimalPos) { svg.appendChild(createSvgElement('text', { x: x + COLUMN_WIDTH / 2, y: y, class: 'decimal-point' }, '.')); } svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, numStr[numDigits - 1 - i])); } });
        const lineY = Y_START + (paddedNumbers.length * ROW_HEIGHT) - (ROW_HEIGHT / 2);
        svg.appendChild(createSvgElement('line', { x1: END_X - (numDigits * COLUMN_WIDTH) - COLUMN_WIDTH * 1.5, y1: lineY, x2: END_X + COLUMN_WIDTH / 2, y2: lineY, class: 'sum-line-svg' }));
    }

    // --- 6. FUNCIONES AUXILIARES ---
    function createSvgElement(tag, attrs, content) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const key in attrs) el.setAttribute(key, attrs[key]); if (content !== undefined) el.textContent = content; return el; }
    function setExplanation(text) { explanationText.style.opacity = '0'; setTimeout(() => { explanationText.textContent = text; explanationText.style.opacity = '1'; }, 300); }
    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    // --- INICIALIZACIÓN ---
    resetCalculator();
});