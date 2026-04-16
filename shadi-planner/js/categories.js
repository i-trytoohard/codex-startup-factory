const CATEGORIES = [
  {
    id: 'venue', name: 'Venue / Marriage Hall', emoji: '\uD83C\uDFDB\uFE0F', percent: 30,
    searchQueries: ['marriage hall', 'banquet hall', 'wedding venue', 'marriage garden'],
    getCurated(budget, guests) {
      const b = budget, g = guests;
      const perHead = Math.round(b * 0.30 / g);
      if (b < 300000) return [
        { name: 'Community Hall', desc: `${g} guests, basic AC, parking. Per-head: ${formatINR(perHead)}`, price: b * 0.20, tags: ['budget'], tip: 'Advance booking can save up to 10%' },
        { name: 'Dharamshala / Gurudwara Hall', desc: `Simple setup, ${g}+ capacity, kitchen available`, price: b * 0.10, tags: ['budget'], tip: 'Donation based — very affordable' },
        { name: 'Open Ground + Tent House', desc: `Tent setup — ${g}+ guests, flexible layout`, price: b * 0.25, tags: ['best'], tip: 'Off-season tent houses are 40% cheaper' },
      ];
      if (b < 1000000) return [
        { name: 'AC Banquet Hall', desc: `Fully AC, ${g} guests, stage + basic decor included, DJ space`, price: b * 0.22, tags: ['best'], tip: 'Weekday bookings get 20-30% discount' },
        { name: 'Marriage Garden / Lawn', desc: `Open lawn + covered area, ${g}+ capacity, parking`, price: b * 0.28, tags: [], tip: 'Winter season is best for lawns' },
        { name: '3-Star Hotel Banquet', desc: `AC, valet parking, ${Math.min(g, 300)} guests, rooms available`, price: b * 0.30, tags: ['premium'], tip: 'Ask for room + venue package discount' },
        { name: 'Heritage Haveli', desc: `Traditional setting, royal feel, ${Math.min(g, 250)} guests`, price: b * 0.25, tags: [], tip: 'Great photo opportunities' },
      ];
      return [
        { name: '5-Star Hotel Ballroom', desc: `Premium AC, ${g} guests, valet, dedicated planner`, price: b * 0.20, tags: ['premium'], tip: 'Off-season (June-Aug) can save 25%' },
        { name: 'Luxury Farmhouse Venue', desc: `Private 2-acre lawn, pool, ${g}+ guests, overnight stay`, price: b * 0.18, tags: ['best'], tip: '2-day booking gets better rates' },
        { name: 'Palace / Fort Venue', desc: `Royal destination, 2-3 day package, ${Math.min(g, 500)} guests`, price: b * 0.30, tags: ['premium'], tip: 'Udaipur / Jaipur most popular' },
        { name: 'Beach Resort Venue', desc: `Goa / Kerala, destination wedding, ${Math.min(g, 200)} guests, stay included`, price: b * 0.25, tags: [], tip: 'Oct-Feb best season' },
      ];
    }
  },
  {
    id: 'catering', name: 'Catering', emoji: '\uD83C\uDF5B', percent: 25,
    searchQueries: ['wedding caterer', 'catering service', 'marriage catering'],
    getCurated(budget, guests) {
      const ppLow = budget < 300000 ? 250 : budget < 1000000 ? 450 : 900;
      const ppMid = budget < 300000 ? 450 : budget < 1000000 ? 800 : 1500;
      const ppHigh = budget < 300000 ? 700 : budget < 1000000 ? 1200 : 2500;
      return [
        { name: 'Veg Thali Service', desc: `${ppLow}/plate - Dal Makhani, Paneer, 3 Roti, Rice, Raita, Gulab Jamun`, price: ppLow * guests, tags: ['budget'], isPerPlate: true, perPlate: ppLow, tip: `${guests} guests = ${formatINR(ppLow * guests)} total` },
        { name: 'Standard Buffet', desc: `${ppMid}/plate - 8 items, Starters, 2 Desserts, Welcome Drink, Chaat Counter`, price: ppMid * guests, tags: ['best'], isPerPlate: true, perPlate: ppMid, tip: `${guests} guests = ${formatINR(ppMid * guests)} total` },
        { name: 'Premium Buffet + Live Counters', desc: `${ppHigh}/plate - 15+ items, Live Dosa/Pasta, Ice Cream, Mocktails`, price: ppHigh * guests, tags: ['premium'], isPerPlate: true, perPlate: ppHigh, tip: `${guests} guests = ${formatINR(ppHigh * guests)} total` },
        { name: 'Non-Veg Special Menu', desc: `${ppMid + 100}/plate - Chicken/Mutton, Biryani, Kebabs + full veg spread`, price: (ppMid + 100) * guests, tags: [], isPerPlate: true, perPlate: ppMid + 100, tip: 'Halal certified available' },
      ];
    }
  },
  {
    id: 'clothing', name: 'Clothing & Outfits', emoji: '\uD83D\uDC57', percent: 15,
    searchQueries: ['bridal lehenga shop', 'wedding sherwani', 'bridal wear'],
    getCurated(budget) {
      const b = budget;
      if (b < 300000) return [
        { name: 'Bridal Lehenga - Market', desc: 'Chandni Chowk / Karol Bagh / local market, mirror & embroidery work', price: 15000, tags: ['budget'], tip: 'Wholesale markets offer same quality at half price' },
        { name: 'Groom Sherwani - Rental', desc: 'Rental designer sherwani, shoes + stole included', price: 5000, tags: ['budget'], tip: 'Rental is a very smart option' },
        { name: 'Groom Sherwani - Purchase', desc: 'Local brand, good fabric, basic embroidery', price: 12000, tags: [], tip: 'Check outlet sales for deals' },
        { name: 'Family Outfits', desc: 'Sarees for mom, suits for sisters, basic coordination', price: 20000, tags: [], tip: 'Check local commercial streets' },
      ];
      if (b < 1000000) return [
        { name: 'Designer Lehenga', desc: 'Branded showroom (Meena Bazaar, Koskii), heavy zardozi/zari work', price: 50000, tags: ['best'], tip: 'Exhibition sales offer 30-40% off' },
        { name: 'Groom Sherwani - Premium', desc: 'Manyavar / Raymond Made-to-Measure, accessories included', price: 25000, tags: ['best'], tip: 'Check online exclusive designs too' },
        { name: 'Mehndi + Sangeet + Haldi Outfits', desc: '3 different looks - suits, indo-western, lehenga choli', price: 25000, tags: [], tip: 'Mix rentals for smart savings' },
        { name: 'Family Coordinated Outfits', desc: 'Parents, siblings, close family - matching theme colors', price: 45000, tags: [], tip: 'Bulk orders get 15% discount' },
      ];
      return [
        { name: 'Couture Bridal Lehenga', desc: 'Sabyasachi / Manish Malhotra / Anita Dongre level', price: 250000, tags: ['premium'], tip: 'Book appointment 3-4 months in advance' },
        { name: 'Bespoke Sherwani', desc: 'Custom tailored, imported fabric, handwork', price: 80000, tags: ['premium'] },
        { name: 'All-Functions Wardrobe', desc: 'Haldi, Mehndi, Sangeet, Wedding, Reception - 5 looks', price: 120000, tags: ['best'], tip: 'Hire a stylist for coordination' },
        { name: 'Trousseau / Family + Bridesmaids', desc: 'Full family coordination, 10-15 outfits', price: 100000, tags: [] },
      ];
    }
  },
  {
    id: 'decor', name: 'Decoration', emoji: '\uD83C\uDF38', percent: 10,
    searchQueries: ['wedding decorator', 'marriage decoration', 'flower decoration wedding'],
    getCurated(budget) {
      if (budget < 300000) return [
        { name: 'DIY + Fairy Lights', desc: 'Paper flowers, fairy lights, drapes, candles - fun family project', price: 5000, tags: ['budget', 'best'], tip: 'YouTube tutorials help create beautiful setups' },
        { name: 'Basic Marigold + Stage', desc: 'Marigold flowers, basic stage backdrop, gate decoration', price: 15000, tags: ['budget'] },
        { name: 'Local Decorator Package', desc: 'Stage, mandap, entry gate, dining area - basic flower + fabric', price: 25000, tags: [] },
      ];
      if (budget < 1000000) return [
        { name: 'Themed Stage Decoration', desc: 'Designer stage backdrop, LED lights, flower arrangement, photo booth', price: 45000, tags: ['best'], tip: 'Pastel themes are trending' },
        { name: 'Full Venue Package', desc: 'Entry gate, pathway, mandap, stage, dining decor, ceiling drapes', price: 70000, tags: [] },
        { name: 'Flower + LED Premium', desc: 'Rose/lily arrangements, LED panels, candle pathway, hanging florals', price: 35000, tags: [] },
      ];
      return [
        { name: 'Luxury Floral Design', desc: 'Imported roses/orchids, grand mandap, crystal chandelier, ceiling installations', price: 250000, tags: ['premium'], tip: 'Book floral designers 2 months ahead' },
        { name: 'Themed Transformation', desc: 'Royal / Rustic / Pastel / Tropical - complete venue makeover, each event different', price: 180000, tags: ['best'] },
        { name: 'Light & Sound Decor', desc: 'Architectural lighting, projection mapping, fog effects, LED walls', price: 120000, tags: [] },
      ];
    }
  },
  {
    id: 'photo', name: 'Photography & Video', emoji: '\uD83D\uDCF8', percent: 8,
    searchQueries: ['wedding photographer', 'wedding videography', 'pre wedding shoot'],
    getCurated(budget) {
      if (budget < 300000) return [
        { name: 'Local Photographer + Video', desc: '1 photographer + 1 videographer, full day coverage, 200 edited photos, USB', price: 20000, tags: ['budget', 'best'], tip: 'Find local talent on Instagram — great quality' },
        { name: 'Photo Only Package', desc: '1 photographer, 300+ photos, basic album (40 pages)', price: 12000, tags: ['budget'] },
      ];
      if (budget < 1000000) return [
        { name: 'Professional Studio', desc: '2 photographers, 1 videographer, drone shots, highlight reel, 500+ photos', price: 55000, tags: ['best'], tip: 'Always review portfolio before booking' },
        { name: 'Pre-Wedding Shoot', desc: 'Outdoor location, 50 edited photos, 1 outfit change, BTS video', price: 18000, tags: [] },
        { name: 'Candid + Cinematic Package', desc: '2 candid photographers, cinematic video, teaser, same-day edit, album', price: 80000, tags: ['premium'] },
      ];
      return [
        { name: 'Premium Cinematic Team', desc: '3 photographers, 2 videographers, drone, same-day edit, trailer, luxury album', price: 180000, tags: ['premium'] },
        { name: 'Destination Pre-Wedding', desc: 'Travel shoot (Goa/Jaipur/abroad), 100+ photos, video, 2 locations', price: 100000, tags: [] },
        { name: 'All-Events Coverage', desc: 'Every function covered, 2000+ photos, cinematic video, coffee table book', price: 250000, tags: ['best'] },
      ];
    }
  },
  {
    id: 'music', name: 'Music / DJ / Entertainment', emoji: '\uD83C\uDFB5', percent: 5,
    searchQueries: ['wedding DJ', 'wedding band', 'sangeet choreographer'],
    getCurated(budget) {
      if (budget < 300000) return [
        { name: 'DJ Sound System', desc: 'Basic DJ, 4 speakers, LED lights, smoke machine, 6 hours', price: 10000, tags: ['budget'] },
        { name: 'Dhol + Band for Baraat', desc: '2 dhol players, small brass band (8-10 ppl), 2 hours', price: 8000, tags: ['best'], tip: 'Dhol is a must for the baraat!' },
      ];
      if (budget < 1000000) return [
        { name: 'Professional DJ Package', desc: 'DJ + LED dance floor + fog machine + laser lights, 8 hours', price: 30000, tags: ['best'] },
        { name: 'Full Baraat Band', desc: 'Full brass band (15 members) + horse cart + LED cart, fireworks optional', price: 20000, tags: [] },
        { name: 'Sangeet Choreographer', desc: '5 dance sessions, group choreography, music mixing, coordination', price: 12000, tags: [], tip: 'Great YouTube choreographers also available' },
      ];
      return [
        { name: 'Celebrity DJ', desc: 'Known DJ artist, premium sound, intelligent lights, full night', price: 120000, tags: ['premium'] },
        { name: 'Live Band + Bollywood Singer', desc: '8-piece band, 4-hour set, Bollywood + Sufi + current hits', price: 100000, tags: ['best'] },
        { name: 'Sangeet Production', desc: 'Professional choreographer, sound, lights, anchor/emcee, games', price: 70000, tags: [] },
      ];
    }
  },
  {
    id: 'beauty', name: 'Mehndi / Makeup / Beauty', emoji: '\uD83D\uDC85', percent: 4,
    searchQueries: ['bridal makeup artist', 'mehndi artist', 'bridal beauty'],
    getCurated(budget) {
      if (budget < 300000) return [
        { name: 'Bridal Mehndi', desc: 'Experienced artist, both hands + feet, detailed design, 3-4 hours', price: 4000, tags: ['budget'] },
        { name: 'Parlour Bridal Package', desc: 'HD makeup + hair styling + draping + trial, wedding day only', price: 10000, tags: ['best'] },
      ];
      if (budget < 1000000) return [
        { name: 'Professional Mehndi Artist', desc: 'Bridal + 15 guest mehndi, Rajasthani/Arabic designs', price: 12000, tags: ['best'] },
        { name: 'Bridal Makeup (HD/Airbrush)', desc: 'Airbrush makeup, hairstyling, 2 looks (wedding + reception), trial included', price: 30000, tags: [] },
        { name: 'Groom Grooming', desc: 'Facial, cleanup, hair styling, beard trim, wedding day', price: 5000, tags: [] },
      ];
      return [
        { name: 'Celebrity Makeup Artist', desc: 'Airbrush, all 5 events, personal stylist, trial, bridal room setup', price: 100000, tags: ['premium'] },
        { name: 'Premium Mehndi Package', desc: 'Master artist, bridal + 30 guests, unique custom design', price: 30000, tags: ['best'] },
        { name: 'Complete Beauty Package', desc: 'Bride + groom + family (10 ppl), all events, pre-wedding skincare course', price: 70000, tags: [] },
      ];
    }
  },
  {
    id: 'invite', name: 'Invitations / Cards', emoji: '\uD83D\uDC8C', percent: 3,
    searchQueries: ['wedding card printer', 'wedding invitation'],
    getCurated(budget, guests) {
      const cardCount = Math.ceil(guests * 0.7);
      if (budget < 300000) return [
        { name: 'WhatsApp Video Invite', desc: 'Animated video, custom music, RSVP link, unlimited shares', price: 2000, tags: ['budget', 'best'], tip: 'Smartest option — saves money and trees' },
        { name: 'Simple Printed Cards', desc: `${cardCount} cards, 2-fold, gold foil text, envelope included`, price: Math.max(cardCount * 25, 3000), tags: [] },
      ];
      if (budget < 1000000) return [
        { name: 'Designer E-Invitation', desc: 'Animated video + wedding website + RSVP + schedule + location map', price: 5000, tags: ['best'] },
        { name: 'Premium Printed Cards', desc: `${cardCount} cards, box-type, sweet box, laser-cut design`, price: cardCount * 80, tags: [] },
        { name: 'Combo: Digital + Print', desc: `E-invite for all + ${Math.ceil(cardCount * 0.3)} premium printed for VIPs`, price: 15000, tags: ['budget'] },
      ];
      return [
        { name: 'Luxury Box Invitation', desc: `${cardCount} boxes with sweets, dry fruits, scroll card, custom design`, price: cardCount * 350, tags: ['premium'] },
        { name: 'Wedding Website + App', desc: 'Custom domain, RSVP management, photos, schedule, guest communication', price: 20000, tags: ['best'] },
        { name: 'Scroll / Padded Invitations', desc: `Royal scroll style, velvet box, ${cardCount} pieces`, price: cardCount * 200, tags: [] },
      ];
    }
  }
];
