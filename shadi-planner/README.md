# Shadi Planner

Smart budget wedding planner for Indian weddings. Enter your city, guest count, and budget to get real venue recommendations (via Google Places API) and curated vendor options for everything shadi-related.

## Features

- **Real Venue Search** — Google Places API integration finds actual marriage halls, banquets, hotels, and gardens in your city with ratings, reviews, and Google Maps links
- **Vendor Booking** — Book venues and vendors directly through the app with a full booking flow, confirmation IDs, and receipt
- **8 Wedding Categories** — Venue, Catering, Clothing, Decoration, Photography, Music/DJ, Mehndi/Beauty, Invitations
- **Budget-Aware Recommendations** — Vendor options adapt to your budget (budget / best value / premium tiers)
- **Per-Plate Catering Calculator** — Shows cost per plate and total based on your guest count
- **Smart Budget Breakdown** — Automatic percentage allocation across all categories with per-guest and per-function cost
- **Expense Tracker** — Track actual spending vs budget with a visual progress bar (persisted in localStorage)
- **Wedding Checklist** — 20+ items with timeline suggestions (3 months before, 1 week before, etc.), saves progress
- **Money-Saving Tips** — Budget-specific tips that actually help save money
- **Wedding Type Support** — Traditional, Modern, Destination, and Intimate wedding presets
- **Multi-Function Planning** — Plan for 1 to 5 functions (Haldi, Mehndi, Sangeet, Shadi, Reception)
- **Loading States** — Skeleton loaders and spinners for a polished async experience
- **Mobile Responsive** — Works on phone, tablet, and desktop

## Project Structure

```
shadi-planner/
├── index.html              # Main HTML shell (markup only)
├── README.md               # This file
├── config.local.js         # Local config (API keys)
├── env.js                  # Environment config
├── env.example.js          # Example env file
├── use-env-key.sh          # Helper script for env setup
├── css/
│   ├── variables.css       # Design tokens (colors, spacing, radii)
│   ├── base.css            # Reset, body, header, footer, layout
│   ├── forms.css           # Form inputs, buttons, budget slider, API setup
│   ├── tabs.css            # Tab navigation and content panels
│   ├── vendors.css         # Vendor cards, categories, tags, breakdown grid
│   ├── tracker.css         # Expense tracker, checklist, tips, guest calc
│   ├── modal.css           # Booking modal, processing, confirmation states
│   └── skeleton.css        # Skeleton loading animation
└── js/
    ├── utils.js            # Shared utilities (formatINR, escapeHtml, sleep)
    ├── state.js            # Global app state (budget, expenses, API key)
    ├── budget.js           # Budget slider and input sync
    ├── tabs.js             # Tab switching logic
    ├── places.js           # Google Places API integration
    ├── categories.js       # Vendor category data (8 categories with curated options)
    ├── planner.js          # Plan generation, breakdown, tips rendering
    ├── checklist.js        # Wedding checklist with localStorage persistence
    ├── expenses.js         # Expense tracker CRUD
    └── booking.js          # Vendor booking modal and confirmation flow
```

## How to Run

Serve via HTTP (required for multi-file loading):

```bash
cd shadi-planner
python3 -m http.server 8080
# Then open http://localhost:8080
```

Or use any static file server (Live Server in VS Code, `npx serve`, etc.).

## Google Places API Setup (Optional)

Without the API key, the app works with curated vendor data. With it, you get **real venue results** from Google Maps.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **Places API** and **Maps JavaScript API**
4. Generate an API key under Credentials
5. Paste the key in the app's API setup section

The key is stored in your browser's localStorage — never sent anywhere except Google's API.

## Tech

- Vanilla HTML / CSS / JavaScript — no frameworks, no build step
- Modular file structure (7 CSS files, 10 JS files)
- Google Places API (optional, for real venue search)
- localStorage for checklist progress, expense tracking, bookings, and API key persistence
