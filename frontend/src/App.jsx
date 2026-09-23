import { useEffect, useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import VehicleList from './components/VehicleList.jsx';
import EmiCalculator, { calculateEMI } from './components/EmiCalculator.jsx';
import {
  money,
  getVehicleImage,
  getPlaceholderImage,
  getPriceInsightText,
  formatLakh
} from './components/VehicleCard.jsx';

const EXAMPLE_QUERIES = [
  { label: 'SUVs under ₹15L', query: 'Show SUVs under 15 lakh' },
  { label: 'Electric under ₹20L', query: 'Electric cars under 20 lakh' },
  { label: '7 seaters under ₹18L', query: '7 seater cars under 18 lakh' },
  { label: 'Automatic in Bangalore', query: 'Automatic sedans in Bangalore' }
];

const COMPARE_ROWS = [
  ['Make / Model', (v) => `${v.make} ${v.model}`],
  ['Variant', (v) => v.variant],
  ['Price', (v) => money(v.price)],
  ['Year', (v) => v.year],
  ['Fuel Type', (v) => v.fuelType],
  ['Transmission', (v) => v.transmission],
  ['Body Type', (v) => v.bodyType],
  ['KM Driven', (v) => `${Number(v.kmDriven).toLocaleString('en-IN')} km`],
  ['Safety Rating', (v) => `${v.safetyRating} / 5`],
  ['Seating Capacity', (v) => `${v.seatingCapacity} seats`],
  ['Mileage', (v) => v.mileage],
  ['City', (v) => v.city],
  ['Ownership', (v) => `${v.ownership} owner(s)`]
];

function formatLakhLabel(amount) {
  const lakhs = Number(amount) / 100000;
  if (Number.isInteger(lakhs)) {
    return `₹${lakhs}L`;
  }
  return `₹${lakhs.toFixed(1)}L`;
}

// Turn the API filters object into simple chip labels for the UI.
function filtersToChips(filters) {
  if (!filters || typeof filters !== 'object') {
    return [];
  }

  const chips = [];

  if (filters.make) chips.push({ key: 'make', label: filters.make });
  if (filters.model) chips.push({ key: 'model', label: filters.model });
  if (filters.bodyType) chips.push({ key: 'bodyType', label: filters.bodyType.toUpperCase() });
  if (filters.fuelType) chips.push({ key: 'fuelType', label: filters.fuelType });
  if (filters.transmission) chips.push({ key: 'transmission', label: filters.transmission });
  if (filters.minPrice !== undefined) chips.push({ key: 'minPrice', label: `≥ ${formatLakhLabel(filters.minPrice)}` });
  if (filters.maxPrice !== undefined) chips.push({ key: 'maxPrice', label: `≤ ${formatLakhLabel(filters.maxPrice)}` });
  if (filters.minKmDriven !== undefined) chips.push({ key: 'minKmDriven', label: `≥ ${Number(filters.minKmDriven).toLocaleString('en-IN')} km` });
  if (filters.maxKmDriven !== undefined) chips.push({ key: 'maxKmDriven', label: `≤ ${Number(filters.maxKmDriven).toLocaleString('en-IN')} km` });
  if (filters.minSafetyRating !== undefined) chips.push({ key: 'minSafetyRating', label: `Safety ≥ ${filters.minSafetyRating}` });
  if (filters.seatingCapacity !== undefined) chips.push({ key: 'seatingCapacity', label: `${filters.seatingCapacity} seats` });
  if (filters.city) chips.push({ key: 'city', label: filters.city });
  if (filters.minYear !== undefined) chips.push({ key: 'minYear', label: `From ${filters.minYear}` });
  if (filters.maxYear !== undefined) chips.push({ key: 'maxYear', label: `Until ${filters.maxYear}` });
  if (filters.ownership !== undefined) chips.push({ key: 'ownership', label: `${filters.ownership} owner` });

  return chips;
}

// Build a plain-language query from remaining filters so we can reuse POST /api/vehicles/search.
function buildQueryFromFilters(filters) {
  const parts = [];

  if (filters.make) parts.push(filters.make);
  if (filters.model) parts.push(filters.model);
  if (filters.bodyType) parts.push(filters.bodyType);
  if (filters.fuelType) parts.push(filters.fuelType);
  if (filters.transmission) parts.push(filters.transmission);
  if (filters.seatingCapacity) parts.push(`${filters.seatingCapacity} seater`);
  if (filters.maxPrice !== undefined) parts.push(`under ${Number(filters.maxPrice) / 100000} lakh`);
  if (filters.minPrice !== undefined) parts.push(`above ${Number(filters.minPrice) / 100000} lakh`);
  if (filters.maxKmDriven !== undefined) parts.push(`below ${filters.maxKmDriven} km`);
  if (filters.minKmDriven !== undefined) parts.push(`above ${filters.minKmDriven} km`);
  if (filters.minSafetyRating !== undefined) parts.push(`safety ${filters.minSafetyRating}`);
  if (filters.minYear !== undefined) parts.push(`from ${filters.minYear}`);
  if (filters.maxYear !== undefined) parts.push(`until ${filters.maxYear}`);
  if (filters.ownership !== undefined) parts.push(`${filters.ownership} owner`);
  if (filters.city) parts.push(`in ${filters.city}`);

  return parts.join(' ').trim();
}

function GuestLanding({ onLogin, onRegister, hasSharedLink }) {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-10 lg:pt-16">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-coral">
            AI vehicle search
          </p>
          <h1 className="max-w-3xl font-display text-5xl leading-[0.98] sm:text-7xl">
            driveloop
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink/65">
            Search used cars in plain English, get an AI Vehicle Advisor summary
            on your top matches, compare options, and estimate EMI — after you login.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-pine px-6 py-3 text-sm font-bold text-paper hover:bg-ink"
              onClick={onLogin}
            >
              Login to open dashboard
            </button>
            <button
              type="button"
              className="rounded-full border border-ink/15 px-6 py-3 text-sm font-bold hover:border-coral hover:text-coral"
              onClick={onRegister}
            >
              Create account
            </button>
          </div>

          {hasSharedLink && (
            <p className="mt-5 rounded-2xl border border-mint/40 bg-mint/20 px-4 py-3 text-sm text-pine">
              You opened a shared comparison link. Login to view those vehicles.
            </p>
          )}
        </div>

        <div className="rounded-[2rem] bg-pine p-7 text-paper shadow-xl shadow-pine/10 sm:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
            How it works
          </p>
          <ol className="mt-6 space-y-5 text-base leading-7 text-paper/90">
            <li>
              <strong className="text-mint">1. Ask in plain language</strong>
              <br />
              Example: “SUVs under 15 lakh in Bangalore”
            </li>
            <li>
              <strong className="text-mint">2. Review matches + AI Advisor</strong>
              <br />
              See scored results, then a short Gemini explanation of your top cars
            </li>
            <li>
              <strong className="text-mint">3. Compare &amp; decide</strong>
              <br />
              Side-by-side specs, EMI estimate, favourites, and share links
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-16 grid gap-5 sm:grid-cols-3">
        {[
          {
            title: 'Natural language search',
            text: 'The AI turns your sentence into safe filters. SQL is built by the app, not the model.'
          },
          {
            title: 'AI Vehicle Advisor',
            text: 'After results load, Gemini explains your top 3–5 matches using only ranked vehicle data from our backend.'
          },
          {
            title: 'Compare with EMI',
            text: 'Pick up to 3 cars, estimate monthly EMI, and share a comparison link with friends.'
          }
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-ink/10 bg-white/55 p-6"
          >
            <h2 className="font-display text-2xl">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/60">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="mt-12 rounded-3xl border border-ink/10 bg-white/50 p-6 text-center sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">
          Demo access
        </p>
        <h2 className="mt-3 font-display text-3xl">
          Login to search the live catalogue
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink/60">
          Guests only see this intro. The full dashboard — search, AI Vehicle Advisor,
          match scores, compare, and saved searches — unlocks after login.
        </p>
        <button
          type="button"
          className="mt-6 rounded-full bg-coral px-6 py-3 text-sm font-bold text-white hover:bg-ink"
          onClick={onLogin}
        >
          Go to login
        </button>
      </section>
    </main>
  );
}

function getToken() {
  return localStorage.getItem('authToken');
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('authUser') || 'null');
  } catch {
    return null;
  }
}

// Local: empty → Vite proxies /api to localhost:5000
// Render: set VITE_API_URL to your backend URL (e.g. https://my-api.onrender.com)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

  let data = {};
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const details = Array.isArray(data.details) ? data.details.filter(Boolean) : [];
    const error = new Error(details.length ? details.join(' ') : (data.error || 'Request failed.'));
    error.status = response.status;
    throw error;
  }

  return data;
}

function App() {
  // Search / catalogue state
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [vehicles, setVehicles] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState({ message: '', type: 'info' });
  // Active search filters from the API (used for chips + "Why this car")
  const [filters, setFilters] = useState({});

  // AI Vehicle Advisor (separate from search — failure must not break results)
  const [advisorText, setAdvisorText] = useState('');
  const [advisorStatus, setAdvisorStatus] = useState('idle'); // idle | loading | ready | error

  // Compare / favourites
  const [compareVehicles, setCompareVehicles] = useState([]);
  const [favouriteIds, setFavouriteIds] = useState([]);

  // Auth
  const [user, setUser] = useState(getStoredUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // User tools dialog (favourites / history / comparisons)
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userDialogTitle, setUserDialogTitle] = useState('');
  const [userDialogMode, setUserDialogMode] = useState('');
  const [userDialogItems, setUserDialogItems] = useState([]);
  const [userDialogLoading, setUserDialogLoading] = useState(false);
  const [userDialogError, setUserDialogError] = useState('');

  const limit = 9;
  const isLoggedIn = Boolean(getToken() && user);

  function showStatus(message, type = 'info') {
    setStatus({ message, type });
  }

  function hideStatus() {
    setStatus({ message: '', type: 'info' });
  }

  // Load catalogue only when logged in (dashboard)
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, page, sortBy, sortOrder, query]);

  // Reload this account's favourites whenever login state changes
  useEffect(() => {
    if (!isLoggedIn) {
      setFavouriteIds([]);
      setVehicles([]);
      setFilters({});
      setQuery('');
      setSearchInput('');
      setAdvisorText('');
      setAdvisorStatus('idle');
      return;
    }

    loadFavouriteIds();
    loadSharedComparisonFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Guests: remember shared link ids until they login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids');
    if (idsParam && !isLoggedIn) {
      sessionStorage.setItem('pendingCompareIds', idsParam);
    }
  }, [isLoggedIn]);

  async function loadSharedComparisonFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids') || sessionStorage.getItem('pendingCompareIds');

    if (!idsParam) {
      return;
    }

    const ids = idsParam
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 3);

    if (ids.length < 2) {
      return;
    }

    try {
      const vehiclesFromLink = await Promise.all(
        ids.map((id) => apiFetch(`/api/vehicles/${id}`))
      );
      setCompareVehicles(vehiclesFromLink.filter(Boolean));
      sessionStorage.removeItem('pendingCompareIds');
      showStatus('Opened shared comparison.');
    } catch (error) {
      showStatus(error.message || 'Unable to open shared comparison.', 'error');
    }
  }

  async function requestVehicleAdvisor(nextFilters, nextVehicles, searchQuery) {
    if (!searchQuery || !nextVehicles || nextVehicles.length === 0) {
      setAdvisorText('');
      setAdvisorStatus('idle');
      return;
    }

    setAdvisorStatus('loading');
    setAdvisorText('');

    // ONE Gemini call for the top 3–5 vehicles only (backend also caps at 5).
    const topVehicles = nextVehicles.slice(0, 5).map((vehicle) => ({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      price: vehicle.price,
      bodyType: vehicle.bodyType,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seatingCapacity: vehicle.seatingCapacity,
      mileage: vehicle.mileage,
      city: vehicle.city,
      matchScore: vehicle.matchScore ?? null
    }));

    try {
      const data = await apiFetch('/api/vehicle-advisor', {
        method: 'POST',
        body: JSON.stringify({
          query: searchQuery,
          filters: nextFilters || {},
          vehicles: topVehicles
        })
      });

      if (data.advice) {
        setAdvisorText(data.advice);
        setAdvisorStatus('ready');
      } else {
        setAdvisorText('');
        setAdvisorStatus('error');
      }
    } catch {
      setAdvisorText('');
      setAdvisorStatus('error');
    }
  }

  async function loadVehicles() {
    showStatus('Loading vehicles...');
    setVehicles([]);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sortBy,
      sortOrder
    });

    const url = query ? '/api/vehicles/search' : `/api/vehicles?${params}`;

    // Follow-up search: send current filters so "Only automatic" merges in.
    const hasPreviousFilters = query && filters && Object.keys(filters).length > 0;

    const options = query
      ? {
          method: 'POST',
          body: JSON.stringify({
            query,
            page,
            limit,
            sortBy,
            sortOrder,
            ...(hasPreviousFilters ? { previousFilters: filters } : {})
          })
        }
      : {};

    try {
      const data = await apiFetch(url, options);
      hideStatus();
      setVehicles(data.vehicles || []);
      setTotalPages(data.totalPages || 0);

      // Catalogue list has no filters; search returns parsed filters.
      if (query) {
        const nextFilters = data.filters || {};
        setFilters(nextFilters);

        if (data.vehicles && data.vehicles.length > 0) {
          requestVehicleAdvisor(nextFilters, data.vehicles, query);
        } else {
          setAdvisorText('');
          setAdvisorStatus('idle');
        }
      } else {
        setFilters({});
        setAdvisorText('');
        setAdvisorStatus('idle');
      }

      if (!data.vehicles || data.vehicles.length === 0) {
        showStatus(
          'No vehicles match this search. Try changing the budget, city, or vehicle type.'
        );
      }
    } catch (error) {
      showStatus(error.message || 'Unable to load vehicles.', 'error');
      setTotalPages(0);
      setFilters({});
      setAdvisorText('');
      setAdvisorStatus('idle');
    }
  }

  function handleSearch() {
    const nextQuery = searchInput.trim();
    setPage(1);
    setQuery(nextQuery);

    if (!nextQuery) {
      setFilters({});
    }

    if (nextQuery) {
      saveSearchHistory(nextQuery);
    }
  }

  function removeFilter(key) {
    const nextFilters = { ...filters };
    delete nextFilters[key];
    setFilters(nextFilters);

    const nextQuery = buildQueryFromFilters(nextFilters);
    setPage(1);
    setSearchInput(nextQuery);
    setQuery(nextQuery);

    if (!nextQuery) {
      setFilters({});
    }
  }

  function handleSortChange(event) {
    const [nextSortBy, nextSortOrder] = event.target.value.split(':');
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  }

  async function loadDetail(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailVehicle(null);

    try {
      const vehicle = await apiFetch(`/api/vehicles/${id}`);
      setDetailVehicle(vehicle);
    } catch (error) {
      setDetailError(error.message || 'Unable to load details.');
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleCompare(vehicle) {
    const alreadySelected = compareVehicles.some((item) => item.id === vehicle.id);

    if (alreadySelected) {
      setCompareVehicles(compareVehicles.filter((item) => item.id !== vehicle.id));
      return;
    }

    if (compareVehicles.length >= 3) {
      showStatus('You can compare up to 3 vehicles at a time.', 'error');
      return;
    }

    hideStatus();
    setCompareVehicles([...compareVehicles, vehicle]);
  }

  function clearComparison() {
    setCompareVehicles([]);
  }

  async function loadFavouriteIds() {
    if (!getToken()) {
      setFavouriteIds([]);
      return;
    }

    try {
      const data = await apiFetch('/api/user/favourites');
      // Backend returns { vehicles }; older shape used { favourites }
      const list = data.favourites || data.vehicles || [];
      setFavouriteIds(list.map((vehicle) => Number(vehicle.id)));
    } catch (error) {
      if (error.status === 401) {
        logout(false);
      }
      setFavouriteIds([]);
    }
  }

  async function toggleFavourite(vehicleId) {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    try {
      const isFavourite = favouriteIds.includes(vehicleId);

      if (isFavourite) {
        await apiFetch(`/api/user/favourites/${vehicleId}`, { method: 'DELETE' });
        setFavouriteIds(favouriteIds.filter((id) => id !== vehicleId));
      } else {
        await apiFetch('/api/user/favourites', {
          method: 'POST',
          body: JSON.stringify({ vehicleId })
        });
        setFavouriteIds([...favouriteIds, vehicleId]);
      }
    } catch (error) {
      if (error.status === 401) {
        logout(false);
        openAuth('login');
        return;
      }
      showStatus(error.message || 'Unable to update favourite.', 'error');
    }
  }

  async function saveSearchHistory(searchQuery) {
    if (!getToken() || !searchQuery.trim()) {
      return;
    }

    try {
      await apiFetch('/api/user/search-history', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery.trim() })
      });
    } catch {
      // Search should still work if history saving fails
    }
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setAuthMessage('');
    setAuthOpen(true);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthMessage('');

    try {
      const isRegister = authMode === 'register';
      const formData = new FormData(event.currentTarget);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const body = isRegister
        ? { name, email, password }
        : { email, password };

      const data = await apiFetch(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      // After register: do not open dashboard. Ask user to login.
      if (isRegister) {
        setAuthMode('login');
        setAuthMessage('Account created. Please login with your email and password.');
        return;
      }

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      setUser(data.user);
      setCompareVehicles([]);
      setUserDialogOpen(false);
      setAuthOpen(false);
      setAuthMessage('');
    } catch (error) {
      setAuthMessage(error.message || 'Authentication failed.');
    }
  }

  function logout(clearStatus = true) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
    setFavouriteIds([]);
    setCompareVehicles([]);
    setUserDialogOpen(false);
    setUserDialogItems([]);
    if (clearStatus) {
      hideStatus();
    }
  }

  function handleAccountError(error) {
    if (error.status === 401) {
      logout(false);
      openAuth('login');
      return true;
    }

    return false;
  }

  async function saveCurrentSearch() {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    const searchText = (query || searchInput).trim();

    if (!searchText) {
      showStatus('Run a search before saving it.', 'error');
      return;
    }

    try {
      await apiFetch('/api/user/saved-searches', {
        method: 'POST',
        body: JSON.stringify({
          searchText,
          filters
        })
      });
      showStatus('Search saved to your alerts list.');
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      showStatus(error.message || 'Unable to save search.', 'error');
    }
  }

  async function showSavedSearches() {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    setUserDialogTitle('Saved searches');
    setUserDialogMode('saved-searches');
    setUserDialogOpen(true);
    setUserDialogLoading(true);
    setUserDialogError('');
    setUserDialogItems([]);

    try {
      const data = await apiFetch('/api/user/saved-searches');
      setUserDialogItems(data.savedSearches || []);
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      setUserDialogError(error.message || 'Unable to load saved searches.');
    } finally {
      setUserDialogLoading(false);
    }
  }

  async function deleteSavedSearch(id) {
    try {
      await apiFetch(`/api/user/saved-searches/${id}`, { method: 'DELETE' });
      showSavedSearches();
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      setUserDialogError(error.message || 'Unable to delete saved search.');
    }
  }

  function runSavedSearch(item) {
    const nextQuery = item.searchText || item.query || '';
    setUserDialogOpen(false);
    setFilters({});
    setSearchInput(nextQuery);
    setPage(1);
    setQuery(nextQuery);
  }

  async function shareComparison() {
    if (compareVehicles.length < 2) {
      showStatus('Select at least 2 vehicles to share.', 'error');
      return;
    }

    const ids = compareVehicles.map((vehicle) => vehicle.id).join(',');
    // No react-router: use query string on the current page so guests can open it.
    const link = `${window.location.origin}/?ids=${ids}`;

    try {
      await navigator.clipboard.writeText(link);
      showStatus('Comparison link copied to clipboard.');
    } catch {
      window.prompt('Copy this comparison link:', link);
    }
  }

  async function showFavourites() {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    setUserDialogTitle('Favourites');
    setUserDialogMode('favourites');
    setUserDialogOpen(true);
    setUserDialogLoading(true);
    setUserDialogError('');
    setUserDialogItems([]);

    try {
      const data = await apiFetch('/api/user/favourites');
      const list = data.favourites || data.vehicles || [];
      setUserDialogItems(list);
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      setUserDialogError(error.message || 'Unable to load saved vehicles.');
    } finally {
      setUserDialogLoading(false);
    }
  }

  async function showSearchHistory() {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    setUserDialogTitle('Search history');
    setUserDialogMode('history');
    setUserDialogOpen(true);
    setUserDialogLoading(true);
    setUserDialogError('');
    setUserDialogItems([]);

    try {
      const data = await apiFetch('/api/user/search-history');
      setUserDialogItems(data.history || []);
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      setUserDialogError(error.message || 'Unable to load search history.');
    } finally {
      setUserDialogLoading(false);
    }
  }

  async function showSavedComparisons() {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    setUserDialogTitle('Saved comparisons');
    setUserDialogMode('comparisons');
    setUserDialogOpen(true);
    setUserDialogLoading(true);
    setUserDialogError('');
    setUserDialogItems([]);

    try {
      const data = await apiFetch('/api/user/saved-comparisons');
      setUserDialogItems(data.comparisons || []);
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      setUserDialogError(error.message || 'Unable to load comparisons.');
    } finally {
      setUserDialogLoading(false);
    }
  }

  async function saveCurrentComparison() {
    if (!getToken()) {
      openAuth('login');
      return;
    }

    if (compareVehicles.length < 2) {
      showStatus('Select at least 2 vehicles before saving a comparison.', 'error');
      return;
    }

    const defaultName = compareVehicles
      .map((vehicle) => `${vehicle.make} ${vehicle.model}`)
      .join(' vs ')
      .slice(0, 100);

    const name = window.prompt('Name this comparison:', defaultName);

    if (name === null) {
      return;
    }

    try {
      await apiFetch('/api/user/saved-comparisons', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim() || 'Vehicle comparison',
          vehicleIds: compareVehicles.map((vehicle) => vehicle.id)
        })
      });
      showStatus('Comparison saved to your account.');
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      showStatus(error.message || 'Unable to save comparison.', 'error');
    }
  }

  async function deleteSavedComparison(id) {
    try {
      await apiFetch(`/api/user/saved-comparisons/${id}`, { method: 'DELETE' });
      showSavedComparisons();
    } catch (error) {
      if (handleAccountError(error)) {
        return;
      }
      setUserDialogError(error.message || 'Unable to delete comparison.');
    }
  }

  function loadSavedComparison(comparison) {
    const list = Array.isArray(comparison.vehicles) ? comparison.vehicles : [];

    if (list.length < 2) {
      showStatus(
        'This saved comparison no longer has enough available vehicles.',
        'error'
      );
      return;
    }

    setCompareVehicles(list.slice(0, 3));
    setUserDialogOpen(false);
  }

  function runHistoryQuery(historyQuery) {
    setSearchInput(historyQuery);
    setPage(1);
    setQuery(historyQuery);
    setUserDialogOpen(false);
  }

  return (
    <>
      {/* Header */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
          <a href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-pine text-lg font-bold text-mint">
              D
            </span>
            <span className="font-display text-2xl">driveloop</span>
          </a>

          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-bold uppercase tracking-[0.22em] text-ink/50 sm:block">
              AI vehicle search
            </span>

            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <span className="hidden text-sm font-bold sm:inline">
                    Hi, {user.name}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral hover:bg-coral hover:text-white"
                    onClick={() => logout()}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-coral hover:text-coral"
                    onClick={() => openAuth('login')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-pine px-4 py-2 text-sm font-bold text-paper hover:bg-ink"
                    onClick={() => openAuth('register')}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {!isLoggedIn ? (
        <GuestLanding
          onLogin={() => openAuth('login')}
          onRegister={() => openAuth('register')}
          hasSharedLink={Boolean(
            new URLSearchParams(window.location.search).get('ids') ||
              sessionStorage.getItem('pendingCompareIds')
          )}
        />
      ) : (
      <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-10 lg:pt-16">
        {/* Hero / search */}
        <section className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-coral">
              Search + AI Advisor
            </p>
            <h1 className="max-w-3xl font-display text-5xl leading-[0.98] sm:text-7xl">
              Tell us what you want to drive.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/65">
              Search in plain English. We filter and rank cars from PostgreSQL, then
              the AI Vehicle Advisor explains your strongest matches.
            </p>
          </div>

          <div className="rounded-[2rem] bg-pine p-6 text-paper shadow-xl shadow-pine/10 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
                Ask driveloop
              </span>
              <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_0_5px_rgba(185,228,208,0.15)]" />
            </div>
            <SearchBar
              query={searchInput}
              onQueryChange={setSearchInput}
              onSearch={handleSearch}
            />
            <p className="mt-4 text-xs leading-5 text-paper/55">
              After results load, Gemini writes a short advisor note on your top cars.
            </p>
          </div>
        </section>

        {/* Example searches */}
        <section className="mt-12 border-y border-ink/10 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/45">
              Try
            </span>
            {EXAMPLE_QUERIES.map((item) => (
              <button
                key={item.query}
                type="button"
                className="rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-coral hover:text-coral"
                onClick={() => {
                  // Example chips start a fresh search (do not merge old filters).
                  setFilters({});
                  setSearchInput(item.query);
                  setPage(1);
                  setQuery(item.query);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* Logged-in user tools */}
        {isLoggedIn && (
          <section className="mt-8 rounded-3xl border border-ink/10 bg-white/50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                  Your space
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  Favourites, search history, saved searches, and comparisons —
                  plus AI Advisor notes saved with your account when you search.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-coral hover:text-coral"
                  onClick={showFavourites}
                >
                  My Favourites
                </button>
                <button
                  type="button"
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-coral hover:text-coral"
                  onClick={showSearchHistory}
                >
                  Search History
                </button>
                <button
                  type="button"
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-coral hover:text-coral"
                  onClick={showSavedSearches}
                >
                  Saved Searches
                </button>
                <button
                  type="button"
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-coral hover:text-coral"
                  onClick={showSavedComparisons}
                >
                  Saved Comparisons
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Catalogue */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">
                {query ? 'Matched results' : 'Catalogue'}
              </p>
              <h2 className="mt-2 font-display text-4xl">
                {query ? 'Your matches' : 'Explore vehicles'}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">
                {query
                  ? 'Match scores and Why-this-car reasons come from your filters. The AI Vehicle Advisor summarises the top ranked cars below.'
                  : 'Browse the live catalogue, or search in plain English to unlock filters, scores, and the AI Vehicle Advisor.'}
              </p>
              {query && (
                <button
                  type="button"
                  className="mt-3 rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine hover:bg-pine hover:text-paper"
                  onClick={saveCurrentSearch}
                >
                  Save Search
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-ink/55">
                Sort
              </label>
              <select
                id="sort-select"
                className="rounded-full border border-ink/15 bg-transparent px-4 py-2 text-sm outline-none focus:border-coral"
                value={`${sortBy}:${sortOrder}`}
                onChange={handleSortChange}
              >
                <option value="createdAt:desc">Newest</option>
                <option value="price:asc">Price: low to high</option>
                <option value="price:desc">Price: high to low</option>
                <option value="year:desc">Latest year</option>
                <option value="kmDriven:asc">Lowest kilometres</option>
                <option value="safetyRating:desc">Safety rating</option>
              </select>
            </div>
          </div>

          {status.message && (
            <div
              className={`mb-5 rounded-2xl border p-8 text-center ${
                status.type === 'error'
                  ? 'border-coral/30 bg-coral/10 text-coral'
                  : 'border-ink/10 bg-white/50 text-ink/60'
              }`}
            >
              {status.message}
            </div>
          )}

          {filtersToChips(filters).length > 0 && (
            <div className="mb-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-ink/45">
                Active filters
              </p>
              <div className="flex flex-wrap gap-2">
                {filtersToChips(filters).map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-mint/40 px-4 py-2 text-sm font-bold text-pine hover:border-coral hover:bg-coral/10 hover:text-coral"
                    onClick={() => removeFilter(chip.key)}
                    title={`Remove ${chip.label}`}
                  >
                    <span>{chip.label}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && advisorStatus !== 'idle' && (
            <div className="mb-6 rounded-3xl border border-mint/40 bg-mint/15 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-pine">
                  AI Vehicle Advisor
                </p>
                {advisorStatus === 'ready' && (
                  <span className="text-xs font-bold text-pine/70">
                    Top {Math.min(5, vehicles.length)} matches explained
                  </span>
                )}
              </div>
              {advisorStatus === 'loading' && (
                <p className="mt-3 text-sm text-ink/60">
                  AI Advisor is analyzing your results...
                </p>
              )}
              {advisorStatus === 'error' && (
                <p className="mt-3 text-sm text-ink/60">
                  AI Advisor is currently unavailable. Your vehicle results above
                  still work normally.
                </p>
              )}
              {advisorStatus === 'ready' && advisorText && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/75">
                  {advisorText}
                </p>
              )}
            </div>
          )}

          <VehicleList
            vehicles={vehicles}
            filters={filters}
            compareVehicles={compareVehicles}
            favouriteIds={favouriteIds}
            onView={loadDetail}
            onCompare={toggleCompare}
            onFavourite={toggleFavourite}
          />

          {/* Compare section */}
          {compareVehicles.length >= 2 && (
            <div className="mt-12">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">
                    Vehicle comparison
                  </p>
                  <h2 className="mt-2 font-display text-4xl">
                    Compare your choices
                  </h2>
                </div>
                <span className="rounded-full bg-mint px-4 py-2 text-sm font-bold text-pine">
                  {compareVehicles.length}/3 selected
                </span>
              </div>

              <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white/60">
                <div className="flex flex-col gap-4 border-b border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-pine">
                      {compareVehicles.length} vehicles selected
                    </p>
                    <p className="mt-1 text-xs text-ink/45">
                      Compare the important specifications side by side.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine transition hover:bg-pine hover:text-paper"
                      onClick={shareComparison}
                    >
                      Share comparison
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-pine px-4 py-2 text-sm font-bold text-paper transition hover:bg-ink"
                      onClick={saveCurrentComparison}
                    >
                      Save comparison
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral transition hover:bg-coral hover:text-white"
                      onClick={clearComparison}
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/10">
                        <th className="min-w-[160px] px-5 py-4 font-bold">
                          Specification
                        </th>
                        {compareVehicles.map((vehicle) => (
                          <th key={vehicle.id} className="min-w-[220px] px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <img
                                  src={getVehicleImage(vehicle)}
                                  alt={`${vehicle.make} ${vehicle.model}`}
                                  className="mb-3 h-24 w-full rounded-xl object-cover"
                                  onError={(event) => {
                                    event.currentTarget.src = getPlaceholderImage(vehicle.bodyType, vehicle.id);
                                  }}
                                />
                                <p className="text-xs font-bold uppercase tracking-[0.15em] text-coral">
                                  {vehicle.make}
                                </p>
                                <p className="mt-1 text-lg font-bold text-ink">
                                  {vehicle.model}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="text-xl text-coral transition hover:scale-110"
                                aria-label="Remove vehicle"
                                onClick={() => toggleCompare(vehicle)}
                              >
                                ×
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARE_ROWS.map(([label, getter]) => (
                        <tr
                          key={label}
                          className="border-b border-ink/10 last:border-0"
                        >
                          <td className="px-5 py-4 font-bold text-ink/55">
                            {label}
                          </td>
                          {compareVehicles.map((vehicle) => (
                            <td
                              key={`${label}-${vehicle.id}`}
                              className="px-5 py-4 text-ink/75"
                            >
                              {getter(vehicle)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-b border-ink/10 last:border-0">
                        <td className="px-5 py-4 font-bold text-ink/55">
                          Est. EMI (20% down, 9%, 5 yrs)
                        </td>
                        {compareVehicles.map((vehicle) => {
                          const loan = Math.max(Number(vehicle.price) * 0.8, 0);
                          const emi = calculateEMI(loan, 9, 5);
                          return (
                            <td
                              key={`emi-${vehicle.id}`}
                              className="px-5 py-4 font-bold text-pine"
                            >
                              {money(emi)} / mo
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm text-ink/55">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-ink/15 px-4 py-2 text-sm disabled:opacity-30"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-full bg-pine px-4 py-2 text-sm text-paper disabled:opacity-30"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      )}

      {/* Auth dialog */}
      {authOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pine/50 p-4"
          onClick={() => setAuthOpen(false)}
        >
          <div
            className="w-[min(92vw,460px)] rounded-3xl bg-paper p-7 text-ink shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                  {authMode === 'register' ? 'Create account' : 'Login'}
                </p>
                <h2 className="mt-2 font-display text-4xl">
                  {authMode === 'register' ? 'Join driveloop' : 'Welcome back'}
                </h2>
              </div>
              <button
                type="button"
                className="text-2xl text-ink/45 hover:text-ink"
                aria-label="Close"
                onClick={() => setAuthOpen(false)}
              >
                ×
              </button>
            </div>

            <form key={authMode} className="mt-8 space-y-4" onSubmit={submitAuth} autoComplete="on">
              {authMode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="mb-1 block text-sm text-ink/60"
                  >
                    Name
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    required
                    minLength={2}
                    autoComplete="name"
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pine"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1 block text-sm text-ink/60"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pine"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1 block text-sm text-ink/60"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pine"
                />
              </div>

              {authMessage && (
                <p
                  className={`rounded-2xl p-3 text-sm ${
                    authMessage.startsWith('Account created')
                      ? 'bg-mint/30 text-pine'
                      : 'bg-coral/10 text-coral'
                  }`}
                >
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-pine px-5 py-3 font-bold text-paper hover:bg-ink"
              >
                {authMode === 'register' ? 'Create account' : 'Login'}
              </button>
            </form>

            <button
              type="button"
              className="mt-5 text-sm text-pine underline"
              onClick={() =>
                openAuth(authMode === 'login' ? 'register' : 'login')
              }
            >
              {authMode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      )}

      {/* User tools dialog */}
      {isLoggedIn && userDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pine/50 p-4"
          onClick={() => setUserDialogOpen(false)}
        >
          <div
            className="max-h-[85vh] w-[min(94vw,900px)] overflow-y-auto rounded-3xl bg-paper p-7 text-ink shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                  {userDialogTitle}
                </p>
                <h2 className="mt-2 font-display text-4xl">
                  {userDialogMode === 'favourites' && 'Your saved vehicles'}
                  {userDialogMode === 'history' && 'Your recent searches'}
                  {userDialogMode === 'saved-searches' && 'Your saved search alerts'}
                  {userDialogMode === 'comparisons' && 'Your saved comparisons'}
                </h2>
              </div>
              <button
                type="button"
                className="text-2xl text-ink/45 hover:text-ink"
                aria-label="Close"
                onClick={() => setUserDialogOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="mt-8">
              {userDialogLoading && (
                <p className="text-ink/55">Loading...</p>
              )}

              {userDialogError && (
                <p className="text-coral">{userDialogError}</p>
              )}

              {!userDialogLoading &&
                !userDialogError &&
                userDialogItems.length === 0 && (
                  <div className="rounded-2xl border border-ink/10 bg-white/50 p-6 text-center">
                    <p className="font-bold">Nothing here yet.</p>
                    <p className="mt-2 text-sm text-ink/55">
                      {userDialogMode === 'favourites' &&
                        'Tap the heart on any vehicle to save it here.'}
                      {userDialogMode === 'history' &&
                        'Your logged-in vehicle searches will appear here.'}
                      {userDialogMode === 'saved-searches' &&
                        'Save a search after you run it to check it again later.'}
                      {userDialogMode === 'comparisons' &&
                        'Select two or three vehicles and save the comparison.'}
                    </p>
                  </div>
                )}

              {userDialogMode === 'favourites' &&
                userDialogItems.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="mb-3 rounded-2xl border border-ink/10 bg-white/60 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-coral">
                          {vehicle.make}
                        </p>
                        <h3 className="mt-1 text-lg font-bold">{vehicle.model}</h3>
                        <p className="text-sm text-ink/55">
                          {vehicle.variant} · {money(vehicle.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                          onClick={() => {
                            setUserDialogOpen(false);
                            loadDetail(vehicle.id);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral"
                          onClick={async () => {
                            await toggleFavourite(vehicle.id);
                            showFavourites();
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {userDialogMode === 'history' &&
                userDialogItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="mb-3 w-full rounded-2xl border border-ink/10 bg-white/60 p-4 text-left transition hover:border-pine"
                    onClick={() => runHistoryQuery(item.query)}
                  >
                    <p className="font-bold">{item.query}</p>
                    <p className="mt-1 text-xs text-ink/45">
                      {new Date(
                        item.createdAt || item.created_at
                      ).toLocaleString('en-IN')}
                    </p>
                  </button>
                ))}

              {userDialogMode === 'saved-searches' &&
                userDialogItems.map((item) => (
                  <div
                    key={item.id}
                    className="mb-3 rounded-2xl border border-ink/10 bg-white/60 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">{item.searchText}</p>
                        <p className="mt-1 text-xs text-ink/45">
                          {new Date(
                            item.createdAt || item.created_at
                          ).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                          onClick={() => runSavedSearch(item)}
                        >
                          Check Now
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral"
                          onClick={() => deleteSavedSearch(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {userDialogMode === 'comparisons' &&
                userDialogItems.map((comparison) => (
                  <div
                    key={comparison.id}
                    className="mb-3 rounded-2xl border border-ink/10 bg-white/60 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">{comparison.name}</p>
                        <p className="mt-1 text-sm text-ink/55">
                          {Array.isArray(comparison.vehicles)
                            ? comparison.vehicles
                                .map((v) => `${v.make} ${v.model}`)
                                .join(' · ')
                            : 'Saved vehicle set'}
                        </p>
                        <p className="mt-1 text-xs text-ink/45">
                          {new Date(
                            comparison.createdAt || comparison.created_at
                          ).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {Array.isArray(comparison.vehicles) &&
                          comparison.vehicles.length >= 2 && (
                          <button
                            type="button"
                            className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                            onClick={() => loadSavedComparison(comparison)}
                          >
                            Load
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral"
                          onClick={() => deleteSavedComparison(comparison.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Vehicle detail dialog */}
      {isLoggedIn && detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pine/50 p-4"
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="w-[min(92vw,620px)] rounded-3xl bg-paper p-7 text-ink shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {detailLoading && (
              <p className="p-8 text-center text-ink/60">Loading details...</p>
            )}

            {detailError && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-coral">{detailError}</p>
                <button
                  type="button"
                  className="text-2xl text-ink/45"
                  onClick={() => setDetailOpen(false)}
                >
                  ×
                </button>
              </div>
            )}

            {detailVehicle && (
              <>
                <div className="mb-5 overflow-hidden rounded-2xl bg-pine/10">
                  <img
                    src={getVehicleImage(detailVehicle)}
                    alt={`${detailVehicle.make} ${detailVehicle.model}`}
                    className="h-48 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = getPlaceholderImage(detailVehicle.bodyType, detailVehicle.id);
                    }}
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                      {detailVehicle.make}
                    </p>
                    <h2 className="mt-1 font-display text-4xl">
                      {detailVehicle.model}
                    </h2>
                    <p className="mt-1 text-ink/55">{detailVehicle.variant}</p>
                  </div>
                  <button
                    type="button"
                    className="text-2xl text-ink/45"
                    aria-label="Close"
                    onClick={() => setDetailOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-coral/40 px-4 py-2 text-sm font-bold text-coral hover:bg-coral hover:text-white"
                    onClick={async () => {
                      await toggleFavourite(detailVehicle.id);
                      setDetailOpen(false);
                    }}
                  >
                    {favouriteIds.includes(detailVehicle.id)
                      ? '♥ Remove favourite'
                      : '♡ Add favourite'}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine hover:bg-pine hover:text-paper"
                    onClick={() => {
                      toggleCompare(detailVehicle);
                      setDetailOpen(false);
                    }}
                  >
                    {compareVehicles.some((item) => item.id === detailVehicle.id)
                      ? 'Selected'
                      : 'Compare'}
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-5 border-y border-ink/10 py-6 text-sm">
                  <div>
                    <p className="text-ink/45">Price</p>
                    <strong className="mt-1 block text-xl">
                      {money(detailVehicle.price)}
                    </strong>
                    {detailVehicle.similarAveragePrice != null && (
                      <p className="mt-1 text-ink/55">
                        Similar avg: {formatLakh(detailVehicle.similarAveragePrice)}
                      </p>
                    )}
                    {getPriceInsightText(detailVehicle) && (
                      <p className="mt-1 font-bold text-pine">
                        {getPriceInsightText(detailVehicle)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-ink/45">Location</p>
                    <strong className="mt-1 block">{detailVehicle.city}</strong>
                  </div>
                  <div>
                    <p className="text-ink/45">Safety rating</p>
                    <strong className="mt-1 block">
                      {detailVehicle.safetyRating} / 5
                    </strong>
                  </div>
                  <div>
                    <p className="text-ink/45">Ownership</p>
                    <strong className="mt-1 block">
                      {detailVehicle.ownership} owner(s)
                    </strong>
                  </div>
                  <div>
                    <p className="text-ink/45">Mileage</p>
                    <strong className="mt-1 block">{detailVehicle.mileage}</strong>
                  </div>
                  <div>
                    <p className="text-ink/45">Kilometres</p>
                    <strong className="mt-1 block">
                      {Number(detailVehicle.kmDriven).toLocaleString('en-IN')} km
                    </strong>
                  </div>
                  <div>
                    <p className="text-ink/45">Fuel</p>
                    <strong className="mt-1 block">
                      {detailVehicle.fuelType}
                    </strong>
                  </div>
                  <div>
                    <p className="text-ink/45">Transmission</p>
                    <strong className="mt-1 block">
                      {detailVehicle.transmission}
                    </strong>
                  </div>
                </div>

                <div className="mt-6">
                  <EmiCalculator
                    key={detailVehicle.id}
                    vehiclePrice={detailVehicle.price}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
