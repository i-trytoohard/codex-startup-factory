function renderChecklist(functions) {
  const saved = JSON.parse(localStorage.getItem('sp_checklist') || '{}');
  const plan = getPlanData();
  const functionCount = functions || plan?.functions || 2;
  const items = [
    { id: 'venue', text: 'Finalize venue or hall', months: '3-4 months before' },
    { id: 'catering', text: 'Finalize caterer and schedule menu tasting', months: '2-3 months before' },
    { id: 'photo', text: 'Book photographer and videographer', months: '2-3 months before' },
    { id: 'lehenga', text: 'Select bridal outfit', months: '2-3 months before' },
    { id: 'sherwani', text: 'Select groom outfit', months: '1-2 months before' },
    { id: 'decor', text: 'Meet decorator and decide theme', months: '1-2 months before' },
    { id: 'invite', text: 'Send invitations', months: '1-2 months before' },
    { id: 'dj', text: 'Book DJ / band / entertainment', months: '1-2 months before' },
    { id: 'mehndi_artist', text: 'Book mehndi artist', months: '1 month before' },
    { id: 'makeup', text: 'Book makeup artist and schedule trial', months: '1 month before' },
    { id: 'guest', text: 'Finalize guest list', months: '1 month before' },
    { id: 'pandit', text: 'Confirm ceremony officiant', months: '2-3 weeks before' },
    { id: 'transport', text: 'Arrange transport for baraat', months: '2 weeks before' },
    { id: 'jewellery', text: 'Finalize jewellery', months: '1 month before' },
    { id: 'trousseau', text: 'Prepare family outfits and trousseau', months: '2 weeks before' },
    { id: 'hotel', text: 'Book hotel for out-of-town guests', months: '1 month before' },
    { id: 'prewed', text: 'Finish pre-wedding shoot', months: '2-3 weeks before' },
  ];
  if (functionCount >= 3) items.push({ id: 'mehndi_fn', text: 'Plan Mehndi function setup', months: '1 week before' });
  if (functionCount >= 5) {
    items.push({ id: 'sangeet', text: 'Practice Sangeet choreography', months: '2-3 weeks before' });
    items.push({ id: 'haldi', text: 'Buy Haldi ceremony essentials', months: '1 week before' });
  }
  items.push(
    { id: 'final_venue', text: 'Do final venue walkthrough', months: '1 week before' },
    { id: 'emergency', text: 'Prepare emergency kit (safety pins, first aid)', months: '2 days before' },
    { id: 'timeline', text: 'Create and share the day-of timeline', months: '3 days before' },
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
