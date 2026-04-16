let currentBudget = 500000;
let expenses = JSON.parse(localStorage.getItem('sp_expenses') || '[]');
let apiKey =
  (typeof window !== 'undefined' && window.SHADI_PLANNER_GOOGLE_API_KEY) ||
  localStorage.getItem('sp_google_api_key') || '';
let placesService = null;

function getPlanData() {
  try {
    return JSON.parse(localStorage.getItem('sp_plan_data') || 'null');
  } catch {
    return null;
  }
}

function savePlanData(plan) {
  localStorage.setItem('sp_plan_data', JSON.stringify(plan));
}

function hasPlanData() {
  return Boolean(getPlanData());
}
