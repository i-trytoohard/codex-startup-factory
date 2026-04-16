async function generatePlan() {
  const budget = parseInt(budgetInput.value) || parseInt(slider.value);
  const city = document.getElementById('cityInput').value.trim();
  const guests = parseInt(document.getElementById('guestInput').value) || 200;
  const weddingType = document.getElementById('weddingType').value;
  const functions = parseInt(document.getElementById('functionCount').value);

  if (!budget || budget < 50000) { alert('Kam se kam \u20B950,000 ka budget daalein!'); return; }
  if (!city) { alert('Apna sheher / city daalein!'); return; }

  currentBudget = budget;
  const btn = document.getElementById('planBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Plan bana rahe hain...';

  document.getElementById('results').classList.add('visible');

  // Budget breakdown
  renderBreakdown(budget, guests, functions);

  // Render categories
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  for (const cat of CATEGORIES) {
    const catBudget = budget * (cat.percent / 100);
    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `
      <div class="category-head" onclick="this.nextElementSibling.classList.toggle('collapsed')">
        <h3><span class="cat-emoji">${cat.emoji}</span> ${cat.name}</h3>
        <span class="cat-budget">${formatINR(catBudget)}</span>
      </div>
      <div class="category-body">
        <div class="cat-loading" id="loading-${cat.id}"><span class="spinner"></span> Dhundh rahe hain...</div>
        <div id="vendors-${cat.id}"></div>
      </div>
    `;
    container.appendChild(section);
  }

  // Load data for each category
  for (const cat of CATEGORIES) {
    const vendorDiv = document.getElementById(`vendors-${cat.id}`);
    const loadingDiv = document.getElementById(`loading-${cat.id}`);

    let apiResults = [];
    if (placesService && cat.searchQueries) {
      try {
        const searches = cat.searchQueries.slice(0, 2).map(q => searchPlaces(q, city));
        const results = await Promise.all(searches);
        const seen = new Set();
        for (const arr of results) {
          for (const r of arr) {
            if (!seen.has(r.placeId)) { seen.add(r.placeId); apiResults.push(r); }
          }
        }
        apiResults.sort((a, b) => (b.rating * Math.log10(b.totalRatings + 1)) - (a.rating * Math.log10(a.totalRatings + 1)));
        apiResults = apiResults.slice(0, 5);
      } catch (e) { /* silently fall back to curated */ }
    }

    const curated = cat.getCurated(budget, guests);
    loadingDiv.style.display = 'none';

    let html = '';

    if (apiResults.length > 0) {
      html += '<div style="font-size:0.8rem;color:var(--purple);margin-bottom:0.6rem;font-weight:500;">Google Places se real results (' + city + ')</div>';
      for (const r of apiResults) {
        const stars = r.rating > 0 ? '\u2B50'.repeat(Math.round(r.rating)) : '';
        const openTag = r.isOpen === true ? '<span class="tag tag-open">Open Now</span>' :
                        r.isOpen === false ? '<span class="tag tag-closed">Closed</span>' : '';
        html += `
          <div class="vendor-card">
            <div class="vendor-top">
              <div>
                <div class="vendor-name">${escapeHtml(r.name)} <span class="tag tag-api">Google</span> ${openTag}</div>
                <div class="vendor-address">${escapeHtml(r.address)}</div>
              </div>
            </div>
            <div class="vendor-meta">
              ${r.rating > 0 ? `<span class="vendor-rating"><span class="stars">${stars}</span> ${r.rating}/5 (${r.totalRatings} reviews)</span>` : ''}
            </div>
            <div class="vendor-actions">
              <a class="vendor-link" href="https://www.google.com/maps/place/?q=place_id:${r.placeId}" target="_blank" rel="noopener">Google Maps</a>
              <a class="vendor-link" href="https://www.google.com/search?q=${encodeURIComponent(r.name + ' ' + city + ' contact number')}" target="_blank" rel="noopener">Contact Dhundho</a>
            </div>
          </div>
        `;
      }
      html += '<div style="font-size:0.8rem;color:var(--text-muted);margin:0.8rem 0 0.4rem;">Budget Options:</div>';
    }

    for (const v of curated) {
      const tags = (v.tags || []).map(t =>
        `<span class="tag tag-${t}">${t === 'best' ? 'Best Value' : t === 'premium' ? 'Premium' : 'Budget Friendly'}</span>`
      ).join(' ');
      const price = v.isPerPlate ? `${formatINR(v.perPlate)}/plate` : formatINR(v.price);
      html += `
        <div class="vendor-card">
          <div class="vendor-top">
            <div>
              <div class="vendor-name">${tags} ${v.name}</div>
              <div class="vendor-desc">${v.desc}</div>
            </div>
            <div class="vendor-price">${price}</div>
          </div>
          ${v.tip ? `<div style="font-size:0.78rem;color:var(--gold);margin-top:0.4rem;">Tip: ${v.tip}</div>` : ''}
        </div>
      `;
    }

    vendorDiv.innerHTML = html;
  }

  // Tips
  renderTips(budget, weddingType);

  // Checklist
  renderChecklist(functions);

  // Expenses
  renderExpenses();

  btn.disabled = false;
  btn.innerHTML = 'Shadi Plan Banao!';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function renderBreakdown(budget, guests, functions) {
  const grid = document.getElementById('breakdownGrid');
  const items = [
    { label: 'Total Budget', value: formatINR(budget), pct: '' },
    { label: 'Per Guest', value: formatINR(budget / guests), pct: `${guests} guests` },
    { label: 'Per Function', value: formatINR(budget / functions), pct: `${functions} events` },
  ];
  CATEGORIES.forEach(c => items.push({ label: c.emoji + ' ' + c.name.split('/')[0].trim(), value: formatINR(budget * c.percent / 100), pct: c.percent + '%' }));
  grid.innerHTML = items.map(i => `
    <div class="breakdown-item">
      <div class="label">${i.label}</div>
      <div class="value">${i.value}</div>
      <div class="pct">${i.pct}</div>
    </div>
  `).join('');
}

function renderTips(budget, type) {
  const tips = document.getElementById('tipsSection');
  let list = [];
  if (budget < 300000) {
    list = [
      'Off-season (July-Sept) mein venue 30-40% sasta milta hai',
      'Weekday shadi pe hall 20-30% discount deta hai',
      'E-invites bhejo - \u20B920-30K bacha sakte ho cards pe',
      'Dulhan lehenga wholesale market (Chandni Chowk, Chickpet) se lo',
      'Photographer Instagram pe dhundho - local talent achha hota hai',
      'Mehndi + Haldi function ghar pe karo - venue cost zero',
      'Rental sherwani smart option hai - \u20B93-5K mein premium milta hai',
      'Family ko decoration mein involve karo - bonding bhi hoga, saving bhi',
    ];
  } else if (budget < 1000000) {
    list = [
      'Venue + catering combo deal lo - 10-15% discount milega',
      'Pre-wedding shoot weekday pe karo - photographer cheaper milega',
      'Early booking (3-4 months pehle) pe sab kuch sasta milta hai',
      'DJ + Dhol combo book karo for baraat - package mein sasta hota hai',
      'Bulk outfit order pe family discount milta hai',
      'Exhibition sales mein designer lehenga 30-40% off milta hai',
      'E-invite + limited printed cards = smart saving',
    ];
  } else {
    list = [
      'Wedding planner hire karo - time, stress, aur ultimately paisa bachega',
      'Early booking pe 10-15% discount milta hai har category mein',
      'Destination wedding mein guest count kam rakho - quality badhao',
      'Wedding insurance le lo - bade events ke liye zaroori hai',
      'Vendor comparison spreadsheet banao - kam se kam 3 quotes lo',
      'Off-season destination (June-Aug for Rajasthan) mein 25-30% off',
    ];
  }
  if (type === 'destination') list.push('Destination mein transport + stay ka budget alag rakho');
  if (type === 'intimate') list.push('Intimate wedding mein per-guest experience pe zyada kharch karo');

  tips.innerHTML = `<h3>Money-Saving Tips</h3><ul>${list.map(t => `<li>${t}</li>`).join('')}</ul>`;
}
