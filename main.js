import { ITEMS } from "./data.js";

const slotsState = {
  you: Array(9).fill(null),
  them: Array(9).fill(null)
};

let currentSelection = null; // { side: "you"|"them", index: number }

const popupBackdrop = document.getElementById("popupBackdrop");
const popupTitle = document.getElementById("popupTitle");
const popupCloseBtn = document.getElementById("popupCloseBtn");
const itemListEl = document.getElementById("itemList");
const itemSearchInput = document.getElementById("itemSearch");
const ratioPercentEl = document.getElementById("ratioPercent");
const ratioBarFillEl = document.getElementById("ratioBarFill");
const ratioLabelEl = document.getElementById("ratioLabel");
const youTotalEl = document.getElementById("youTotal");
const themTotalEl = document.getElementById("themTotal");

 // Init
attachSlotHandlers();
renderItemsList();
setupSearch();
updateTotalsAndRatio();

// Slots

function attachSlotHandlers() {
  const slots = document.querySelectorAll(".slot");
  slots.forEach((slot) => {
    slot.addEventListener("click", () => {
      const side = slot.dataset.side;
      const index = Number(slot.dataset.index);
      const isEmpty = slot.classList.contains("empty");

      if (!isEmpty) {
        // Clear slot if already filled
        slotsState[side][index] = null;
        renderSlot(side, index);
        updateTotalsAndRatio();
        return;
      }

      openPopup(side, index);
    });
  });
}

function renderSlot(side, index) {
  const selector = `.slot[data-side="${side}"][data-index="${index}"]`;
  const slotEl = document.querySelector(selector);
  const item = slotsState[side][index];

  slotEl.innerHTML = "";
  slotEl.classList.remove("empty");

  if (!item) {
    slotEl.classList.add("empty");
    slotEl.innerHTML = `
      <span class="slot-label">Empty</span>
      <span class="slot-icon">+</span>
    `;
    return;
  }

  const label = document.createElement("span");
  label.className = "slot-label";
  label.textContent = item.name;

  const value = document.createElement("span");
  value.className = "slot-value";
  value.textContent = `Value: ${item.value}`;

  slotEl.appendChild(label);
  slotEl.appendChild(value);
}

// Popup

function openPopup(side, index) {
  currentSelection = { side, index };
  popupTitle.textContent =
    side === "you" ? "Select item for You" : "Select item for Them";
  if (itemSearchInput) {
    itemSearchInput.value = "";
  }
  renderItemsList();
  popupBackdrop.classList.add("open");
}

function closePopup() {
  popupBackdrop.classList.remove("open");
  currentSelection = null;
}

popupBackdrop.addEventListener("click", (e) => {
  if (e.target === popupBackdrop) {
    closePopup();
  }
});

popupCloseBtn.addEventListener("click", () => {
  closePopup();
});

// Items list

function renderItemsList(filterText = "") {
  const term = filterText.trim().toLowerCase();
  itemListEl.innerHTML = "";
  ITEMS.filter((item) =>
    !term || item.name.toLowerCase().includes(term)
  ).forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.dataset.index = idx;

    const nameSpan = document.createElement("span");
    nameSpan.className = "item-row-name";
    nameSpan.textContent = item.name;

    const valueSpan = document.createElement("span");
    valueSpan.className = "item-row-value";
    valueSpan.textContent = item.value;

    row.appendChild(nameSpan);
    row.appendChild(valueSpan);

    row.addEventListener("click", () => {
      if (!currentSelection) return;
      const { side, index } = currentSelection;
      slotsState[side][index] = { ...item };
      renderSlot(side, index);
      updateTotalsAndRatio();
      closePopup();
    });

    itemListEl.appendChild(row);
  });
}

function setupSearch() {
  if (!itemSearchInput) return;
  itemSearchInput.addEventListener("input", (e) => {
    renderItemsList(e.target.value);
  });
}

// Totals & ratio

function updateTotalsAndRatio() {
  const yourTotal = sumSide("you");
  const theirTotal = sumSide("them");

  youTotalEl.textContent = `Total: ${yourTotal}`;
  themTotalEl.textContent = `Total: ${theirTotal}`;

  const { percent, color } = computeFairnessPercentAndColor(yourTotal, theirTotal);

  ratioPercentEl.textContent = `${Math.round(percent)}%`;
  ratioBarFillEl.style.transform = `scaleX(${percent / 100})`;
  ratioBarFillEl.style.background = color;
  ratioLabelEl.textContent = describeTrade(percent);
}

function sumSide(side) {
  return slotsState[side].reduce((acc, item) => acc + (item ? item.value : 0), 0);
}

/**
 * Computes:
 * - percent: 0–100, where 50 = equal trade, >50 better for you, <50 worse for you
 * - color: gradient leaning red (<50) or green (>50)
 */
function computeFairnessPercentAndColor(yourTotal, theirTotal) {
  if (yourTotal === 0 && theirTotal === 0) {
    return {
      percent: 50,
      color: "linear-gradient(90deg,#ff4b4b,#f5c249,#50d890)"
    };
  }

  const total = yourTotal + theirTotal;
  // base fairness is from -1 to 1
  const diff = theirTotal - yourTotal; // positive if good for you
  let fairness = diff / Math.max(total, 1); // -1 to 1
  fairness = Math.max(-1, Math.min(1, fairness));

  // map fairness to 0–100
  const percent = 50 + fairness * 50;

  // Lerp hue from red (0) through yellow (60) to green (120)
  const hue = 60 + fairness * 60; // 0..120
  const color = `linear-gradient(90deg,
    hsl(${hue - 10}, 80%, 55%),
    hsl(${hue}, 80%, 55%),
    hsl(${hue + 10}, 75%, 55%)
  )`;

  return { percent, color };
}

/**
 * Maps the fairness percent into a human-readable label.
 * 50% = Fair Trade, higher is better for you, lower is worse.
 */
function describeTrade(percent) {
  if (percent >= 85) return "Godly Trade";
  if (percent >= 70) return "Very Good Trade";
  if (percent >= 55) return "Good Trade";
  if (percent > 45) return "Fair Trade";
  if (percent > 30) return "Bad Trade";
  if (percent > 15) return "Very Bad Trade";
  return "Horrible Trade";
}

