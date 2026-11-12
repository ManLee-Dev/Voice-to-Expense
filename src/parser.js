import { dayOffset } from './storage.js';

export const CATEGORIES = ['Ăn uống','Di chuyển','Mua sắm','Hóa đơn','Giải trí','Sức khỏe','Học tập','Khác'];
export const CATEGORY_COLORS = {
  'Ăn uống': '#F26B3A',
  'Di chuyển': '#1F8A70',
  'Mua sắm': '#3F6FD8',
  'Hóa đơn': '#E0A800',
  'Giải trí': '#8E5CC9',
  'Sức khỏe': '#D6457A',
  'Học tập': '#2AA4B8',
  'Khác': '#6B7A74'
};
export const CATEGORY_ICONS = {
  'Ăn uống': '🍜',
  'Di chuyển': '🚗',
  'Mua sắm': '🛍️',
  'Hóa đơn': '🏠',
  'Giải trí': '🎬',
  'Sức khỏe': '💊',
  'Học tập': '📚',
  'Khác': '🧾',
  'Thu nhập': '💰'
};

const CATEGORY_KEYWORDS = [
  ['Hóa đơn', ['điện','nước ',' wifi','internet','thuê nhà','tiền nhà','hóa đơn','điện thoại','gas']],
  ['Di chuyển', ['xăng','grab','taxi',' xe ','gửi xe','vé xe','buýt','gojek','vé tàu','vé máy bay']],
  ['Sức khỏe', ['thuốc','khám','bệnh','nha khoa','gym','y tế']],
  ['Học tập', ['sách','học phí','khóa học','khoá học','vở','bút']],
  ['Giải trí', ['phim','game','karaoke','du lịch','netflix','spotify','xem ','cinema']],
  ['Ăn uống', [' ăn ','uống','phở','cơm','bún','cà phê','cafe','trà','bánh','nhậu','bia','xôi','mì ','lẩu','sinh tố','nước ngọt','quán','ăn sáng','ăn trưa','ăn tối','bữa','súp','cháo','kem']],
  ['Mua sắm', ['mua','quần','áo','giày','dép','túi','mỹ phẩm','son','đồ ']]
];
const INCOME_KEYWORDS = ['lương','thưởng','được cho','nhận','thu nhập','tiền lãi','bán được','lì xì','tiền mừng'];
const STOP_WORDS = new Set(['với','và','rồi','xong','thì','tốn','hết','mất','là','giá','khoảng','hơn','tổng','cộng','cùng','thêm','nữa','tôi','mình','em','anh','sáng','trưa','chiều','tối','đêm','nay','qua','hôm','kia','vừa','nãy','lúc','sau','đó','cái','một','ly','chén']);
const VERBS = new Set(['ăn','uống','mua','đi','đổ','trả','đóng','chi','nhận','được','bị','đã','cho','gửi','thanh','toán']);
let nextId = Date.now();

function parseMoney(number, unit, half, extra) {
  let value = parseFloat(number.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(,\d+)$/.test(number)) value = parseFloat(number.replace(',', '.'));
  else if (/^\d{1,3}(\.\d{3})+$/.test(number)) value = parseFloat(number.replace(/\./g, ''));
  else value = parseFloat(number.replace(',', '.'));

  if (!unit || /^(đ|đồng)$/.test(unit)) return value >= 1000 ? value : 0;
  const multiplier = /^(triệu|tr|củ)$/.test(unit) ? 1e6 : 1000;
  if (half) value += 0.5;
  else if (extra) value += parseInt(extra, 10) / Math.pow(10, extra.length);
  return value * multiplier;
}

export function parseSpeech(raw) {
  const text = raw.normalize('NFC').toLowerCase();
  let date = dayOffset(0);
  if (/hôm kia/.test(text)) date = dayOffset(-2);
  else if (/(hôm qua|tối qua|chiều qua|sáng qua)/.test(text)) date = dayOffset(-1);

  const amountPattern = /(\d+(?:[.,]\d+)*)\s*(triệu|tr|củ|nghìn|ngàn|k|đồng|đ)?(?![\p{L}])(?:\s*(rưỡi|rưởi)|(\d{1,3})(?!\d))?/giu;
  const items = [];
  let lastIndex = 0;
  let match;

  while ((match = amountPattern.exec(text))) {
    const unit = match[2] && match[2].toLowerCase();
    const amount = parseMoney(match[1], unit, match[3], match[4]);
    if (!amount) continue;

    const segment = ` ${text.slice(lastIndex, match.index)} `;
    lastIndex = match.index + match[0].length;
    const type = INCOME_KEYWORDS.some(keyword => segment.includes(keyword)) ? 'income' : 'expense';
    let category = type === 'income' ? 'Thu nhập' : 'Khác';

    if (type === 'expense') {
      for (const [candidate, keywords] of CATEGORY_KEYWORDS) {
        if (keywords.some(keyword => (segment + ' ').includes(keyword))) {
          category = candidate;
          break;
        }
      }
    }

    const tokens = segment.split(/[\s,.;:+]+/).filter(word => word && !STOP_WORDS.has(word));
    while (tokens.length > 1 && VERBS.has(tokens[0])) tokens.shift();
    if (tokens.length === 1 && VERBS.has(tokens[0]) && tokens[0] !== 'mua') tokens.length = 0;

    let label = tokens.join(' ').trim();
    if (!label) label = type === 'income' ? 'Khoản thu' : (category !== 'Khác' ? category : 'Khoản chi');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    items.push({ id: ++nextId, label, amount, cat: category, type, date });
  }

  return items;
}
