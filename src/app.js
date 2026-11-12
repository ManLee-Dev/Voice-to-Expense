import { renderDashboard, renderList, renderStats } from './dashboard.js';
import { CATEGORIES, parseSpeech } from './parser.js';
import { dayOffset, formatMoney, loadTransactions, saveTransactions, toISODate, escapeHTML } from './storage.js';

const $ = selector => document.querySelector(selector);
const recognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const sampleSentences = [
  'Sáng nay ăn phở 45k với uống cà phê 30k',
  'Trưa ăn cơm 55 nghìn, đổ xăng 80k',
  'Hôm qua mua áo 1 triệu rưỡi và nhận lương 15 triệu',
  'Đóng tiền điện 450.000 với tiền wifi 220k'
];

let transactions = loadTransactions();
let range = 'week';
let pendingTransactions = [];
let recognition = null;
let transcript = '';
let toastTimer = null;
let confirmationTimer = null;
let listening = false;

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('s');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('s'), 2500);
}

function render() {
  renderDashboard(transactions, range);
}

function persist(nextTransactions) {
  if (saveTransactions(nextTransactions)) return true;
  toast('Không thể lưu dữ liệu. Hãy kiểm tra dung lượng hoặc quyền lưu trữ của trình duyệt.');
  return false;
}

function renderConfirmation(autoSave) {
  const expenseTotal = pendingTransactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  $('#confirm').innerHTML = `
    <h2>Xem lại ${pendingTransactions.length} khoản · chi ${formatMoney(expenseTotal)}</h2>
    ${pendingTransactions.map(item => `
      <div class="it">
        <b>${escapeHTML(item.label)}</b>
        <span class="amt">${item.type === 'income' ? '+' : ''}${formatMoney(item.amount)}</span>
        <select data-id="${item.id}" aria-label="Danh mục">
          ${[...CATEGORIES, 'Thu nhập'].map(category =>
            `<option ${category === item.cat ? 'selected' : ''}>${category}</option>`
          ).join('')}
        </select>
        <button class="x" type="button" data-id="${item.id}">Bỏ khoản này</button>
      </div>`).join('')}
    <div class="acts">
      <button class="btn ghost" type="button" id="cancelConfirmation">Hủy</button>
      <button class="btn" type="button" id="saveConfirmation">Lưu</button>
    </div>
    ${autoSave ? '<div class="bar run"></div>' : ''}`;
}

function showConfirmation(items, autoSave = true) {
  pendingTransactions = items;
  clearTimeout(confirmationTimer);

  if (!items.length) {
    $('#confirm').style.display = 'none';
    $('#live').className = '';
    $('#live').textContent = 'Chưa nhận ra khoản tiền nào. Hãy nói kèm số tiền, ví dụ “phở 45k”.';
    return;
  }

  $('#confirm').style.display = 'block';
  renderConfirmation(autoSave);
  if (autoSave) confirmationTimer = setTimeout(savePendingTransactions, 3000);
  $('#confirm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function savePendingTransactions() {
  clearTimeout(confirmationTimer);
  if (!pendingTransactions.length) return;

  const updatedTransactions = [...transactions, ...pendingTransactions];
  if (!persist(updatedTransactions)) return;

  transactions = updatedTransactions;
  toast(`Đã lưu ${pendingTransactions.length} khoản`);
  pendingTransactions = [];
  $('#confirm').style.display = 'none';
  $('#live').className = '';
  $('#live').textContent = 'Sẵn sàng cho câu tiếp theo.';
  $('#ti').value = '';
  render();
}

$('#confirm').addEventListener('click', event => {
  if (event.target.id === 'saveConfirmation') {
    savePendingTransactions();
    return;
  }
  if (event.target.id === 'cancelConfirmation') {
    clearTimeout(confirmationTimer);
    pendingTransactions = [];
    $('#confirm').style.display = 'none';
    toast('Đã hủy');
    return;
  }
  if (event.target.classList.contains('x')) {
    pendingTransactions = pendingTransactions.filter(item => item.id !== Number(event.target.dataset.id));
    clearTimeout(confirmationTimer);
    if (pendingTransactions.length) renderConfirmation(false);
    else $('#confirm').style.display = 'none';
  }
});

$('#confirm').addEventListener('change', event => {
  const item = pendingTransactions.find(transaction => transaction.id === Number(event.target.dataset.id));
  if (!item) return;
  item.cat = event.target.value;
  item.type = item.cat === 'Thu nhập' ? 'income' : 'expense';
  clearTimeout(confirmationTimer);
  renderConfirmation(false);
});

$('#list').addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const updatedTransactions = transactions.filter(item => item.id !== Number(button.dataset.id));
  if (!persist(updatedTransactions)) return;
  transactions = updatedTransactions;
  render();
});

$('#transactionSearch').addEventListener('input', () => renderList(transactions));
$('#transactionType').addEventListener('change', () => renderList(transactions));

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    link.classList.add('active');
  });
});

function setRecordingState(active) {
  listening = active;
  $('#mic').classList.toggle('on', active);
  $('#mic').setAttribute('aria-pressed', String(active));
  $('#mic').setAttribute('aria-label', active ? 'Dừng ghi âm' : 'Bắt đầu ghi âm');
  $('#hint').textContent = active ? 'Đang nghe… chạm lần nữa để dừng' : 'Chạm vào mic và nói';
}

function processSentence(sentence) {
  $('#live').className = 'has';
  $('#live').textContent = `“${sentence}”`;
  showConfirmation(parseSpeech(sentence));
}

function startRecording() {
  if (!recognitionAPI) {
    toast('Trình duyệt chưa hỗ trợ nhận giọng nói. Bạn vẫn có thể nhập câu ở bên dưới.');
    return;
  }

  showConfirmation([]);
  transcript = '';
  recognition = new recognitionAPI();
  recognition.lang = 'vi-VN';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => {
    transcript = Array.from(event.results, result => result[0].transcript).join(' ').trim();
    $('#live').className = 'has';
    $('#live').textContent = transcript;
  };
  recognition.onerror = event => {
    const messages = {
      'not-allowed': 'Micro đang bị chặn. Hãy cấp quyền micro hoặc nhập câu ở bên dưới.',
      'service-not-allowed': 'Micro đang bị chặn. Hãy cấp quyền micro hoặc nhập câu ở bên dưới.',
      'no-speech': 'Không nghe thấy gì, hãy thử lại nhé.',
      'network': 'Nhận giọng nói cần kết nối mạng.',
      'audio-capture': 'Không tìm thấy micro.'
    };
    const message = messages[event.error] || `Lỗi micro: ${event.error}`;
    toast(message);
    $('#live').className = '';
    $('#live').textContent = message;
  };
  recognition.onend = () => {
    setRecordingState(false);
    if (transcript) processSentence(transcript);
  };

  try {
    recognition.start();
    setRecordingState(true);
    $('#live').className = '';
    $('#live').textContent = 'Mời bạn nói…';
  } catch (error) {
    setRecordingState(false);
    toast(`Không bật được micro: ${error.message}`);
  }
}

$('#mic').addEventListener('click', () => {
  if (!listening) {
    startRecording();
    return;
  }

  try {
    recognition.stop();
  } catch (error) {
    toast(`Không thể dừng ghi âm: ${error.message}`);
  }
});

$('#tf').addEventListener('submit', event => {
  event.preventDefault();
  const sentence = $('#ti').value.trim();
  if (sentence) processSentence(sentence);
});

$('#chips').innerHTML = sampleSentences
  .map(sentence => `<button class="chip" type="button">${escapeHTML(sentence)}</button>`)
  .join('');
$('#chips').addEventListener('click', event => {
  const button = event.target.closest('.chip');
  if (!button) return;
  $('#ti').value = button.textContent;
  processSentence(button.textContent);
});

$('#seg').addEventListener('click', event => {
  const selectedRange = event.target.dataset.r;
  if (!selectedRange) return;
  range = selectedRange;
  [...$('#seg').children].forEach(button => {
    const active = button.dataset.r === range;
    button.classList.toggle('a', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderStats(transactions, range);
});

function createSampleTransactions() {
  const sampleData = [
    [0, 'Phở', 45000, 'Ăn uống'], [0, 'Cà phê', 30000, 'Ăn uống'],
    [-1, 'Cơm trưa', 55000, 'Ăn uống'], [-1, 'Xăng', 80000, 'Di chuyển'],
    [-2, 'Grab', 62000, 'Di chuyển'], [-2, 'Trà sữa', 48000, 'Ăn uống'],
    [-3, 'Xem phim', 120000, 'Giải trí'], [-4, 'Tiền điện', 450000, 'Hóa đơn'],
    [-5, 'Áo thun', 350000, 'Mua sắm'], [-6, 'Bún bò', 50000, 'Ăn uống'],
    [-8, 'Thuốc cảm', 90000, 'Sức khỏe'], [-10, 'Sách', 160000, 'Học tập'],
    [-12, 'Lẩu', 320000, 'Ăn uống']
  ];
  const createdAt = Date.now();
  const samples = sampleData.map(([offset, label, amount, category], index) => ({
    id: createdAt + index,
    label,
    amount,
    cat: category,
    type: 'expense',
    date: dayOffset(offset)
  }));
  samples.push({
    id: createdAt + sampleData.length,
    label: 'Lương',
    amount: 15000000,
    cat: 'Thu nhập',
    type: 'income',
    date: dayOffset(-3)
  });
  return samples;
}

$('#seed').addEventListener('click', () => {
  if (transactions.length && !confirm('Nạp dữ liệu mẫu sẽ thay thế các giao dịch hiện tại. Bạn có muốn tiếp tục không?')) return;
  const samples = createSampleTransactions();
  if (!persist(samples)) return;
  transactions = samples;
  render();
  toast('Đã nạp dữ liệu mẫu');
});

$('#clear').addEventListener('click', () => {
  if (!transactions.length) {
    toast('Chưa có dữ liệu để xóa');
    return;
  }
  if (!confirm('Xóa toàn bộ giao dịch đã lưu trên thiết bị này? Thao tác này không thể hoàn tác.')) return;
  if (!persist([])) return;
  transactions = [];
  render();
  toast('Đã xóa dữ liệu');
});

function getCurrentTheme() {
  return document.documentElement.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function renderThemeButton() {
  const dark = getCurrentTheme() === 'dark';
  $('#themeToggle').setAttribute('aria-label', dark ? 'Bật giao diện sáng' : 'Bật giao diện tối');
  $('#themeToggle').innerHTML = dark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg>';
}

$('#themeToggle').addEventListener('click', () => {
  const theme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('nlg_theme', theme);
  } catch (error) {
    toast(`Không thể lưu tùy chọn giao diện: ${error.message}`);
  }
  renderThemeButton();
});

function csvCell(value) {
  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

$('#export').addEventListener('click', () => {
  if (!transactions.length) {
    toast('Chưa có giao dịch để xuất');
    return;
  }

  const header = ['Ngày', 'Mô tả', 'Danh mục', 'Loại', 'Số tiền'];
  const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const rows = sortedTransactions.map(item => [
    item.date,
    item.label,
    item.cat,
    item.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
    Math.round(item.amount)
  ]);
  const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `noi-la-ghi-giao-dich-${toISODate(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Đã xuất báo cáo CSV');
});

$('#today').textContent = new Date().toLocaleDateString('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'numeric'
});

try {
  const savedTheme = localStorage.getItem('nlg_theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    document.documentElement.dataset.theme = savedTheme;
  }
} catch (error) {
  toast(`Không thể đọc tùy chọn giao diện: ${error.message}`);
}
renderThemeButton();

let firstVisit = true;
try {
  firstVisit = !localStorage.getItem('nlg_seeded');
  if (firstVisit) localStorage.setItem('nlg_seeded', '1');
} catch (error) {
  console.error('Không thể đọc trạng thái khởi tạo.', error);
}

if (firstVisit && !transactions.length) {
  const samples = createSampleTransactions();
  if (persist(samples)) transactions = samples;
}
render();
