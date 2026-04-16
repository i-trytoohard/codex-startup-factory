const slider = document.getElementById('budgetSlider');
const display = document.getElementById('budgetDisplay');
const budgetInput = document.getElementById('budgetInput');

if (slider && display && budgetInput) {
  const savedPlan = getPlanData();
  if (savedPlan?.budget) {
    currentBudget = savedPlan.budget;
    slider.value = Math.min(savedPlan.budget, 5000000);
    display.textContent = formatINR(savedPlan.budget);
    budgetInput.value = String(savedPlan.budget);
  }

  slider.addEventListener('input', () => {
    currentBudget = parseInt(slider.value);
    display.textContent = formatINR(currentBudget);
    budgetInput.value = '';
  });

  budgetInput.addEventListener('input', () => {
    const v = parseInt(budgetInput.value);
    if (v && v >= 50000) {
      currentBudget = v;
      slider.value = Math.min(v, 5000000);
      display.textContent = formatINR(v);
    }
  });
}
