let currentBudget = 500000;
let expenses = JSON.parse(localStorage.getItem('sp_expenses') || '[]');
let apiKey =
  (typeof window !== 'undefined' && window.SHADI_PLANNER_GOOGLE_API_KEY) ||
  localStorage.getItem('sp_google_api_key') || '';
let placesService = null;
