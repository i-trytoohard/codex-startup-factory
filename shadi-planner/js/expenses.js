function addExpense() {
  const name = document.getElementById('expName').value.trim();
  const amount = parseInt(document.getElementById('expAmount').value);
  if (!name || !amount || amount <= 0) return;
  expenses.push({ name, amount, id: Date.now() });
  localStorage.setItem('sp_expenses', JSON.stringify(expenses));
  document.getElementById('expName').value = '';
  document.getElementById('expAmount').value = '';
  renderExpenses();
}

function removeExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  localStorage.setItem('sp_expenses', JSON.stringify(expenses));
  renderExpenses();
}

function renderExpenses() {
  const list = document.getElementById('expenseList');
  const bar = document.getElementById('expenseBar');
  const spentEl = document.getElementById('totalSpent');
  const remEl = document.getElementById('totalRemaining');
  if (!list) return;

  const plan = getPlanData();
  if (plan?.budget) currentBudget = plan.budget;

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pct = currentBudget > 0 ? Math.min((total / currentBudget) * 100, 100) : 0;

  bar.style.width = pct + '%';
  bar.textContent = Math.round(pct) + '%';
  bar.style.background = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--gold)' : 'var(--green)';
  spentEl.textContent = formatINR(total);
  remEl.textContent = formatINR(Math.max(currentBudget - total, 0));

  list.innerHTML = expenses.length === 0 ? '<div class="no-results">No expenses added yet</div>' :
    expenses.map(e => `
      <div class="expense-item">
        <span class="exp-name">${escapeHtml(e.name)}</span>
        <span><span class="exp-amount">${formatINR(e.amount)}</span><span class="exp-del" onclick="removeExpense(${e.id})">✕</span></span>
      </div>
    `).join('');
}
