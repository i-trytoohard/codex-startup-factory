function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) return;
  apiKey = key;
  localStorage.setItem('sp_google_api_key', key);
  loadGooglePlaces();
}

function loadGooglePlaces() {
  if (!apiKey || document.getElementById('gplaces-script')) return;
  const status = document.getElementById('apiStatus');
  status.textContent = 'Loading Google Places API...';
  status.className = 'api-status';

  const script = document.createElement('script');
  script.id = 'gplaces-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
  script.onload = () => {
    status.textContent = 'Connected! Real venue search active.';
    status.className = 'api-status connected';
    const div = document.createElement('div');
    div.id = 'gmap';
    div.style.display = 'none';
    document.body.appendChild(div);
    placesService = new google.maps.places.PlacesService(div);
  };
  script.onerror = () => {
    status.textContent = 'API load failed. Check your key.';
    status.className = 'api-status error';
    apiKey = '';
  };
  document.head.appendChild(script);
}

if (apiKey) {
  document.getElementById('apiKeyInput').value = apiKey;
  loadGooglePlaces();
}

function searchPlaces(query, city) {
  return new Promise((resolve) => {
    if (!placesService) { resolve([]); return; }
    const request = {
      query: `${query} in ${city}`,
      type: 'establishment',
    };
    placesService.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results.slice(0, 6).map(p => ({
          name: p.name,
          address: p.formatted_address || '',
          rating: p.rating || 0,
          totalRatings: p.user_ratings_total || 0,
          priceLevel: p.price_level,
          isOpen: p.opening_hours ? p.opening_hours.isOpen() : null,
          placeId: p.place_id,
          photo: p.photos && p.photos.length > 0 ? p.photos[0].getUrl({ maxWidth: 300 }) : null,
          isApi: true,
        })));
      } else {
        resolve([]);
      }
    });
  });
}
