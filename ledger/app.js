const STORAGE_KEY = "qing-ledger-records";

const categories = {
  expense: ["餐饮", "交通", "住房", "购物", "娱乐", "医疗", "学习", "其他"],
  income: ["工资", "奖金", "副业", "理财", "礼金", "其他"],
};

const seedRecords = [
  {
    id: crypto.randomUUID(),
    type: "expense",
    amount: 36,
    category: "餐饮",
    date: new Date().toISOString().slice(0, 10),
    note: "午餐",
  },
  {
    id: crypto.randomUUID(),
    type: "income",
    amount: 6800,
    category: "工资",
    date: new Date().toISOString().slice(0, 10),
    note: "本月工资",
  },
];

const entryForm = document.querySelector("#entryForm");
const amountInput = document.querySelector("#amountInput");
const categoryInput = document.querySelector("#categoryInput");
const dateInput = document.querySelector("#dateInput");
const noteInput = document.querySelector("#noteInput");
const monthFilter = document.querySelector("#monthFilter");
const typeFilter = document.querySelector("#typeFilter");
const recordList = document.querySelector("#recordList");
const recordTemplate = document.querySelector("#recordTemplate");
const emptyState = document.querySelector("#emptyState");
const categoryBars = document.querySelector("#categoryBars");
const topCategory = document.querySelector("#topCategory");

const balanceValue = document.querySelector("#balanceValue");
const incomeValue = document.querySelector("#incomeValue");
const expenseValue = document.querySelector("#expenseValue");
const countValue = document.querySelector("#countValue");

let records = loadRecords();

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRecords));
    return seedRecords;
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(value);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function updateCategories() {
  const type = new FormData(entryForm).get("type");
  categoryInput.innerHTML = categories[type]
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function filteredRecords() {
  const month = monthFilter.value;
  const type = typeFilter.value;

  return records
    .filter((record) => record.date.startsWith(month))
    .filter((record) => type === "all" || record.type === type)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderSummary(monthRecords) {
  const income = monthRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + record.amount, 0);
  const expense = monthRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + record.amount, 0);

  balanceValue.textContent = formatMoney(income - expense);
  incomeValue.textContent = formatMoney(income);
  expenseValue.textContent = formatMoney(expense);
  countValue.textContent = String(monthRecords.length);
}

function renderCategoryBars(monthRecords) {
  const expenseRecords = monthRecords.filter((record) => record.type === "expense");
  const totals = expenseRecords.reduce((map, record) => {
    map.set(record.category, (map.get(record.category) || 0) + record.amount);
    return map;
  }, new Map());

  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 0;
  topCategory.textContent = rows[0] ? `${rows[0][0]}最多` : "暂无";

  categoryBars.innerHTML = rows.length
    ? rows
        .map(([category, total]) => {
          const width = max ? Math.max((total / max) * 100, 8) : 0;
          return `
            <div class="bar-row">
              <span>${category}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
              <strong>${formatMoney(total)}</strong>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state visible"><span>本月还没有支出分类。</span></div>`;
}

function renderRecords(list) {
  recordList.innerHTML = "";
  emptyState.classList.toggle("visible", list.length === 0);

  for (const record of list) {
    const node = recordTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".record-category").textContent = record.category;
    node.querySelector(".record-note").textContent = record.note || (record.type === "income" ? "收入" : "支出");
    node.querySelector(".record-date").textContent = record.date;

    const amount = node.querySelector(".record-amount");
    amount.classList.add(record.type);
    amount.textContent = `${record.type === "income" ? "+" : "-"}${formatMoney(record.amount)}`;

    node.querySelector(".delete-button").addEventListener("click", () => {
      records = records.filter((item) => item.id !== record.id);
      saveRecords();
      render();
    });

    recordList.append(node);
  }
}

function render() {
  const monthRecords = records.filter((record) => record.date.startsWith(monthFilter.value));
  renderSummary(monthRecords);
  renderCategoryBars(monthRecords);
  renderRecords(filteredRecords());
}

function changeMonth(offset) {
  const [year, month] = monthFilter.value.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  monthFilter.value = date.toISOString().slice(0, 7);
  render();
}

entryForm.addEventListener("change", (event) => {
  if (event.target.name === "type") {
    updateCategories();
  }
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(entryForm);
  const amount = Number(amountInput.value);

  records = [
    {
      id: crypto.randomUUID(),
      type: data.get("type"),
      amount,
      category: categoryInput.value,
      date: dateInput.value,
      note: noteInput.value.trim(),
    },
    ...records,
  ];

  saveRecords();
  entryForm.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
  updateCategories();
  render();
});

document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
document.querySelector("#clearButton").addEventListener("click", () => {
  const visible = filteredRecords();
  if (!visible.length || !confirm("确认清空当前筛选下的账目？")) return;
  const visibleIds = new Set(visible.map((record) => record.id));
  records = records.filter((record) => !visibleIds.has(record.id));
  saveRecords();
  render();
});

document.querySelector("#exportButton").addEventListener("click", () => {
  const rows = [["日期", "类型", "分类", "金额", "备注"], ...filteredRecords().map((record) => [
    record.date,
    record.type === "income" ? "收入" : "支出",
    record.category,
    record.amount,
    record.note,
  ])];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `qing-ledger-${monthFilter.value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

monthFilter.addEventListener("change", render);
typeFilter.addEventListener("change", render);

monthFilter.value = currentMonth();
dateInput.value = new Date().toISOString().slice(0, 10);
updateCategories();
render();
