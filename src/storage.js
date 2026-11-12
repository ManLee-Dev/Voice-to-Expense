const STORAGE_KEY = 'nlg_txs';

export function loadTransactions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error('Không thể đọc giao dịch đã lưu.', error);
    return [];
  }
}

export function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error('Không thể lưu giao dịch.', error);
    return false;
  }
}

const pad = value => String(value).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

export function formatMoney(amount) {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[character]));
}

export function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
