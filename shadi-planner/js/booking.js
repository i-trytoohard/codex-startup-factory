let currentBookingVendor = null;

function openBooking(vendorName, vendorPrice, vendorCategory) {
  currentBookingVendor = { name: vendorName, price: vendorPrice, category: vendorCategory };
  document.getElementById('bookingVendorName').textContent = vendorName;
  document.getElementById('bookingFormView').style.display = 'block';
  document.getElementById('bookingProcessing').style.display = 'none';
  document.getElementById('bookingConfirmed').style.display = 'none';
  const guestVal = document.getElementById('guestInput').value;
  if (guestVal) document.getElementById('bookGuests').value = guestVal;
  document.getElementById('bookingModal').classList.add('visible');
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('visible');
  currentBookingVendor = null;
}

document.getElementById('bookingModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeBookingModal();
});

async function submitBooking() {
  const name = document.getElementById('bookName').value.trim();
  const phone = document.getElementById('bookPhone').value.trim();
  const date = document.getElementById('bookDate').value;
  if (!name) { alert('Apna naam daalein!'); return; }
  if (!phone || phone.length < 10) { alert('Sahi phone number daalein!'); return; }
  if (!date) { alert('Shadi ki date select karein!'); return; }

  document.getElementById('bookingFormView').style.display = 'none';
  document.getElementById('bookingProcessing').style.display = 'block';
  const stepEl = document.getElementById('bookingStep');

  const steps = [
    'Vendor availability check kar rahe hain...',
    'Selected date ke liye slot confirm ho raha hai...',
    'Aapki details vendor ko bhej rahe hain...',
    'Booking reference generate ho rahi hai...',
  ];

  for (let i = 0; i < steps.length; i++) {
    stepEl.textContent = steps[i];
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
  }

  const bookingId = 'SP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const email = document.getElementById('bookEmail').value.trim();
  const guests = document.getElementById('bookGuests').value;
  const notes = document.getElementById('bookNotes').value.trim();
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('confirmBookingId').textContent = 'Booking ID: ' + bookingId;
  document.getElementById('confirmDetails').innerHTML = `
    <div class="detail-row"><span class="detail-label">Vendor</span><span class="detail-value">${escapeHtml(currentBookingVendor.name)}</span></div>
    <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${escapeHtml(currentBookingVendor.category)}</span></div>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${escapeHtml(name)}</span></div>
    <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${escapeHtml(phone)}</span></div>
    ${email ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${escapeHtml(email)}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formattedDate}</span></div>
    ${guests ? `<div class="detail-row"><span class="detail-label">Guests</span><span class="detail-value">${escapeHtml(guests)}</span></div>` : ''}
    ${currentBookingVendor.price ? `<div class="detail-row"><span class="detail-label">Est. Cost</span><span class="detail-value" style="color:var(--green)">${currentBookingVendor.price}</span></div>` : ''}
    ${notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${escapeHtml(notes)}</span></div>` : ''}
  `;

  const bookings = JSON.parse(localStorage.getItem('sp_bookings') || '[]');
  bookings.push({
    id: bookingId,
    vendor: currentBookingVendor.name,
    category: currentBookingVendor.category,
    name, phone, email, date, guests, notes,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('sp_bookings', JSON.stringify(bookings));

  document.getElementById('bookingProcessing').style.display = 'none';
  document.getElementById('bookingConfirmed').style.display = 'block';
}
