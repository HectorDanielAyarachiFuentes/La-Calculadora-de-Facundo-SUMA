// js/confetti.js
// Lanza el efecto de confeti al completar el Modo Práctica con éxito.

/**
 * Dispara una ráfaga de confeti festiva usando canvas-confetti (cargado desde CDN).
 * La librería expone `window.confetti` de forma global.
 */
export function launchConfetti() {
    if (typeof window.confetti !== 'function') return;

    // Ráfaga central explosiva
    window.confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6e48aa', '#4a90d9', '#20c997', '#f97316', '#f9d923', '#ec4899'],
        scalar: 1.1,
        gravity: 0.9,
        startVelocity: 45,
    });

    // Dos cañones laterales con un leve retraso (efecto fuegos artificiales)
    setTimeout(() => {
        window.confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors: ['#6e48aa', '#f9d923', '#20c997'],
        });
        window.confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors: ['#4a90d9', '#ec4899', '#f97316'],
        });
    }, 200);

    // Lluvia final suave
    setTimeout(() => {
        window.confetti({
            particleCount: 40,
            spread: 120,
            gravity: 0.5,
            origin: { y: 0.1 },
            colors: ['#f9d923', '#20c997', '#ec4899'],
            scalar: 0.8,
        });
    }, 500);
}
