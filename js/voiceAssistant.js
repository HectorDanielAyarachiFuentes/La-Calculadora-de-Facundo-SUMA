// js/voiceAssistant.js

import { Elements } from './ui.js'; // Necesario para Elements.procedureList

// --- Funciones de conversión de números a letras ---
const unidades = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve"];
const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

export function numeroALetras(n) {
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

// --- Frases de motivación y explicaciones ---
const kidMotivations = ["Puedes brillar, ¡no importa de qué estés hecho!", "La perfección no existe, eres hermoso como eres. Con todas tus imperfecciones lograrás lo que quieras, te lo juro por Dieguito Maradona.", "¡Cada error es una oportunidad para aprender algo nuevo! ¡Sigue intentando!", "¡Eres más valiente de lo que crees y más inteligente de lo que piensas!", "¡Wow, qué bien lo estás haciendo! Cada suma te hace más fuerte.", "El secreto para salir adelante es empezar. ¡Y tú ya empezaste!"];
const adultMotivations = ["Eres el mejor.", "Gracias por enseñar con paciencia. Estás construyendo la confianza de un niño, un número a la vez.", "Recuerda que el objetivo no es la respuesta correcta, sino el proceso de aprender y descubrir juntos.", "Tu apoyo y ánimo son las herramientas más importantes en este viaje de aprendizaje.", "Celebrar los pequeños logros crea grandes aprendices. ¡Sigue así!", "Enseñar es dejar una huella en el futuro. Gracias por tu dedicación."];

const columnCompletePhrases = ["¡Perfecto!", "¡Así se hace!", "¡Muy bien!", "¡Genial!", "¡Vamos de maravilla!", "¡Eso es!"];
const noCarryPhrases = ["¡Estupendo! Aquí no nos llevamos nada.", "¡Fácil! Como no nos llevamos nada, pasamos a la siguiente.", "¡Bien hecho! No hay llevada, así que seguimos."];
const finalResultPhrases = ["¡Y lo logramos! ¡Qué gran trabajo has hecho!", "¡Misión cumplida! La suma es correcta. ¡Eres un genio de las mates!", "¡Terminamos! Y el resultado es perfecto. ¡Estoy muy orgulloso de ti!"];

/**
 * Devuelve una frase aleatoria de un array dado.
 * @param {Array<string>} phrases - El array de frases.
 * @returns {string} Una frase aleatoria.
 */
function getRandomPhrase(phrases) {
    return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Lee un texto en voz alta usando la API SpeechSynthesis.
 * @param {string} texto - El texto a leer.
 */
export function leerEnVoz(texto) {
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

/**
 * Lee una motivación aleatoria según el tipo de audiencia.
 * @param {'kid'|'adult'} type - Tipo de audiencia ('kid' o 'adult').
 */
export function readRandomMotivation(type) {
    const phrases = type === 'kid' ? kidMotivations : adultMotivations;
    leerEnVoz(getRandomPhrase(phrases));
}

// Exportar los nombres de columna para posibles usos externos o consistencia
export const columnNames = {
    decimal: ["décimos", "centésimos", "milésimos", "diezmilésimos"],
    integer: ["unidades", "decenas", "centenas", "unidades de mil", "decenas de mil"]
};

// --- Estado del lector de voz ---
let currentProcedureClickHandler = null;
let currentlySpeakingItem = null;

/**
 * Configura el tutor de voz para leer los pasos del procedimiento al hacer clic.
 * @param {Array<object>} procedureSteps - Los pasos del procedimiento actuales.
 * @param {object} currentCalculationData - Los datos del cálculo actual.
 * @param {boolean} hasExplainedPaddingZero - Bandera para controlar la explicación de ceros de relleno.
 * @param {function(boolean): void} setHasExplainedPaddingZero - Setter para la bandera hasExplainedPaddingZero.
 * @param {function(number, number): string} getColumnaName - Función para obtener el nombre de la columna.
 */
export function setupVoiceReader(procedureSteps, currentCalculationData, hasExplainedPaddingZero, setHasExplainedPaddingZero, getColumnaName) {
    if (!Elements.procedureList) return;
    
    // Eliminar los manejadores de eventos anteriores para evitar duplicados
    if (currentProcedureClickHandler) {
        Elements.procedureList.removeEventListener('click', currentProcedureClickHandler);
        Elements.procedureList.removeEventListener('keydown', currentProcedureClickHandler);
    }

    // Definir el nuevo manejador de eventos
    currentProcedureClickHandler = (event) => { // Reutilizamos la variable para poder limpiarla después
        // Solo reaccionar a click, o a las teclas Enter/Espacio
        if (event.type !== 'click' && (event.key !== 'Enter' && event.key !== ' ')) {
            return;
        }

        const listItem = event.target.closest('li[role="button"]');
        if (!listItem) return;

        // Prevenir el scroll de la página al presionar Espacio y que se active dos veces
        if (event.type === 'keydown') {
            event.preventDefault();
        }

        // Si se hace clic en el mismo elemento que se está reproduciendo, detener la voz.
        if (window.speechSynthesis.speaking && currentlySpeakingItem === listItem) {
            window.speechSynthesis.cancel();
            currentlySpeakingItem = null;
            return;
        }
        
        const textToReadFromDOM = listItem.querySelector('.procedure-text')?.textContent || listItem.textContent;

        const stepIndex = parseInt(listItem.dataset.stepIndex, 10);
        const stepData = procedureSteps.find(s => s.stepIndex === stepIndex); // Buscar por stepIndex real
        if (!stepData) {
            leerEnVoz(textToReadFromDOM);
            return;
        }

        const { decimalPosition, isPaddingZeroMatrix } = currentCalculationData || {};
        const isDecimalColumn = decimalPosition > 0 && stepIndex < decimalPosition;
        const numDigits = currentCalculationData.paddedNumbers[0].length;
        // El digitIndexInString es el índice del dígito dentro del string de número alineado,
        // leído de izquierda a derecha.
        // El stepIndex va de 0 (derecha) a numDigits-1 (izquierda).
        const digitIndexInString = numDigits - 1 - stepIndex;

        let columnName = "";
        if (isDecimalColumn) {
            const decimalLabelIndex = decimalPosition - 1 - stepIndex; // Índice para el array de labels
            columnName = columnNames.decimal[decimalLabelIndex] || `la columna decimal número ${decimalLabelIndex + 1}`;
        } else {
            const integerLabelIndex = stepIndex - decimalPosition; // Índice para el array de labels
            columnName = columnNames.integer[integerLabelIndex] || `la columna de enteros número ${integerLabelIndex + 1}`;
        }

        let descripcion = "";

        if (stepData.isFinalCarry) {
            descripcion += `¡Atención, este es el último paso! Como ya no hay más columnas, ese ${numeroALetras(stepData.carryIn)} que nos llevábamos baja directamente para ser el primer número de nuestra respuesta final. `;
            descripcion += getRandomPhrase(finalResultPhrases);
        } else {
            descripcion += `Vamos con la columna de las ${columnName}. `;

            let nonZeroDigits = [];
            let zeroCount = 0;
            let containsPaddingZeroInColumn = false; // Bandera para esta columna específica

            stepData.digits.forEach((digit, rowIndex) => {
                if (digit === 0) {
                    zeroCount++;
                    // Verifica si el cero actual es un cero de relleno
                    const isPadding = isPaddingZeroMatrix && isPaddingZeroMatrix[rowIndex] && isPaddingZeroMatrix[rowIndex][digitIndexInString];
                    if (isPadding) {
                        containsPaddingZeroInColumn = true;
                    }
                } else {
                    nonZeroDigits.push(digit);
                }
            });

            if (nonZeroDigits.length === 0 && stepData.carryIn === 0 && zeroCount > 0) {
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

                if (containsPaddingZeroInColumn && !hasExplainedPaddingZero) {
                    descripcion += `Uno de esos ceros lo pusimos nosotros para alinear los números. ¡Es una pequeña ayuda! `;
                    setHasExplainedPaddingZero(true); // Actualizar la bandera global
                }

                if (stepData.carryIn > 0) {
                    descripcion += `Y no olvidemos el ${numeroALetras(stepData.carryIn)} que nos estábamos llevando. `;
                }

                descripcion += `En total, la columna suma ${numeroALetras(stepData.sum)}. `;
                descripcion += `Por lo tanto, debajo de la línea escribimos el ${numeroALetras(stepData.resultDigit)}. `;
            }

            // Lógica para las columnas intermedias
            if (stepData.carryOut > 0) {
                // Calcular el nombre de la siguiente columna
                let nextColumnName = "";
                const nextStepIndex = stepIndex + 1; // El siguiente paso en el flujo de la derecha a izquierda

                if (nextStepIndex < decimalPosition) { // Sigue siendo decimal
                    const nextDecimalLabelIndex = decimalPosition - 1 - nextStepIndex;
                    nextColumnName = columnNames.decimal[nextDecimalLabelIndex] || `decimal ${nextDecimalLabelIndex + 1}`;
                } else { // Pasa a entero o sigue en entero
                    const nextIntegerLabelIndex = nextStepIndex - decimalPosition;
                    nextColumnName = columnNames.integer[nextIntegerLabelIndex] || `entera ${nextIntegerLabelIndex + 1}`;
                }

                descripcion += `${getRandomPhrase(columnCompletePhrases)} Como el resultado fue mayor que nueve, nos llevamos ${numeroALetras(stepData.carryOut)} para la columna de las ${nextColumnName}. `;
            } else if (!(nonZeroDigits.length === 0 && stepData.carryIn === 0 && zeroCount > 0)) {
                // Solo si realmente hubo algo que sumar y no hubo llevada
                descripcion += `${getRandomPhrase(noCarryPhrases)} `;
            }

            if (isDecimalColumn && stepIndex === decimalPosition - 1) {
                descripcion += `¡Momento clave! Como terminamos con los decimales, ahora ponemos la coma. ¡Y seguimos con los números enteros! `;
            }
        }

        currentlySpeakingItem = listItem; // Marcar este elemento como el que se está reproduciendo
        leerEnVoz(descripcion.replace(/ +/g, ' ').trim());
    };

    // Añadir el nuevo manejador de eventos
    Elements.procedureList.addEventListener('click', currentProcedureClickHandler);
    Elements.procedureList.addEventListener('keydown', currentProcedureClickHandler);
}