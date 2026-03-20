# Plan de Implementación: Modo Práctica Iteractivo 🎓

Este plan detalla cómo transformaremos la calculadora en un juego interactivo donde el niño o estudiante deba ingresar los resultados de cada columna y llevar la "llevada".

## Propuesta Técnica

**1. Interfaz de Usuario (UI - Toggle)**
*   Se añadirá un interruptor (Toggle/Checkbox) debajo de los campos de sumar: **"🎓 Activar Modo Práctica"**.
*   Esto se guardará en un nuevo estado central en `ui.js` (`UIState.isPracticeMode`).

**2. Pausas Interactivas en el Cálculo (`calculation.js`)**
*   Aprovecharemos la arquitectura asíncrona existente (`await sleep`).
*   Cuando el Modo Práctica esté activado, en lugar de pintar automáticamente el resultado (`digitForColumn`) y la llevada (`carry`), la función `performMultiLineStepByStep` **se pausará** usando una nueva promesa `await requireUserInput(x, y, correctAnswer, type)`.

**3. Inputs Flotantes sobre el SVG**
*   La función `requireUserInput` creará dinámicamente un campo de texto HTML (`<input type="number">`) y lo posicionará **exactamente** encima de donde iría el número en el SVG usando coordenadas absolutas.
*   El cálculo quedará "congelado" esperando a que el niño escriba el número.

**4. Validación y Feedback**
*   Si el niño escribe el número correcto, el input desaparece, se pinta el número real de color verde/naranja en el SVG, suena una felicitación corta (usando el Web Speech API que ya tienes) y la animación continúa a la siguiente columna.
*   Si se equivoca, el cajoncito de texto se pondrá rojo (efecto *shake* / temblor) para que intente de nuevo.
*   Esto se hará en 2 pasos por columna: Primero te pedirá el número de abajo (resultado), y luego te pedirá el número de la "llevada" arriba (si es que la suma supera 9).

## Archivos Modificados
- [MODIFICAR] `index.html` (Añadir el botón/toggle de Modo Práctica y contenedor flotante)
- [MODIFICAR] `scss/_components.scss` (Estilos para el input interactivo)
- [MODIFICAR] `js/ui.js` (Manejar el cambio de estado)
- [MODIFICAR] `js/calculation.js` (Lógica de pausa e inputs)
- [MODIFICAR] `js/voiceAssistant.js` (Feedback hablado de aciertos/errores)
