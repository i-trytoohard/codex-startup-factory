# Shadi Planner

Smart budget wedding planner for Indian weddings. Enter your city, guest count, and budget to get real venue recommendations (via Google Places API) and curated vendor options for everything shadi-related.

## Features

- **Real Venue Search** — Google Places API integration finds actual marriage halls, banquets, hotels, and gardens in your city with ratings, reviews, and Google Maps links
- **8 Wedding Categories** — Venue, Catering, Clothing, Decoration, Photography, Music/DJ, Mehndi/Beauty, Invitations
- **Budget-Aware Recommendations** — Vendor options adapt to your budget (budget / best value / premium tiers)
- **Per-Plate Catering Calculator** — Shows cost per plate and total based on your guest count
- **Smart Budget Breakdown** — Automatic percentage allocation across all categories with per-guest and per-function cost
- **Expense Tracker** — Track actual spending vs budget with a visual progress bar (persisted in localStorage)
- **Wedding Checklist** — 20+ items with timeline suggestions (3 months before, 1 week before, etc.), saves progress
- **Money-Saving Tips** — Budget-specific tips that actually help save money
- **Wedding Type Support** — Traditional, Modern, Destination, and Intimate wedding presets
- **Multi-Function Planning** — Plan for 1 to 5 functions (Haldi, Mehndi, Sangeet, Shadi, Reception)
- **Mobile Responsive** — Works on phone, tablet, and desktop
- **No Backend Required** — Pure HTML/CSS/JS, runs from a single file

## How to Run

Just open the HTML file in a browser:

```bash
# Option 1: Direct open
xdg-open shadi-planner/index.html     # Linux
open shadi-planner/index.html          # macOS

# Option 2: Simple HTTP server (recommended for API features)
cd shadi-planner
python3 -m http.server 8080
# Then open http://localhost:8080
```

## Google Places API Setup (Optional)

Without the API key, the app works with curated vendor data. With it, you get **real venue results** from Google Maps.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **Places API** and **Maps JavaScript API**
4. Generate an API key under Credentials
5. Paste the key in the app's API setup section

The key is stored in your browser's localStorage — never sent anywhere except Google's API.

## Tech

- Single `index.html` file (~700 lines)
- No dependencies, no build step, no framework
- Google Places API (optional, for real venue search)
- localStorage for checklist progress, expense tracking, and API key persistence
