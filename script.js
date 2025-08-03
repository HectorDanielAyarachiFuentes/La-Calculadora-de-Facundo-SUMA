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

    // --- 2. ESTADO GLOBAL ---
    let numbersToSum = [];
    let calculationHistory = [];
    let editingIndex = null; // <-- NUEVA VARIABLE DE ESTADO

    // --- CONSTANTES SVG ---
    const SVG_WIDTH = 460; const COLUMN_WIDTH = 35; const END_X = SVG_WIDTH - 40;
    const Y_START = 50; const ROW_HEIGHT = 45; const Y_CARRY = 25;

    // --- 3. MANEJADORES DE EVENTOS ---
    addBtn.addEventListener('click', addNumber);
    numberInput.addEventListener('input', () => { numberInput.value = numberInput.value.replace(/[^0-9,.]/g, ''); });
    numberInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNumber(); } });
    calculateBtn.addEventListener('click', () => startCalculation());
    resetBtn.addEventListener('click', resetCalculator);

    // MANEJADORES DE REPETICIÓN
    replayBtn.addEventListener('click', () => {
        if (calculationHistory.length > 0) startCalculation(calculationHistory[calculationHistory.length - 1]);
    });
    historyList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.index) startCalculation(calculationHistory[parseInt(li.dataset.index, 10)]);
    });

    // --- INICIO DE LA CORRECCIÓN: Delegación de eventos para editar y borrar ---
    operandsContainer.addEventListener('click', (e) => {
        // Si estamos en modo de cálculo, no hacemos nada.
        if (calculateBtn.disabled && editingIndex === null) return;

        if (e.target.classList.contains('delete-btn')) {
            handleDeleteNumber(e.target.dataset.index);
        } else if (e.target.classList.contains('operand-text')) {
            handleEnterEditMode(e.target.dataset.index);
        }
    });
    // --- FIN DE LA CORRECCIÓN ---


    // --- 4. LÓGICA DE LA INTERFAZ (CRUD de números) ---
    function addNumber() {
        const value = numberInput.value.trim().replace(',', '.');
        if (value && isFinite(Number(value))) {
            numbersToSum.push(value);
            renderOperands();
            numberInput.value = '';
            numberInput.focus();
        } else { setExplanation(`"${numberInput.value}" no es un número válido.`); }
    }

    function handleDeleteNumber(index) {
        editingIndex = null; // Salir de modo edición si se está editando
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
        
        editingIndex = null; // Salir del modo edición
        renderOperands();
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
                // MODO EDICIÓN: Renderizar un input
                item.innerHTML = `<input type="text" class="edit-input" value="${num.replace('.',',')}" /> ${deleteButtonHTML}`;
                const input = item.querySelector('.edit-input');
                setTimeout(() => { input.focus(); input.select(); }, 0); // Focus y seleccionar texto
                
                input.addEventListener('blur', handleSaveEdit);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                    if (e.key === 'Escape') { editingIndex = null; renderOperands(); }
                });
            } else {
                // MODO VISUALIZACIÓN: Renderizar un span
                item.innerHTML = `<span class="operand-text" data-index="${index}">${num.replace('.',',')}</span> ${deleteButtonHTML}`;
            }
            operandsContainer.appendChild(item);
        });

        calculateBtn.disabled = numbersToSum.length < 2 || editingIndex !== null;
        if (editingIndex !== null) {
            setExplanation("Editando... Pulsa Enter para guardar, o Esc para cancelar.");
        } else if (numbersToSum.length >= 2) {
            setExplanation("¡Listo para sumar! O sigue añadiendo números.");
        }
    }
    
    function resetCalculator() {
        numbersToSum = [];
        editingIndex = null; // Resetear el estado de edición
        setUIMode('input');
        renderOperands();
        setExplanation('Añade al menos dos números para empezar.');
    }

    function setUIMode(mode) {
        if (mode === 'input') {
            inputContainer.classList.remove('hidden');
            calculateBtn.classList.remove('hidden');
            replayBtn.classList.add('hidden');
            operandsContainer.classList.remove('hidden');
            svg.classList.add('hidden');
            svg.innerHTML = '';
            calculateBtn.disabled = numbersToSum.length < 2;
        } 
        else if (mode === 'calculating') {
            inputContainer.classList.add('hidden');
            calculateBtn.classList.add('hidden');
            replayBtn.classList.add('hidden');
            operandsContainer.classList.add('hidden');
            svg.classList.remove('hidden');
        }
        else if (mode === 'result') {
            inputContainer.classList.add('hidden');
            calculateBtn.classList.add('hidden');
            replayBtn.classList.remove('hidden');
            svg.classList.remove('hidden');
        }
    }
    
    // --- 5. LÓGICA DEL CÁLCULO (Sin cambios significativos) ---
    async function startCalculation(replayData = null) {
        setUIMode('calculating');
        let calculationData;
        if (replayData) {
            calculationData = replayData;
        } else {
            let maxIntLength = 0, maxFracLength = 0;
            numbersToSum.forEach(num => {
                const [intPart, fracPart = ''] = num.split('.');
                maxIntLength = Math.max(maxIntLength, intPart.length);
                maxFracLength = Math.max(maxFracLength, fracPart ? fracPart.length : 0);
            });
            const paddedNumbers = numbersToSum.map(num => {
                let [intPart, fracPart = ''] = num.split('.');
                return intPart.padStart(maxIntLength, '0') + fracPart.padEnd(maxFracLength, '0');
            });
            calculationData = { paddedNumbers, decimalPosition: maxFracLength, originalNumbers: [...numbersToSum] };
            addToHistory(calculationData);
        }
        const { paddedNumbers, decimalPosition, originalNumbers } = calculationData;
        const resultString = await animateMultiSum(paddedNumbers, decimalPosition);
        let finalResultString = resultString;
        if (decimalPosition > 0) {
            const integerPart = resultString.slice(0, -decimalPosition) || '0';
            finalResultString = integerPart + '.' + resultString.slice(-decimalPosition);
        }
        setUIMode('result');
        setExplanation(`¡Suma completada! El resultado final es ${finalResultString.replace('.', ',')}.`);
    }

    function addToHistory(calcData) {
        historySection.classList.remove('hidden');
        const index = calculationHistory.length;
        calculationHistory.push(calcData);
        const li = document.createElement('li');
        li.dataset.index = index;
        let result = BigInt(0);
        calcData.originalNumbers.forEach(numStr => {
            const [intPart = '0', fracPart = ''] = numStr.split('.');
            const combined = intPart + fracPart.padEnd(calcData.decimalPosition, '0');
            result += BigInt(combined);
        });
        let resultString = result.toString().padStart(calcData.decimalPosition + 1, '0');
        if (calcData.decimalPosition > 0) {
            resultString = resultString.slice(0, -calcData.decimalPosition) + ',' + resultString.slice(-calcData.decimalPosition);
        }
        li.textContent = calcData.originalNumbers.join(' + ').replace(/\./g, ',') + ` = ${resultString}`;
        historyList.prepend(li);
    }
    
    async function animateMultiSum(paddedNumbers, decimalPos) {
        // ... (sin cambios)
        const numDigits = paddedNumbers[0].length;
        const requiredHeight = Y_START + (paddedNumbers.length + 2) * ROW_HEIGHT;
        svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${requiredHeight}`);
        svg.innerHTML = ''; 
        setupMultiLineSVG(paddedNumbers, decimalPos);
        return await performMultiLineStepByStep(paddedNumbers, decimalPos);
    }
    
    async function performMultiLineStepByStep(paddedNumbers, decimalPos) {
        // ... (sin cambios)
        let carry = 0;
        let resultString = '';
        const numDigits = paddedNumbers[0].length;
        const resultY = Y_START + (paddedNumbers.length + 1) * ROW_HEIGHT;
        let allCarries = [];
        if (decimalPos > 0) {
            const decimalX = END_X - ((decimalPos - 1) * COLUMN_WIDTH) + COLUMN_WIDTH / 2;
            svg.appendChild(createSvgElement('text', { x: decimalX, y: resultY, class: 'decimal-point' }, '.'));
        }
        for (let i = 0; i < numDigits; i++) {
            const digitIndex = numDigits - 1 - i;
            const x = END_X - (i * COLUMN_WIDTH);
            document.getElementById('highlight-rect').setAttribute('x', x - COLUMN_WIDTH / 2);
            await sleep(1200);
            let columnSum = carry;
            paddedNumbers.forEach(numStr => columnSum += parseInt(numStr[digitIndex]));
            const digitForColumn = columnSum % 10;
            carry = Math.floor(columnSum / 10);
            resultString = digitForColumn + resultString;
            setExplanation(`Columna: ...${columnSum}. Se escribe ${digitForColumn}, se lleva ${carry}.`);
            svg.appendChild(createSvgElement('text', { x, y: resultY, class: 'digit result-text' }, digitForColumn));
            const prevCarry = svg.querySelector('.carry-text');
            if (prevCarry) prevCarry.remove();
            if (carry > 0) {
                const carryX = x - COLUMN_WIDTH;
                allCarries.push({ value: carry, x: carryX });
                svg.appendChild(createSvgElement('text', { x: carryX, y: Y_CARRY, class: 'digit carry-text' }, carry));
            }
            await sleep(1500);
        }
        if (carry > 0) {
            setExplanation(`Se baja la última llevada: ${carry}.`);
            await sleep(1000);
            const finalCarryX = END_X - (numDigits * COLUMN_WIDTH);
            svg.appendChild(createSvgElement('text', { x: finalCarryX, y: resultY, class: 'digit result-text' }, carry));
            resultString = carry + resultString;
        }
        document.getElementById('highlight-rect').setAttribute('x', -1000);
        const finalFloatingCarry = svg.querySelector('.carry-text');
        if (finalFloatingCarry) finalFloatingCarry.remove();
        allCarries.forEach(c => {
            svg.appendChild(createSvgElement('text', { x: c.x, y: Y_CARRY, class: 'digit carry-text' }, c.value));
        });
        return resultString;
    }

    function setupMultiLineSVG(paddedNumbers, decimalPos) {
        // ... (sin cambios)
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
                if (decimalPos > 0 && i === decimalPos - 1) {
                    svg.appendChild(createSvgElement('text', { x: x + COLUMN_WIDTH / 2, y: y, class: 'decimal-point' }, '.'));
                }
                svg.appendChild(createSvgElement('text', { x, y, class: `digit ${colorClass}` }, numStr[numDigits - 1 - i]));
            }
        });
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