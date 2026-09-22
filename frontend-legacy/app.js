const state = {
  query: '',
  page: 1,
  limit: 9,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  compareVehicles: [],
  favouriteIds: new Set()
};

const grid = document.querySelector('#vehicle-grid');
const statusBox = document.querySelector('#status');
const pagination = document.querySelector('#pagination');
const searchInput = document.querySelector('#search-input');
const resultTitle = document.querySelector('#result-title');
const compareSection = document.querySelector('#compare-section');
const compareTable = document.querySelector('#compare-table');
const compareCount = document.querySelector('#compare-count');

const authDialog = document.querySelector('#auth-dialog');
const authForm = document.querySelector('#auth-form');
const authTitle = document.querySelector('#auth-title');
const authSubmit = document.querySelector('#auth-submit');
const authMessage = document.querySelector('#auth-message');
const authName = document.querySelector('#auth-name');
const authEmail = document.querySelector('#auth-email');
const authPassword = document.querySelector('#auth-password');
const nameField = document.querySelector('#name-field');
const authActions = document.querySelector('#auth-actions');

const userTools = document.querySelector('#user-tools');
const favouritesButton = document.querySelector('#favourites-button');
const historyButton = document.querySelector('#history-button');
const savedComparisonsButton = document.querySelector(
  '#saved-comparisons-button'
);

const userDialog = document.querySelector('#user-dialog');
const userDialogTitle = document.querySelector('#user-dialog-title');
const userDialogContent = document.querySelector('#user-dialog-content');

let authMode = 'login';


function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function getToken() {
  return localStorage.getItem('authToken');
}


function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem('authUser') || 'null'
    );
  } catch {
    return null;
  }
}


async function apiFetch(url, options = {}) {
  const token = getToken();

  const headers = new Headers(
    options.headers || {}
  );

  if (!headers.has('Content-Type') && options.body) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`
    );
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = {};

  const contentType =
    response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (response.status === 401 && token) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');

    state.favouriteIds = new Set();

    updateAuthUI();
  }

  if (!response.ok) {
    throw new Error(
      data.error || 'Request failed.'
    );
  }

  return data;
}


function showAuthMessage(
  message,
  type = 'error'
) {
  authMessage.textContent = message;

  if (type === 'error') {
    authMessage.className =
      'rounded-2xl bg-coral/10 p-3 text-sm text-coral';
  } else {
    authMessage.className =
      'rounded-2xl bg-mint/40 p-3 text-sm text-pine';
  }

  authMessage.classList.remove('hidden');
}


function openAuth(mode) {
  authMode = mode;

  const isRegister =
    mode === 'register';

  authTitle.textContent = isRegister
    ? 'Create account'
    : 'Login';

  authSubmit.textContent = isRegister
    ? 'Create account'
    : 'Login';

  nameField.classList.toggle(
    'hidden',
    !isRegister
  );

  authMessage.classList.add('hidden');

  authForm.reset();

  authDialog.showModal();
}


function closeAuth() {
  authDialog.close();
}


async function submitAuth(event) {
  event.preventDefault();

  try {
    const isRegister =
      authMode === 'register';

    const body = isRegister
      ? {
          name: authName.value.trim(),
          email: authEmail.value.trim(),
          password: authPassword.value
        }
      : {
          email: authEmail.value.trim(),
          password: authPassword.value
        };

    const data = await apiFetch(
      isRegister
        ? '/api/auth/register'
        : '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );

    localStorage.setItem(
      'authToken',
      data.token
    );

    localStorage.setItem(
      'authUser',
      JSON.stringify(data.user)
    );

    closeAuth();

    updateAuthUI();

    await loadFavouriteIds();
  } catch (error) {
    showAuthMessage(
      error.message || 'Authentication failed.'
    );
  }
}


function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');

  state.favouriteIds = new Set();

  updateAuthUI();

  refreshVehicleCards();
}


function updateAuthUI() {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    authActions.innerHTML = `
      <button
        id="login-button"
        type="button"
        class="rounded-full border border-ink/15 px-4 py-2 text-sm font-bold hover:border-coral hover:text-coral"
      >
        Login
      </button>

      <button
        id="register-button"
        type="button"
        class="rounded-full bg-pine px-4 py-2 text-sm font-bold text-paper hover:bg-ink"
      >
        Register
      </button>
    `;

    userTools?.classList.add('hidden');

    document
      .querySelector('#login-button')
      ?.addEventListener(
        'click',
        () => openAuth('login')
      );

    document
      .querySelector('#register-button')
      ?.addEventListener(
        'click',
        () => openAuth('register')
      );

    return;
  }

  authActions.innerHTML = `
    <span class="hidden text-sm font-bold sm:inline">
      Hi, ${escapeHTML(user.name)}
    </span>

    <button
      id="logout-button"
      type="button"
      class="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral hover:bg-coral hover:text-white"
    >
      Logout
    </button>
  `;

  userTools?.classList.remove('hidden');

  document
    .querySelector('#logout-button')
    ?.addEventListener(
      'click',
      logout
    );

  void loadFavouriteIds();
}


function money(value) {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }
  ).format(value);
}


function showStatus(
  message,
  type = 'info'
) {
  statusBox.className =
    `rounded-2xl border p-8 text-center ${
      type === 'error'
        ? 'border-coral/30 bg-coral/10 text-coral'
        : 'border-ink/10 bg-white/50 text-ink/60'
    }`;

  statusBox.textContent = message;

  statusBox.classList.remove('hidden');
}


function hideStatus() {
  statusBox.classList.add('hidden');
}


function vehicleCard(vehicle) {
  const isSelected =
    state.compareVehicles.some(
      item => item.id === vehicle.id
    );

  const isFavourite =
    state.favouriteIds.has(vehicle.id);

  return `
    <article
      class="group flex flex-col justify-between rounded-3xl border border-ink/10 bg-white/55 p-5 transition hover:-translate-y-1 hover:border-mint hover:bg-white"
    >

      <div>
        <div class="mb-8 flex items-start justify-between">
          <span
            class="rounded-full bg-mint/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pine"
          >
            ${escapeHTML(vehicle.bodyType)}
          </span>

          <span class="text-sm text-ink/45">
            ${escapeHTML(vehicle.year)}
          </span>
        </div>

        <p
          class="text-xs font-bold uppercase tracking-[0.18em] text-coral"
        >
          ${escapeHTML(vehicle.make)}
        </p>

        <h3 class="mt-1 font-display text-3xl">
          ${escapeHTML(vehicle.model)}
        </h3>

        <p class="mt-1 text-sm text-ink/55">
          ${escapeHTML(vehicle.variant)}
        </p>

        <p class="mt-5 text-2xl font-bold">
          ${money(vehicle.price)}
        </p>

        <div
          class="mt-5 grid grid-cols-2 gap-y-3 border-t border-ink/10 pt-4 text-sm text-ink/65"
        >
          <span>${escapeHTML(vehicle.fuelType)}</span>
          <span>${escapeHTML(vehicle.transmission)}</span>

          <span>
            ${Number(
              vehicle.kmDriven
            ).toLocaleString('en-IN')} km
          </span>

          <span>
            ${escapeHTML(vehicle.seatingCapacity)} seats
          </span>
        </div>
      </div>

      <div
        class="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-4"
      >

        <button
          class="detail-button text-left text-sm font-bold text-pine"
          data-id="${vehicle.id}"
        >
          View details
          <span class="text-xl">→</span>
        </button>

        <div class="flex items-center gap-2">

          <button
            class="favourite-button rounded-full border px-3 py-2 text-sm font-bold transition ${
              isFavourite
                ? 'border-coral bg-coral text-white'
                : 'border-coral/40 text-coral hover:bg-coral hover:text-white'
            }"
            data-id="${vehicle.id}"
            title="${
              isFavourite
                ? 'Remove from favourites'
                : 'Add to favourites'
            }"
          >
            ${isFavourite ? '♥' : '♡'}
          </button>

          <button
            class="compare-button rounded-full border px-4 py-2 text-sm font-bold transition ${
              isSelected
                ? 'border-pine bg-pine text-paper'
                : 'border-pine text-pine hover:bg-pine hover:text-paper'
            }"
            data-id="${vehicle.id}"
          >
            ${isSelected ? 'Selected' : 'Compare'}
          </button>

        </div>

      </div>

    </article>
  `;
}


function renderPagination(data) {
  if (
    !data.totalPages ||
    data.totalPages <= 1
  ) {
    pagination.innerHTML = '';
    return;
  }

  pagination.innerHTML = `
    <span class="text-sm text-ink/55">
      Page ${data.page} of ${data.totalPages}
    </span>

    <div class="flex gap-2">
      <button
        id="previous-page"
        class="rounded-full border border-ink/15 px-4 py-2 text-sm disabled:opacity-30"
        ${data.page === 1 ? 'disabled' : ''}
      >
        Previous
      </button>

      <button
        id="next-page"
        class="rounded-full bg-pine px-4 py-2 text-sm text-paper disabled:opacity-30"
        ${data.page === data.totalPages ? 'disabled' : ''}
      >
        Next
      </button>
    </div>
  `;

  document
    .querySelector('#previous-page')
    ?.addEventListener(
      'click',
      () => {
        state.page--;

        loadVehicles();
      }
    );

  document
    .querySelector('#next-page')
    ?.addEventListener(
      'click',
      () => {
        state.page++;

        loadVehicles();
      }
    );
}


function updateCompareCount() {
  if (!compareCount) return;

  const count =
    state.compareVehicles.length;

  compareCount.textContent =
    `${count}/3 selected`;

  compareCount.classList.toggle(
    'hidden',
    count === 0
  );

  const saveButton = document.querySelector(
    '#save-comparison-button'
  );

  if (saveButton) {
    saveButton.disabled = count < 2;

    saveButton.classList.toggle(
      'opacity-40',
      count < 2
    );

    saveButton.classList.toggle(
      'cursor-not-allowed',
      count < 2
    );
  }
}


function addVehicleToCompare(vehicle) {
  if (!vehicle) return;

  const alreadySelected =
    state.compareVehicles.some(
      item => item.id === vehicle.id
    );

  if (alreadySelected) {
    removeFromCompare(vehicle.id);
    return;
  }

  if (
    state.compareVehicles.length >= 3
  ) {
    showStatus(
      'You can compare up to 3 vehicles at a time.',
      'error'
    );

    return;
  }

  hideStatus();

  state.compareVehicles.push(vehicle);

  updateCompareCount();

  renderCompare();

  refreshVehicleCards();
}


function addToCompare(vehicleId) {
  const vehicle =
    window.currentVehicles?.find(
      item => item.id === vehicleId
    );

  if (!vehicle) {
    showStatus(
      'Open a vehicle from the current catalogue before comparing it.',
      'error'
    );

    return;
  }

  addVehicleToCompare(vehicle);
}


function removeFromCompare(vehicleId) {
  state.compareVehicles =
    state.compareVehicles.filter(
      vehicle => vehicle.id !== vehicleId
    );

  updateCompareCount();

  renderCompare();

  refreshVehicleCards();
}


function clearComparison() {
  state.compareVehicles = [];

  updateCompareCount();

  renderCompare();

  refreshVehicleCards();
}


function refreshVehicleCards() {
  if (!window.currentVehicles) {
    return;
  }

  grid.innerHTML =
    window.currentVehicles
      .map(vehicleCard)
      .join('');

  attachVehicleButtons();
}


function renderCompare() {
  if (
    state.compareVehicles.length < 2
  ) {
    compareSection.classList.add(
      'hidden'
    );

    compareTable.innerHTML = '';

    return;
  }

  compareSection.classList.remove(
    'hidden'
  );

  const rows = [
    [
      'Make / Model',
      vehicle =>
        `${vehicle.make} ${vehicle.model}`
    ],

    [
      'Variant',
      vehicle => vehicle.variant
    ],

    [
      'Price',
      vehicle => money(vehicle.price)
    ],

    [
      'Year',
      vehicle => vehicle.year
    ],

    [
      'Fuel Type',
      vehicle => vehicle.fuelType
    ],

    [
      'Transmission',
      vehicle => vehicle.transmission
    ],

    [
      'Body Type',
      vehicle => vehicle.bodyType
    ],

    [
      'KM Driven',
      vehicle =>
        `${Number(
          vehicle.kmDriven
        ).toLocaleString('en-IN')} km`
    ],

    [
      'Safety Rating',
      vehicle =>
        `${vehicle.safetyRating} / 5`
    ],

    [
      'Seating Capacity',
      vehicle =>
        `${vehicle.seatingCapacity} seats`
    ],

    [
      'Mileage',
      vehicle => vehicle.mileage
    ],

    [
      'City',
      vehicle => vehicle.city
    ],

    [
      'Ownership',
      vehicle =>
        `${vehicle.ownership} owner(s)`
    ]
  ];

  compareTable.innerHTML = `
    <div
      class="flex flex-col gap-4 border-b border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >

      <div>
        <p class="text-sm font-bold text-pine">
          ${state.compareVehicles.length}
          vehicles selected
        </p>

        <p class="mt-1 text-xs text-ink/45">
          Compare the important specifications side by side.
        </p>
      </div>

      <div class="flex items-center gap-2">

        <button
          id="save-comparison-button"
          class="rounded-full bg-pine px-4 py-2 text-sm font-bold text-paper transition hover:bg-ink"
        >
          Save comparison
        </button>

        <button
          id="clear-comparison"
          class="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral transition hover:bg-coral hover:text-white"
        >
          Clear all
        </button>

      </div>

    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">

        <thead>
          <tr class="border-b border-ink/10">

            <th
              class="min-w-[160px] px-5 py-4 font-bold"
            >
              Specification
            </th>

            ${state.compareVehicles
              .map(
                vehicle => `
                  <th class="min-w-[220px] px-5 py-4">

                    <div
                      class="flex items-start justify-between gap-4"
                    >

                      <div>

                        <p
                          class="text-xs font-bold uppercase tracking-[0.15em] text-coral"
                        >
                          ${escapeHTML(
                            vehicle.make
                          )}
                        </p>

                        <p
                          class="mt-1 text-lg font-bold text-ink"
                        >
                          ${escapeHTML(
                            vehicle.model
                          )}
                        </p>

                      </div>

                      <button
                        class="remove-compare text-xl text-coral transition hover:scale-110"
                        data-id="${vehicle.id}"
                        aria-label="Remove vehicle"
                        title="Remove"
                      >
                        ×
                      </button>

                    </div>

                  </th>
                `
              )
              .join('')}

          </tr>
        </thead>

        <tbody>
          ${rows
            .map(
              ([label, getter]) => `
                <tr
                  class="border-b border-ink/10 last:border-0"
                >

                  <td
                    class="px-5 py-4 font-bold text-ink/55"
                  >
                    ${escapeHTML(label)}
                  </td>

                  ${state.compareVehicles
                    .map(
                      vehicle => `
                        <td
                          class="px-5 py-4 text-ink/75"
                        >
                          ${escapeHTML(
                            getter(vehicle)
                          )}
                        </td>
                      `
                    )
                    .join('')}

                </tr>
              `
            )
            .join('')}
        </tbody>

      </table>
    </div>
  `;

  document
    .querySelector('#clear-comparison')
    ?.addEventListener(
      'click',
      clearComparison
    );

  document
    .querySelector('#save-comparison-button')
    ?.addEventListener(
      'click',
      saveCurrentComparison
    );

  document
    .querySelectorAll('.remove-compare')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          removeFromCompare(
            Number(button.dataset.id)
          );
        }
      );
    });

  updateCompareCount();
}


function attachVehicleButtons() {
  document
    .querySelectorAll('.detail-button')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          loadDetail(
            button.dataset.id
          );
        }
      );
    });

  document
    .querySelectorAll('.compare-button')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          addToCompare(
            Number(button.dataset.id)
          );
        }
      );
    });

  document
    .querySelectorAll('.favourite-button')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          toggleFavourite(
            Number(button.dataset.id)
          );
        }
      );
    });
}


async function loadVehicles() {
  showStatus(
    'Loading vehicles...'
  );

  grid.innerHTML = '';

  const params =
    new URLSearchParams({
      page: state.page,
      limit: state.limit,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder
    });

  const url = state.query
    ? '/api/vehicles/search'
    : `/api/vehicles?${params}`;

  const options = state.query
    ? {
        method: 'POST',

        body: JSON.stringify({
          query: state.query,
          page: state.page,
          limit: state.limit,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder
        })
      }
    : {};

  try {
    const data =
      await apiFetch(
        url,
        options
      );

    hideStatus();

    resultTitle.textContent =
      state.query
        ? 'Your matches'
        : 'Explore vehicles';

    if (
      !data.vehicles.length
    ) {
      showStatus(
        'No vehicles match this search. Try changing the budget, city, or vehicle type.'
      );
    }

    window.currentVehicles =
      data.vehicles;

    grid.innerHTML =
      data.vehicles
        .map(vehicleCard)
        .join('');

    renderPagination(data);

    attachVehicleButtons();

    updateCompareCount();

    renderCompare();
  } catch (error) {
    showStatus(
      error.message ||
        'Unable to load vehicles.',
      'error'
    );

    pagination.innerHTML = '';
  }
}


async function loadDetail(id) {
  const dialog =
    document.querySelector(
      '#vehicle-dialog'
    );

  const detail =
    document.querySelector(
      '#vehicle-detail'
    );

  detail.innerHTML = `
    <p class="p-8 text-center text-ink/60">
      Loading details...
    </p>
  `;

  dialog.showModal();

  try {
    const vehicle =
      await apiFetch(
        `/api/vehicles/${id}`
      );

    const isFavourite =
      state.favouriteIds.has(
        vehicle.id
      );

    detail.innerHTML = `
      <div
        class="flex items-start justify-between gap-4"
      >

        <div>

          <p
            class="text-xs font-bold uppercase tracking-[0.18em] text-coral"
          >
            ${escapeHTML(
              vehicle.make
            )}
          </p>

          <h2
            class="mt-1 font-display text-4xl"
          >
            ${escapeHTML(
              vehicle.model
            )}
          </h2>

          <p class="mt-1 text-ink/55">
            ${escapeHTML(
              vehicle.variant
            )}
          </p>

        </div>

        <button
          id="close-dialog"
          class="text-2xl text-ink/45"
          aria-label="Close"
        >
          ×
        </button>

      </div>

      <div class="mt-5 flex items-center gap-2">

        <button
          id="detail-favourite"
          class="rounded-full border border-coral/40 px-4 py-2 text-sm font-bold text-coral hover:bg-coral hover:text-white"
        >
          ${
            isFavourite
              ? '♥ Remove favourite'
              : '♡ Add favourite'
          }
        </button>

        <button
          id="detail-compare"
          class="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine hover:bg-pine hover:text-paper"
        >
          ${
            state.compareVehicles.some(
              item =>
                item.id === vehicle.id
            )
              ? 'Selected'
              : 'Compare'
          }
        </button>

      </div>

      <div
        class="mt-8 grid grid-cols-2 gap-5 border-y border-ink/10 py-6 text-sm"
      >

        <div>
          <p class="text-ink/45">
            Price
          </p>

          <strong
            class="mt-1 block text-xl"
          >
            ${money(vehicle.price)}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Location
          </p>

          <strong
            class="mt-1 block"
          >
            ${escapeHTML(
              vehicle.city
            )}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Safety rating
          </p>

          <strong
            class="mt-1 block"
          >
            ${escapeHTML(
              vehicle.safetyRating
            )} / 5
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Ownership
          </p>

          <strong
            class="mt-1 block"
          >
            ${escapeHTML(
              vehicle.ownership
            )} owner(s)
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Mileage
          </p>

          <strong
            class="mt-1 block"
          >
            ${escapeHTML(
              vehicle.mileage
            )}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Kilometres
          </p>

          <strong
            class="mt-1 block"
          >
            ${Number(
              vehicle.kmDriven
            ).toLocaleString(
              'en-IN'
            )} km
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Fuel
          </p>

          <strong
            class="mt-1 block"
          >
            ${escapeHTML(
              vehicle.fuelType
            )}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">
            Transmission
          </p>

          <strong
            class="mt-1 block"
          >
            ${escapeHTML(
              vehicle.transmission
            )}
          </strong>
        </div>

      </div>
    `;

    document
      .querySelector(
        '#close-dialog'
      )
      ?.addEventListener(
        'click',
        () => {
          dialog.close();
        }
      );

    document
      .querySelector(
        '#detail-favourite'
      )
      ?.addEventListener(
        'click',
        async () => {
          await toggleFavourite(
            vehicle.id
          );

          dialog.close();
        }
      );

    document
      .querySelector(
        '#detail-compare'
      )
      ?.addEventListener(
        'click',
        () => {
          addVehicleToCompare(
            vehicle
          );

          dialog.close();
        }
      );
  } catch (error) {
    detail.innerHTML = `
      <div
        class="flex items-center justify-between gap-4"
      >
        <p class="text-coral">
          ${escapeHTML(
            error.message
          )}
        </p>

        <button
          id="close-dialog"
          class="text-2xl text-ink/45"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    `;

    document
      .querySelector(
        '#close-dialog'
      )
      ?.addEventListener(
        'click',
        () => dialog.close()
      );
  }
}


async function loadFavouriteIds() {
  if (!getToken()) {
    state.favouriteIds =
      new Set();

    refreshVehicleCards();

    return;
  }

  try {
    const data =
      await apiFetch(
        '/api/user/favourites'
      );

    state.favouriteIds =
      new Set(
        data.favourites.map(
          vehicle =>
            Number(vehicle.id)
        )
      );

    refreshVehicleCards();
  } catch {
    state.favouriteIds =
      new Set();

    refreshVehicleCards();
  }
}


async function toggleFavourite(
  vehicleId
) {
  if (!getToken()) {
    openAuth('login');
    return;
  }

  try {
    const isFavourite =
      state.favouriteIds.has(
        vehicleId
      );

    if (isFavourite) {
      await apiFetch(
        `/api/user/favourites/${vehicleId}`,
        {
          method: 'DELETE'
        }
      );

      state.favouriteIds.delete(
        vehicleId
      );
    } else {
      await apiFetch(
        '/api/user/favourites',
        {
          method: 'POST',
          body: JSON.stringify({
            vehicleId
          })
        }
      );

      state.favouriteIds.add(
        vehicleId
      );
    }

    refreshVehicleCards();
  } catch (error) {
    showStatus(
      error.message ||
        'Unable to update favourite.',
      'error'
    );
  }
}


async function saveSearchHistory(
  query
) {
  if (
    !getToken() ||
    !query.trim()
  ) {
    return;
  }

  try {
    await apiFetch(
      '/api/user/search-history',
      {
        method: 'POST',

        body: JSON.stringify({
          query: query.trim()
        })
      }
    );
  } catch {
    /*
     * Search should still work
     * when history saving fails.
     */
  }
}


function openUserDialog(
  title,
  content
) {
  userDialogTitle.textContent =
    title;

  userDialogContent.innerHTML =
    content;

  userDialog.showModal();
}


function closeUserDialog() {
  userDialog.close();
}


async function showFavourites() {
  if (!getToken()) {
    openAuth('login');
    return;
  }

  openUserDialog(
    'Favourites',
    `
      <p class="text-ink/55">
        Loading your saved vehicles...
      </p>
    `
  );

  try {
    const data = await apiFetch('/api/user/favourites');

    const favourites = Array.isArray(data?.favourites)
      ? data.favourites
      : [];

    if (favourites.length === 0) {
      userDialogContent.innerHTML = `
        <div
          class="rounded-2xl border border-ink/10 bg-white/50 p-6 text-center"
        >
          <p class="font-bold">
            No favourites yet.
          </p>

          <p class="mt-2 text-sm text-ink/55">
            Tap the heart on any vehicle to save it here.
          </p>
        </div>
      `;

      return;
    }

    userDialogContent.innerHTML = `
      <div class="space-y-3">

        ${favourites
          .map(
            vehicle => `
              <div
                class="rounded-2xl border border-ink/10 bg-white/60 p-4"
              >
                <div
                  class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div>
                    <p
                      class="text-xs font-bold uppercase tracking-[0.15em] text-coral"
                    >
                      ${escapeHTML(vehicle.make)}
                    </p>

                    <h3
                      class="mt-1 text-lg font-bold"
                    >
                      ${escapeHTML(vehicle.model)}
                    </h3>

                    <p
                      class="text-sm text-ink/55"
                    >
                      ${escapeHTML(vehicle.variant)}
                      ·
                      ${money(vehicle.price)}
                    </p>
                  </div>

                  <div class="flex items-center gap-2">

                    <button
                      class="favourite-view-button rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                      data-id="${vehicle.id}"
                    >
                      View
                    </button>

                    <button
                      class="favourite-remove-button rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral"
                      data-id="${vehicle.id}"
                    >
                      Remove
                    </button>

                  </div>

                </div>
              </div>
            `
          )
          .join('')}

      </div>
    `;

    document
      .querySelectorAll('.favourite-view-button')
      .forEach(button => {
        button.addEventListener('click', () => {
          closeUserDialog();

          loadDetail(button.dataset.id);
        });
      });

    document
      .querySelectorAll('.favourite-remove-button')
      .forEach(button => {
        button.addEventListener('click', async () => {
          await toggleFavourite(Number(button.dataset.id));
          showFavourites();
        });
      });
  } catch (error) {
    console.error('Failed to load favourites:', error);

    userDialogContent.innerHTML = `
      <p class="text-coral">
        ${escapeHTML(
          error.message || 'Unable to load saved vehicles.'
        )}
      </p>
    `;
  }
}

async function showSearchHistory() {
  if (!getToken()) {
    openAuth('login');
    return;
  }

  openUserDialog(
    'Search history',
    `
      <p class="text-ink/55">
        Loading your recent searches...
      </p>
    `
  );

  try {
    const data =
      await apiFetch(
        '/api/user/search-history'
      );

    if (!data.history.length) {
      userDialogContent.innerHTML = `
        <div
          class="rounded-2xl border border-ink/10 bg-white/50 p-6 text-center"
        >
          <p class="font-bold">
            No search history yet.
          </p>

          <p
            class="mt-2 text-sm text-ink/55"
          >
            Your logged-in vehicle searches will appear here.
          </p>
        </div>
      `;

      return;
    }

    userDialogContent.innerHTML = `
      <div class="space-y-3">

        ${data.history
          .map(
            item => `
              <button
                class="history-item w-full rounded-2xl border border-ink/10 bg-white/60 p-4 text-left transition hover:border-pine"
                data-query="${escapeHTML(
                  item.query
                )}"
              >

                <p class="font-bold">
                  ${escapeHTML(
                    item.query
                  )}
                </p>

                <p
                  class="mt-1 text-xs text-ink/45"
                >
                  ${new Date(
                    item.createdAt
                  ).toLocaleString(
                    'en-IN'
                  )}
                </p>

              </button>
            `
          )
          .join('')}

      </div>
    `;

    document
      .querySelectorAll(
        '.history-item'
      )
      .forEach(button => {
        button.addEventListener(
          'click',
          () => {
            state.query =
              button.dataset.query ||
              '';

            state.page = 1;

            searchInput.value =
              state.query;

            closeUserDialog();

            loadVehicles();
          }
        );
      });
  } catch (error) {
    userDialogContent.innerHTML = `
      <p class="text-coral">
        ${escapeHTML(
          error.message
        )}
      </p>
    `;
  }
}


async function saveCurrentComparison() {
  if (!getToken()) {
    openAuth('login');
    return;
  }

  if (
    state.compareVehicles.length < 2
  ) {
    showStatus(
      'Select at least 2 vehicles before saving a comparison.',
      'error'
    );

    return;
  }

  const defaultName =
    state.compareVehicles
      .map(
        vehicle =>
          `${vehicle.make} ${vehicle.model}`
      )
      .join(' vs ');

  const name =
    window.prompt(
      'Name this comparison:',
      defaultName.slice(
        0,
        100
      )
    );

  if (name === null) {
    return;
  }

  try {
    await apiFetch(
      '/api/user/saved-comparisons',
      {
        method: 'POST',

        body: JSON.stringify({
          name:
            name.trim() ||
            'Vehicle comparison',

          vehicleIds:
            state.compareVehicles.map(
              vehicle => vehicle.id
            )
        })
      }
    );

    showStatus(
      'Comparison saved to your account.'
    );
  } catch (error) {
    showStatus(
      error.message ||
        'Unable to save comparison.',
      'error'
    );
  }
}


async function deleteSavedComparison(
  id
) {
  try {
    await apiFetch(
      `/api/user/saved-comparisons/${id}`,
      {
        method: 'DELETE'
      }
    );

    showSavedComparisons();
  } catch (error) {
    userDialogContent.innerHTML = `
      <p class="text-coral">
        ${escapeHTML(
          error.message
        )}
      </p>
    `;
  }
}


function loadSavedComparison(
  comparison
) {
  const vehicles =
    Array.isArray(
      comparison.vehicles
    )
      ? comparison.vehicles
      : [];

  if (vehicles.length < 2) {
    showStatus(
      'This saved comparison no longer has enough available vehicles.',
      'error'
    );

    return;
  }

  state.compareVehicles =
    vehicles.slice(0, 3);

  updateCompareCount();

  renderCompare();

  closeUserDialog();

  window.scrollTo({
    top:
      compareSection.offsetTop -
      80,

    behavior: 'smooth'
  });
}


async function showSavedComparisons() {
  if (!getToken()) {
    openAuth('login');
    return;
  }

  openUserDialog(
    'Saved comparisons',
    `
      <p class="text-ink/55">
        Loading saved comparisons...
      </p>
    `
  );

  try {
    const data =
      await apiFetch(
        '/api/user/saved-comparisons'
      );

    if (
      !data.comparisons.length
    ) {
      userDialogContent.innerHTML = `
        <div
          class="rounded-2xl border border-ink/10 bg-white/50 p-6 text-center"
        >
          <p class="font-bold">
            No saved comparisons yet.
          </p>

          <p class="mt-2 text-sm text-ink/55">
            Select two or three vehicles and save the comparison.
          </p>
        </div>
      `;

      return;
    }

    userDialogContent.innerHTML = `
      <div class="space-y-3">

        ${data.comparisons
          .map(
            comparison => `
              <div
                class="rounded-2xl border border-ink/10 bg-white/60 p-4"
              >

                <div
                  class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div>

                    <p class="font-bold">
                      ${escapeHTML(
                        comparison.name
                      )}
                    </p>

                    <p
                      class="mt-1 text-sm text-ink/55"
                    >
                      ${comparison.vehicles
                        .map(
                          vehicle =>
                            `${escapeHTML(
                              vehicle.make
                            )} ${escapeHTML(
                              vehicle.model
                            )}`
                        )
                        .join(' · ')}
                    </p>

                    <p
                      class="mt-1 text-xs text-ink/45"
                    >
                      ${new Date(
                        comparison.createdAt
                      ).toLocaleString(
                        'en-IN'
                      )}
                    </p>

                  </div>

                  <div
                    class="flex items-center gap-2"
                  >

                    <button
                      class="saved-load-button rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine"
                      data-id="${comparison.id}"
                    >
                      Load
                    </button>

                    <button
                      class="saved-delete-button rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral"
                      data-id="${comparison.id}"
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </div>
            `
          )
          .join('')}

      </div>
    `;

    document
      .querySelectorAll(
        '.saved-load-button'
      )
      .forEach(button => {
        button.addEventListener(
          'click',
          () => {
            const comparison =
              data.comparisons.find(
                item =>
                  item.id ===
                  Number(
                    button.dataset.id
                  )
              );

            if (comparison) {
              loadSavedComparison(
                comparison
              );
            }
          }
        );
      });

    document
      .querySelectorAll(
        '.saved-delete-button'
      )
      .forEach(button => {
        button.addEventListener(
          'click',
          () => {
            deleteSavedComparison(
              Number(
                button.dataset.id
              )
            );
          }
        );
      });
  } catch (error) {
    userDialogContent.innerHTML = `
      <p class="text-coral">
        ${escapeHTML(
          error.message
        )}
      </p>
    `;
  }
}


document
  .querySelector(
    '#login-button'
  )
  ?.addEventListener(
    'click',
    () => openAuth('login')
  );


document
  .querySelector(
    '#register-button'
  )
  ?.addEventListener(
    'click',
    () => openAuth('register')
  );


document
  .querySelector(
    '#close-auth'
  )
  ?.addEventListener(
    'click',
    closeAuth
  );


document
  .querySelector(
    '#switch-auth'
  )
  ?.addEventListener(
    'click',
    () => {
      openAuth(
        authMode === 'login'
          ? 'register'
          : 'login'
      );
    }
  );


authForm?.addEventListener(
  'submit',
  submitAuth
);


favouritesButton?.addEventListener(
  'click',
  showFavourites
);


historyButton?.addEventListener(
  'click',
  showSearchHistory
);


savedComparisonsButton?.addEventListener(
  'click',
  showSavedComparisons
);


document
  .querySelector(
    '#close-user-dialog'
  )
  ?.addEventListener(
    'click',
    closeUserDialog
  );


document
  .querySelector(
    '#search-form'
  )
  .addEventListener(
    'submit',
    event => {
      event.preventDefault();

      state.query =
        searchInput.value.trim();

      state.page = 1;

      if (state.query) {
        void saveSearchHistory(
          state.query
        );
      }

      loadVehicles();
    }
  );


document
  .querySelector(
    '#sort-select'
  )
  .addEventListener(
    'change',
    event => {
      [
        state.sortBy,
        state.sortOrder
      ] =
        event.target.value.split(':');

      state.page = 1;

      loadVehicles();
    }
  );


document
  .querySelectorAll(
    '.example-query'
  )
  .forEach(button => {
    button.addEventListener(
      'click',
      () => {
        searchInput.value =
          button.dataset.query;

        searchInput.focus();
      }
    );
  });


document
  .querySelector(
    '#vehicle-dialog'
  )
  .addEventListener(
    'click',
    event => {
      if (
        event.target.id ===
        'vehicle-dialog'
      ) {
        event.target.close();
      }
    }
  );


document
  .querySelector(
    '#user-dialog'
  )
  ?.addEventListener(
    'click',
    event => {
      if (
        event.target.id ===
        'user-dialog'
      ) {
        event.target.close();
      }
    }
  );


updateAuthUI();

updateCompareCount();

loadVehicles();