const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

// Users
export function createUser(username) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function getUser(username) {
  return request(`/users/${encodeURIComponent(username)}`);
}

export async function getOrCreateUser(username) {
  try {
    return await getUser(username);
  } catch {
    return await createUser(username);
  }
}

// Trips
export function createTrip({ user_id, destination, start_date, end_date, preferences }) {
  return request('/trips', {
    method: 'POST',
    body: JSON.stringify({ user_id, destination, start_date, end_date, preferences }),
  });
}

export function getTrips(userId) {
  return request(`/trips?user_id=${userId}`);
}

export function getTrip(tripId) {
  return request(`/trips/${tripId}`);
}

export function deleteTrip(tripId) {
  return request(`/trips/${tripId}`, { method: 'DELETE' });
}

// AI Generation
export function generateItinerary(tripId) {
  return request(`/trips/${tripId}/itinerary`, { method: 'POST' });
}

export function searchHotels(tripId) {
  return request(`/trips/${tripId}/hotels`, { method: 'POST' });
}

export function searchRestaurants(tripId) {
  return request(`/trips/${tripId}/restaurants`, { method: 'POST' });
}
