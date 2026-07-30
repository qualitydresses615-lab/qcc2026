// lib/googlePlaces.js
// Fetches live rating + reviews from Google's Places API (New).
// Two calls: Text Search (to find the Place ID) then Place Details
// (to get rating, review count, and review text).
//
// Requires GOOGLE_PLACES_API_KEY in environment variables, restricted
// to the Places API only in Google Cloud Console.

const SEARCH_QUERY = 'Quality Dresses, Railway Station Road, Bharuch, Gujarat';

// Cache the place_id in memory per serverless instance so we don't
// re-search on every request — it never changes once found.
let cachedPlaceId = null;

async function findPlaceId(apiKey) {
  if (cachedPlaceId) return cachedPlaceId;

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: SEARCH_QUERY }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.places || !data.places.length) {
    throw new Error('Place not found: ' + JSON.stringify(data));
  }
  cachedPlaceId = data.places[0].id;
  return cachedPlaceId;
}

async function getPlaceReviews(apiKey) {
  const placeId = await findPlaceId(apiKey);
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const resp = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews.rating,reviews.text,reviews.authorAttribution,reviews.relativePublishTimeDescription',
    },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('Place details failed: ' + JSON.stringify(data));

  return {
    rating: data.rating || null,
    reviewCount: data.userRatingCount || 0,
    reviews: (data.reviews || []).slice(0, 5).map(r => ({
      rating: r.rating,
      text: r.text ? r.text.text : '',
      author: r.authorAttribution ? r.authorAttribution.displayName : 'Google User',
      time: r.relativePublishTimeDescription || '',
    })),
  };
}

module.exports = { getPlaceReviews };
