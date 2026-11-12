import { dayOffset, escapeHTML, formatMoney, normalizeSearch } from './storage.js';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './parser.js';

const $ = selector => document.querySelector(selector);
const sumByType = (transactions, type) =>
  transactions.filter(item => item.type === type).reduce((sum, item) => sum + item.amount, 0);

function dayLabel(date) {
  if (date === dayOffset(0)) return 'Hôm nay';
  if (date === dayOffset(-1)) return 'Hôm qua';
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export function renderTotals(transactions) {
  const today = dayOffset(0);
  const monthPrefix = today.slice(0, 7);
  const monthTransactions = transactions.filter(item => item.date.startsWith(monthPrefix));

  $('#sDay').textContent = formatMoney(sumByType(transactions.filter(item => item.date === today), 'expense'));
  $('#sMon').textContent = formatMoney(sumByType(monthTransactions, 'expense'));
  $('#sInc').textContent = formatMoney(sumByType(monthTransactions, 'income'));
}

export function renderList(transactions) {
  const query = normalizeSearch($('#transactionSearch').value);
  const type = $('#transactionType').value;
  const matches = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .filter(item => {
      const searchable = normalizeSearch(`${item.label} ${item.cat} ${item.date}`);
      return (type === 'all' || item.type === type) && (!query || searchable.includes(query));
    })
    .slice(0, 8);

  if (!matches.length) {
    $('#list').innerHTML = `<div class="empty">${transactions.length ? 'Không tìm thấy giao dịch phù hợp.' : 'Chưa có khoản nào. Chạm vào mic và nói thử nhé.'}</div>`;
    return;
  }

  $('#list').innerHTML = matches.map(item => `
    <div class="row" role="listitem">
      <div class="row-category">
        <span class="category-mark" aria-hidden="true">${CATEGORY_ICONS[item.cat] || CATEGORY_ICONS['Khác']}</span>
        <div class="row-copy">
          <b>${escapeHTML(item.label)}</b>
          <small>${escapeHTML(item.cat)} · ${dayLabel(item.date)}</small>
        </div>
      </div>
      <div class="r ${item.type === 'income' ? 'inc' : ''}">
        ${item.type === 'income' ? '+' : '−'}${formatMoney(item.amount)}
        <button class="d" data-id="${item.id}" aria-label="Xóa khoản ${escapeHTML(item.label)}">×</button>
      </div>
    </div>`).join('');
}

export function renderStats(transactions, range) {
  const startDate = range === 'week' ? dayOffset(-6) : `${dayOffset(0).slice(0, 7)}-01`;
  const expenses = transactions.filter(item => item.type === 'expense' && item.date >= startDate);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (!total) {
    $('#stats').innerHTML = '<div class="empty">Chưa có chi tiêu trong khoảng này.</div>';
    return;
  }

  const byCategory = {};
  expenses.forEach(item => {
    byCategory[item.cat] = (byCategory[item.cat] || 0) + item.amount;
  });
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  let offset = 0;
  const arcs = rows.map(([category, amount]) => {
    const percent = amount / total * 100;
    const arc = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${CATEGORY_COLORS[category] || CATEGORY_COLORS['Khác']}" stroke-width="7" stroke-dasharray="${percent} ${100 - percent}" stroke-dashoffset="${25 - offset}"/>`;
    offset += percent;
    return arc;
  }).join('');

  $('#stats').innerHTML = `
    <div class="pie">
      <svg viewBox="0 0 42 42" role="img" aria-label="Biểu đồ tròn chi tiêu theo danh mục">
        ${arcs}
        <text x="21" y="20" text-anchor="middle" font-size="3.2" fill="var(--mut)">Tổng chi</text>
        <text x="21" y="25" text-anchor="middle" font-size="4" font-weight="800" fill="var(--ink)">${formatMoney(total)}</text>
      </svg>
      <div class="leg">
        ${rows.map(([category, amount]) => `
          <div><i style="background:${CATEGORY_COLORS[category] || CATEGORY_COLORS['Khác']}"></i>
            ${escapeHTML(category)}<span>${Math.round(amount / total * 100)}%</span>
          </div>`).join('')}
        <div class="lbl" style="padding-top:6px">Nhiều nhất: ${escapeHTML(rows[0][0])} (${formatMoney(rows[0][1])})</div>
      </div>
    </div>`;
}

export function renderDashboard(transactions, range) {
  renderTotals(transactions);
  renderList(transactions);
  renderStats(transactions, range);
}
