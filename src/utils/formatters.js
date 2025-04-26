/**
 * Format money values for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted money string
 */
export function formatMoney(amount) {
  if (amount >= 1e9) {
    return '$' + (amount / 1e9).toFixed(2) + 'B';
  } else if (amount >= 1e6) {
    return '$' + (amount / 1e6).toFixed(2) + 'M';
  } else {
    return '$' + amount.toLocaleString();
  }
}