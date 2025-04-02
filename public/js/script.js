// utils.js

/**
 * Formatuje datę do lokalnego czasu Europe/Warsaw.
 * @param {string} dateString - Data w formacie ISO 8601 (np. "2024-12-18T22:00:00.000Z").
 * @returns {string} - Data sformatowana zgodnie z pl-PL (np. "19.12.2024").
 */
export function formatDateWithoutTimezone(dateString) {
    if (!dateString) return 'Brak daty';

    const date = new Date(dateString);

    return date.toLocaleDateString('pl-PL', {
        timeZone: 'Europe/Warsaw',
    });
}
