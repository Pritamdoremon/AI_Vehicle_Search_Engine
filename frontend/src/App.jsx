import { useEffect, useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import VehicleList from './components/VehicleList.jsx';
import { money } from './components/VehicleCard.jsx';

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

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  let data = {};
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
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

  // Compare / favourites
  const [compareVehicles, setCompareVehicles] = useState([]);
  const [favouriteIds, setFavouriteIds] = useState([]);

  // Auth
  const [user, setUser] = useState(getStoredUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
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

  // Load catalogue / search results whenever page, sort, or query changes
  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortOrder, query]);

  // On first load, refresh favourites if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadFavouriteIds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const options = query
      ? {
          method: 'POST',
          body: JSON.stringify({
            query,
            page,
            limit,
            sortBy,
            sortOrder
          })
        }
      : {};

    try {
      const data = await apiFetch(url, options);
      hideStatus();
      setVehicles(data.vehicles || []);
      setTotalPages(data.totalPages || 0);

      if (!data.vehicles || data.vehicles.length === 0) {
        showStatus(
          'No vehicles match this search. Try changing the budget, city, or vehicle type.'
        );
      }
    } catch (error) {
      showStatus(error.message || 'Unable to load vehicles.', 'error');
      setTotalPages(0);
    }
  }

  function handleSearch() {
    const nextQuery = searchInput.trim();
    setPage(1);
    setQuery(nextQuery);

    if (nextQuery) {
      saveSearchHistory(nextQuery);
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
    setAuthName('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthOpen(true);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthMessage('');

    try {
      const isRegister = authMode === 'register';
      const body = isRegister
        ? {
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword
          }
        : {
            email: authEmail.trim(),
            password: authPassword
          };

      const data = await apiFetch(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      setUser(data.user);
      setAuthOpen(false);
      await loadFavouriteIds();
    } catch (error) {
      setAuthMessage(error.message || 'Authentication failed.');
    }
  }

  function logout(clearStatus = true) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
    setFavouriteIds([]);
    if (clearStatus) {
      hideStatus();
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
      showStatus(error.message || 'Unable to save comparison.', 'error');
    }
  }

  async function deleteSavedComparison(id) {
    try {
      await apiFetch(`/api/user/saved-comparisons/${id}`, { method: 'DELETE' });
      showSavedComparisons();
    } catch (error) {
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

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-10 lg:pt-16">
        {/* Hero / search */}
        <section className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-coral">
              Find your next drive
            </p>
            <h1 className="max-w-3xl font-display text-5xl leading-[0.98] sm:text-7xl">
              Tell us what you want to drive.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/65">
              Search the catalogue like you would ask a friend. Budget, city,
              fuel, seats, safety, and more.
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
                onClick={() => setSearchInput(item.query)}
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
                  Keep your favourite cars, searches and comparisons in one place.
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
                Catalogue
              </p>
              <h2 className="mt-2 font-display text-4xl">
                {query ? 'Your matches' : 'Explore vehicles'}
              </h2>
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

          <VehicleList
            vehicles={vehicles}
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

            <form className="mt-8 space-y-4" onSubmit={submitAuth}>
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
                    type="text"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
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
                  type="email"
                  required
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
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
                  type="password"
                  required
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pine"
                />
              </div>

              {authMessage && (
                <p className="rounded-2xl bg-coral/10 p-3 text-sm text-coral">
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
      {userDialogOpen && (
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
                        {Array.isArray(comparison.vehicles) && (
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
      {detailOpen && (
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
