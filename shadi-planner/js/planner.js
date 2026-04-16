function getSelectedPlanInput() {
  const budget = parseInt(budgetInput?.value) || parseInt(slider?.value) || currentBudget;
  const city = document.getElementById('cityInput')?.value.trim() || '';
  const guests = parseInt(document.getElementById('guestInput')?.value) || 200;
  const weddingType = document.getElementById('weddingType')?.value || 'traditional';
  const functions = parseInt(document.getElementById('functionCount')?.value) || 2;
  return { budget, city, guests, weddingType, functions };
}

function hydratePlannerForm() {
  const plan = getPlanData();
  if (!plan) return;

  const cityInput = document.getElementById('cityInput');
  const guestInput = document.getElementById('guestInput');
  const weddingType = document.getElementById('weddingType');
  const functionCount = document.getElementById('functionCount');

  if (cityInput) cityInput.value = plan.city;
  if (guestInput) guestInput.value = String(plan.guests);
  if (weddingType) weddingType.value = plan.weddingType;
  if (functionCount) functionCount.value = String(plan.functions);
}

function getCategoryVisual(cat) {
  const visuals = {
    venue: 'Venue',
    catering: 'Catering',
    clothing: 'Outfits',
    decor: 'Decor',
    photo: 'Photos',
    music: 'Music',
    beauty: 'Beauty',
    invite: 'Invites',
  };
  return visuals[cat.id] || 'Wedding';
}


function renderVendorMedia(cat, imageUrl, title) {
  if (imageUrl) {
    return `<div class="vendor-media"><img src="${imageUrl}" alt="${escapeHtml(title)}" onerror="this.style.display='none';this.parentElement.classList.add('vendor-media--broken')"></div>`;
  }
  return `
    <div class="vendor-media">
      <div class="vendor-media__fallback">
        <span class="vendor-media__emoji">${cat.emoji}</span>
        <span class="vendor-media__label">${getCategoryVisual(cat)}</span>
      </div>
    </div>
  `;
}

async function generatePlan() {
  const plan = getSelectedPlanInput();

  if (!plan.budget || plan.budget < 50000) {
    alert('Please enter at least a Rs 50,000 budget.');
    return;
  }
  if (!plan.city) {
    alert('Please enter your city.');
    return;
  }

  currentBudget = plan.budget;
  savePlanData(plan);

  const btn = document.getElementById('planBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Preparing your plan...';
  }

  await sleep(350);
  window.location.href = './vendors.html';
}

function renderBudgetBreakdown() {
  const grid = document.getElementById('breakdownGrid');
  const plan = getPlanData();
  if (!grid || !plan) return;

  currentBudget = plan.budget;

  const items = [
    { label: 'Total Budget', value: formatINR(plan.budget), pct: '' },
    { label: 'Per Guest', value: formatINR(plan.budget / plan.guests), pct: `${plan.guests} guests` },
    { label: 'Per Function', value: formatINR(plan.budget / plan.functions), pct: `${plan.functions} events` },
  ];
  CATEGORIES.forEach((c) => items.push({
    label: `${c.emoji} ${c.name.split('/')[0].trim()}`,
    value: formatINR(plan.budget * c.percent / 100),
    pct: `${c.percent}%`,
  }));

  grid.innerHTML = items.map((i) => `
    <div class="breakdown-item">
      <div class="label">${i.label}</div>
      <div class="value">${i.value}</div>
      <div class="pct">${i.pct}</div>
    </div>
  `).join('');
}

function renderTips(budget, type) {
  const tips = document.getElementById('tipsSection');
  if (!tips) return;

  let list = [];
  if (budget < 300000) {
    list = [
      'Off-season venues can be 30-40% cheaper.',
      'Weekday weddings often get hall discounts.',
      'Use e-invites to save on printed cards.',
      'Check wholesale bridal markets for better pricing.',
      'Compare local photographers from Instagram and referrals.',
      'Hosting smaller functions at home cuts venue costs.',
      'Renting the groom outfit can save a lot.',
      'Use selective DIY decor for meaningful savings.',
    ];
  } else if (budget < 1000000) {
    list = [
      'Bundle venue and catering for better rates.',
      'Weekday pre-wedding shoots are usually cheaper.',
      'Early booking reduces costs across categories.',
      'Compare bundled entertainment packages.',
      'Ask for family discounts on bulk outfit orders.',
      'Watch for bridal exhibition sales.',
      'Mix digital invites with limited premium prints.',
    ];
  } else {
    list = [
      'Consider a planner or day-of coordinator.',
      'Premium vendors also discount early bookings.',
      'Keep destination guest counts tight.',
      'Evaluate wedding insurance for larger events.',
      'Take at least 3 vendor quotes.',
      'Check off-season destination dates for savings.',
    ];
  }

  if (type === 'destination') {
    list.push('Keep transport and stay in a separate budget line.');
  }
  if (type === 'intimate') {
    list.push('Invest more in the per-guest experience.');
  }

  tips.innerHTML = `<h3>Money-Saving Tips</h3><ul>${list.map((t) => `<li>${t}</li>`).join('')}</ul>`;
}

async function renderVendorPage() {
  const container = document.getElementById('categoriesContainer');
  const summary = document.getElementById('planSummary');
  const plan = getPlanData();
  if (!container) return;

  if (!plan) {
    container.innerHTML = '<div class="no-results">No plan found. Go back to the home page and generate a plan first.</div>';
    return;
  }

  currentBudget = plan.budget;
  if (summary) {
    summary.textContent = `${plan.city} · ${plan.guests} guests · ${plan.functions} events · ${formatINR(plan.budget)}`;
  }

  container.innerHTML = '';

  for (const cat of CATEGORIES) {
    const catBudget = plan.budget * (cat.percent / 100);
    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `
      <div class="category-head" onclick="this.nextElementSibling.classList.toggle('collapsed')">
        <h3><span class="cat-emoji">${cat.emoji}</span> ${cat.name}</h3>
        <span class="cat-budget">${formatINR(catBudget)}</span>
      </div>
      <div class="category-body">
        <div class="cat-loading" id="loading-${cat.id}"><span class="spinner"></span> Finding matches...</div>
        <div id="vendors-${cat.id}">${renderSkeletonCards(2)}</div>
      </div>
    `;
    container.appendChild(section);
  }

  for (const cat of CATEGORIES) {
    const vendorDiv = document.getElementById(`vendors-${cat.id}`);
    const loadingDiv = document.getElementById(`loading-${cat.id}`);
    if (!vendorDiv || !loadingDiv) continue;

    let apiResults = [];
    if (placesService && cat.searchQueries) {
      try {
        const searches = cat.searchQueries.slice(0, 2).map((q) => searchPlaces(q, plan.city));
        const results = await Promise.all(searches);
        const seen = new Set();
        for (const arr of results) {
          for (const r of arr) {
            if (!seen.has(r.placeId)) {
              seen.add(r.placeId);
              apiResults.push(r);
            }
          }
        }
        apiResults.sort((a, b) => (b.rating * Math.log10(b.totalRatings + 1)) - (a.rating * Math.log10(a.totalRatings + 1)));
        apiResults = apiResults.slice(0, 5);
      } catch {
        apiResults = [];
      }
    }

    const curated = cat.getCurated(plan.budget, plan.guests);
    loadingDiv.style.display = 'none';

    let html = '';

    if (apiResults.length > 0) {
      html += `<div class="section-label"><span style="color:var(--purple);">📍 Real Google Places results — ${plan.city}</span></div>`;
      for (const r of apiResults) {
        const stars = r.rating > 0 ? '⭐'.repeat(Math.round(r.rating)) : '';
        const openTag = r.isOpen === true
          ? '<span class="tag tag-open">Open Now</span>'
          : r.isOpen === false
            ? '<span class="tag tag-closed">Closed</span>'
            : '';
        html += `
          <div class="vendor-card">
            ${renderVendorMedia(cat, r.photo, r.name)}
            <div class="vendor-card__body">
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
                <a class="vendor-link" href="https://www.google.com/search?q=${encodeURIComponent(r.name + ' ' + plan.city + ' contact number')}" target="_blank" rel="noopener">Find Contact</a>
              </div>
            </div>
          </div>
        `;
      }
      html += '<div class="section-label">Curated Options</div>';
    }

    for (const v of curated) {
      const tags = (v.tags || []).map((t) => `<span class="tag tag-${t}">${t === 'best' ? 'Best Value' : t === 'premium' ? 'Premium' : 'Budget Friendly'}</span>`).join(' ');
      const price = v.isPerPlate ? `${formatINR(v.perPlate)}/plate` : formatINR(v.price);
      html += `
        <div class="vendor-card">
          ${renderVendorMedia(cat, '', v.name)}
          <div class="vendor-card__body">
            <div class="vendor-top">
              <div>
                <div class="vendor-name">${tags} ${v.name}</div>
                <div class="vendor-desc">${v.desc}</div>
              </div>
              <div class="vendor-price">${price}</div>
            </div>
            ${v.tip ? `<div style="font-size:0.78rem;color:var(--gold);margin-top:0.4rem;">Tip: ${v.tip}</div>` : ''}
            <div class="vendor-actions" style="margin-top:0.8rem;">
              <button class="btn btn-outline" onclick="openBooking('${escapeHtml(v.name)}', '${escapeHtml(price)}', '${escapeHtml(cat.name)}')">Book / Request Quote</button>
            </div>
          </div>
        </div>
      `;
    }

    vendorDiv.innerHTML = html;
  }
}

function renderBudgetPage() {
  const plan = getPlanData();
  const summary = document.getElementById('budgetSummary');
  if (!plan) {
    const grid = document.getElementById('breakdownGrid');
    if (grid) {
      grid.innerHTML = '<div class="no-results">No plan found. Generate a wedding plan first.</div>';
    }
    return;
  }

  currentBudget = plan.budget;
  if (summary) {
    summary.textContent = `${plan.city} · ${plan.guests} guests · ${plan.functions} events`;
  }
  renderBudgetBreakdown();
  renderTips(plan.budget, plan.weddingType);
}

async function bootVendorsPage() {
  const loading = document.getElementById('vendorsLoading');
  const content = document.getElementById('vendorsContent');
  if (loading) loading.style.display = 'grid';
  if (content) content.style.display = 'none';
  await sleep(2000);
  await renderVendorPage();
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

async function bootBudgetPage() {
  const loading = document.getElementById('budgetLoading');
  const content = document.getElementById('budgetContent');
  if (loading) loading.style.display = 'grid';
  if (content) content.style.display = 'none';
  await sleep(2000);
  renderBudgetPage();
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}
