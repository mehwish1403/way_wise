const express = require('express');
const router = express.Router();
const axios = require('axios');
const { isLoggedIn, isApiLoggedIn } = require('../middleware/auth');
const Trip = require('../models/Trip');
const Budget = require('../models/Budget');
const WeatherSearch = require('../models/WeatherSearch');

// ── GET / ── Home page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Waywise – Your Online Tour Guide',
    user: req.session.userName || null,
    role: req.session.role || null
  });
});

// ── GET /weather ── Weather page
router.get('/weather', (req, res) => {
  res.render('weather', {
    title: 'Live Weather – Waywise',
    user: req.session.userName || null,
    weatherApiKey: process.env.OPENWEATHER_API_KEY
  });
});

// ── GET /api/weather?city=Paris ── Weather API proxy (keeps key server-side)
router.get('/api/weather', async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'City is required' });
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: city,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });
    if (req.session?.userId) {
      try {
        await WeatherSearch.create({
          user: req.session.userId,
          city,
          type: 'current',
          temperature: response.data?.main?.temp,
          description: response.data?.weather?.[0]?.description || ''
        });
      } catch (saveError) {
        console.warn('Could not save weather search:', saveError.message);
      }
    }
    res.json(response.data);
  } catch (err) {
    res.status(404).json({ error: 'City not found' });
  }
});

// ── GET /api/forecast?city=Paris ── 5-day forecast proxy
router.get('/api/forecast', async (req, res) => {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'City is required' });
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        q: city,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
        cnt: 40
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(404).json({ error: 'Forecast not available' });
  }
});

// ── GET /itinerary ── AI Trip Planner page
router.get('/itinerary', async (req, res) => {
  let savedTrip = null;
  const tripId = req.query.tripId;

  if (tripId && req.session?.userId) {
    try {
      savedTrip = await Trip.findOne({ _id: tripId, user: req.session.userId }).lean();
    } catch (err) {
      console.warn('Could not load saved trip:', err.message);
    }
  }

  res.render('itinerary', {
    title: 'AI Trip Planner – Waywise',
    user: req.session.userName || null,
    geminiKey: process.env.GEMINI_API_KEY,
    savedTrip
  });
});

// ── POST /api/itinerary/save ── Save a generated itinerary (must be logged in)
router.post('/api/itinerary/save', isApiLoggedIn, async (req, res) => {
  try {
    const trip = await Trip.create({
      user: req.session.userId,
      ...req.body
    });
    res.json({ success: true, tripId: trip._id });
  } catch (err) {
    console.error('Save trip error:', err);
    res.status(500).json({ success: false, error: 'Could not save trip' });
  }
});

// ── GET /api/itinerary/my ── Get user's saved trips
router.get('/api/itinerary/my', isApiLoggedIn, async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.session.userId })
      .select('tripTitle origin destination startDate endDate numDays createdAt')
      .sort('-createdAt');
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: 'Could not load trips' });
  }
});

// ── POST /api/budget/save ── Save current budget plan
router.post('/api/budget/save', isApiLoggedIn, async (req, res) => {
  try {
    const { budgetId, tripName, members, expenses, totalBudget, currency } = req.body;
    const payload = {
      user: req.session.userId,
      tripName: tripName || 'My Trip',
      members: Array.isArray(members) ? members : [],
      expenses: Array.isArray(expenses) ? expenses : [],
      totalBudget: Number(totalBudget) || 0,
      currency: currency || '₹'
    };

    let budget = null;
    if (budgetId) {
      budget = await Budget.findOneAndUpdate(
        { _id: budgetId, user: req.session.userId },
        payload,
        { new: true }
      );
    }

    if (!budget) {
      budget = await Budget.create(payload);
    }

    res.json({ success: true, budgetId: budget._id });
  } catch (err) {
    console.error('Save budget error:', err);
    res.status(500).json({ success: false, error: 'Could not save budget' });
  }
});

// ── GET /api/budget/my ── Get user's saved budgets
router.get('/api/budget/my', isApiLoggedIn, async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.session.userId })
      .sort('-createdAt');
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: 'Could not load budgets' });
  }
});

// ── DELETE /api/itinerary/:id ── Remove a saved itinerary
router.delete('/api/itinerary/:id', isApiLoggedIn, async (req, res) => {
  try {
    const deleted = await Trip.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return res.status(404).json({ error: 'Itinerary not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ error: 'Could not delete itinerary' });
  }
});

// ── DELETE /api/budget/:id ── Remove a saved budget
router.delete('/api/budget/:id', isApiLoggedIn, async (req, res) => {
  try {
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return res.status(404).json({ error: 'Budget not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete budget error:', err);
    res.status(500).json({ error: 'Could not delete budget' });
  }
});

// ── DELETE /api/weather-search/:id ── Remove a saved weather search record
router.delete('/api/weather-search/:id', isApiLoggedIn, async (req, res) => {
  try {
    const deleted = await WeatherSearch.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return res.status(404).json({ error: 'Search record not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete weather search error:', err);
    res.status(500).json({ error: 'Could not delete weather search' });
  }
});

// ── GET /hotels ── Hotels search page
router.get('/hotels', (req, res) => {
  res.render('hotels', {
    title: 'Find Hotels – Waywise',
    user: req.session.userName || null
  });
});

// ── GET /api/hotels?city=Paris&checkin=2024-01-01&checkout=2024-01-05 ── Hotel search proxy
router.get('/api/hotels', async (req, res) => {
  const { city, checkin, checkout, adults = 1 } = req.query;
  if (!city) return res.status(400).json({ error: 'City is required' });

  try {
    // Step 1: Get destination ID
    const destRes = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/locations', {
      params: { name: city, locale: 'en-gb' },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
      }
    });

    if (!destRes.data || destRes.data.length === 0) {
      return res.json({ hotels: [], message: 'No destination found' });
    }

    const destId = destRes.data[0].dest_id;
    const destType = destRes.data[0].dest_type;

    // Step 2: Search hotels
    const hotelsRes = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/search', {
      params: {
        dest_id: destId,
        dest_type: destType,
        checkin_date: checkin || new Date().toISOString().split('T')[0],
        checkout_date: checkout || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adults_number: adults,
        room_number: 1,
        locale: 'en-gb',
        currency: 'INR',
        order_by: 'popularity',
        filter_by_currency: 'INR',
        units: 'metric',
        page_number: 0,
        include_adjacency: true
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
      }
    });

    const hotels = hotelsRes.data.result?.slice(0, 12).map(h => ({
      id: h.hotel_id,
      name: h.hotel_name,
      address: h.address,
      city: h.city,
      stars: h.class,
      rating: h.review_score,
      reviewCount: h.review_nr,
      reviewWord: h.review_score_word,
      price: h.price_breakdown?.gross_price,
      currency: h.price_breakdown?.currency,
      image: h.main_photo_url,
      url: h.url
    })) || [];

    res.json({ hotels });

  } catch (err) {
    console.error('Hotels API error:', err.message);
    // Return mock data if API key not set yet
    res.json({
      hotels: [],
      message: 'Hotels API not configured. Add your RapidAPI key to .env file.'
    });
  }
});

// ── POST /api/generate-itinerary ── Groq AI proxy (server-side, key stays safe)
router.post('/api/generate-itinerary', isApiLoggedIn, async (req, res) => {
  const {
    prompt,
    origin,
    destination,
    startDate,
    endDate,
    numDays,
    travellers,
    budgetAmount,
    budgetType,
    travelStyle,
    notes
  } = req.body;

  let finalPrompt = prompt;
  if (!finalPrompt) {
    if (!destination || !startDate || !endDate || !travellers || !budgetAmount) {
      return res.status(400).json({ error: 'Please provide destination, dates, travellers and budget.' });
    }

    const budgetLabel = budgetType || (Number(budgetAmount) <= 15000 ? 'budget/backpacker' : 'mid-range');
    const styleLabel = travelStyle || 'mixed';
    const startDateLabel = new Date(startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const endDateLabel = new Date(endDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const travelerText = `${travellers} traveler${travellers === 1 ? '' : 's'}`;
    const specialNote = notes ? `
Special requests: ${notes}` : '';

    finalPrompt = `You are an expert budget travel planner. Create a low-cost travel itinerary for ${travelerText} going to ${destination} from ${origin || 'your home city'} between ${startDateLabel} and ${endDateLabel}. The total budget is approximately ₹${budgetAmount}. Use affordable transport such as trains, buses, or budget coaches rather than flights whenever possible, and choose inexpensive lodging, local meals, and value-for-money sightseeing. Keep the itinerary close to the budget, allowing at most a 10% buffer above the budget. If this budget is not realistic for the destination and traveler count, return only a JSON object with {"error":"Budget too low for this trip. Please increase the budget or choose a closer destination."}. Do not add extra explanation outside the JSON or markup. Return ONLY raw JSON in the format:
{"tripTitle":"string","destination":"string","overview":"string","totalDistance":"string","estimatedBudget":"string","bestTimeToVisit":"string","budgetBreakdown":{"transport":"₹X-Y","accommodation":"₹X-Y","food":"₹X-Y","activities":"₹X-Y","misc":"₹X-Y"},"days":[{"dayNumber":1,"date":"string","title":"string","activities":[{"time":"string","title":"string","type":"transport|food|sightseeing|hotel|leisure","description":"string","tip":"string","duration":"string"}]}],"packingTips":["string"],"importantNotes":["string"]}${specialNote}`;
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: finalPrompt }],
        max_tokens: 8192,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const text = response.data.choices[0].message.content;
    // Return in same format as Gemini so frontend works unchanged
    res.json({ candidates: [{ content: { parts: [{ text }] } }] });
  } catch (err) {
    console.error('Groq error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'AI generation failed' });
  }
});


router.get('/budget', async (req, res) => {
  let savedBudget = null;
  const budgetId = req.query.budgetId;
  if (budgetId) {
    if (!req.session?.userId) {
      return res.redirect('/auth/login');
    }
    try {
      savedBudget = await Budget.findOne({ _id: budgetId, user: req.session.userId }).lean();
    } catch (err) {
      console.warn('Failed to load budget from profile:', err.message);
    }
  }

  res.render('budget', {
    title: 'Budget Manager – Waywise',
    user: req.session.userName || null,
    savedBudget
  });
});

module.exports = router;