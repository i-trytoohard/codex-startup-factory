function renderChecklist(functions) {
  const saved = JSON.parse(localStorage.getItem('sp_checklist') || '{}');
  const items = [
    { id: 'venue', text: 'Venue / Hall finalize karna', months: '3-4 months pehle' },
    { id: 'catering', text: 'Caterer finalize + menu tasting', months: '2-3 months pehle' },
    { id: 'photo', text: 'Photographer + Videographer book karna', months: '2-3 months pehle' },
    { id: 'lehenga', text: 'Dulhan ka lehenga / outfit select karna', months: '2-3 months pehle' },
    { id: 'sherwani', text: 'Dulha ka sherwani / suit select karna', months: '1-2 months pehle' },
    { id: 'decor', text: 'Decorator se milna + theme decide karna', months: '1-2 months pehle' },
    { id: 'invite', text: 'Cards / Invitations bhejne', months: '1-2 months pehle' },
    { id: 'dj', text: 'DJ / Band / Entertainment book karna', months: '1-2 months pehle' },
    { id: 'mehndi_artist', text: 'Mehndi artist book karna', months: '1 month pehle' },
    { id: 'makeup', text: 'Makeup artist + trial session', months: '1 month pehle' },
    { id: 'guest', text: 'Guest list finalize karna', months: '1 month pehle' },
    { id: 'pandit', text: 'Pandit ji / Maulvi sahab se baat karna', months: '2-3 weeks pehle' },
    { id: 'transport', text: 'Gaadi / Transport arrange karna (Baraat)', months: '2 weeks pehle' },
    { id: 'jewellery', text: 'Jewellery finalize karna', months: '1 month pehle' },
    { id: 'trousseau', text: 'Family ke kapde / trousseau ready karna', months: '2 weeks pehle' },
    { id: 'hotel', text: 'Bahar se aane wale guests ke liye hotel book karna', months: '1 month pehle' },
    { id: 'prewed', text: 'Pre-wedding shoot complete karna', months: '2-3 weeks pehle' },
  ];
  if (functions >= 3) items.push({ id: 'mehndi_fn', text: 'Mehndi function ka setup plan karna', months: '1 week pehle' });
  if (functions >= 5) {
    items.push({ id: 'sangeet', text: 'Sangeet choreography practice karna', months: '2-3 weeks pehle' });
    items.push({ id: 'haldi', text: 'Haldi ceremony ka samaan lena', months: '1 week pehle' });
  }
  items.push(
    { id: 'final_venue', text: 'Venue ka final walkthrough karna', months: '1 week pehle' },
    { id: 'emergency', text: 'Emergency kit ready karna (safety pins, first aid)', months: '2 days pehle' },
    { id: 'timeline', text: 'Day-of timeline bana ke sabko share karna', months: '3 days pehle' },
  );

  const grid = document.getElementById('checklistGrid');
  grid.innerHTML = items.map(i => `
    <label>
      <input type="checkbox" data-id="${i.id}" ${saved[i.id] ? 'checked' : ''} onchange="toggleCheck('${i.id}', this.checked)">
      <span>${i.text} <small style="color:var(--text-muted);">(${i.months})</small></span>
    </label>
  `).join('');
}

function toggleCheck(id, checked) {
  const saved = JSON.parse(localStorage.getItem('sp_checklist') || '{}');
  saved[id] = checked;
  localStorage.setItem('sp_checklist', JSON.stringify(saved));
}
