const state = {
  query: '',
  page: 1,
  limit: 9,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  compareVehicles: []
};

const grid = document.querySelector('#vehicle-grid');
const statusBox = document.querySelector('#status');
const pagination = document.querySelector('#pagination');
const searchInput = document.querySelector('#search-input');
const resultTitle = document.querySelector('#result-title');
const compareSection = document.querySelector('#compare-section');
const compareTable = document.querySelector('#compare-table');
const compareCount = document.querySelector('#compare-count');


function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}


function showStatus(message, type = 'info') {
  statusBox.className = `rounded-2xl border p-8 text-center ${
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
  const isSelected = state.compareVehicles.some(
    item => item.id === vehicle.id
  );

  return `
    <article class="group flex flex-col justify-between rounded-3xl border border-ink/10 bg-white/55 p-5 transition hover:-translate-y-1 hover:border-mint hover:bg-white">
      
      <div>
        <div class="mb-8 flex items-start justify-between">
          <span class="rounded-full bg-mint/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pine">
            ${vehicle.bodyType}
          </span>

          <span class="text-sm text-ink/45">
            ${vehicle.year}
          </span>
        </div>

        <p class="text-xs font-bold uppercase tracking-[0.18em] text-coral">
          ${vehicle.make}
        </p>

        <h3 class="mt-1 font-display text-3xl">
          ${vehicle.model}
        </h3>

        <p class="mt-1 text-sm text-ink/55">
          ${vehicle.variant}
        </p>

        <p class="mt-5 text-2xl font-bold">
          ${money(vehicle.price)}
        </p>

        <div class="mt-5 grid grid-cols-2 gap-y-3 border-t border-ink/10 pt-4 text-sm text-ink/65">
          <span>${vehicle.fuelType}</span>
          <span>${vehicle.transmission}</span>
          <span>${vehicle.kmDriven.toLocaleString('en-IN')} km</span>
          <span>${vehicle.seatingCapacity} seats</span>
        </div>
      </div>

      <div class="mt-7 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
        
        <button
          class="detail-button text-left text-sm font-bold text-pine"
          data-id="${vehicle.id}"
        >
          View details
          <span class="text-xl">→</span>
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
    </article>
  `;
}


function renderPagination(data) {
  if (!data.totalPages || data.totalPages <= 1) {
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
    ?.addEventListener('click', () => {
      state.page--;
      loadVehicles();
    });

  document
    .querySelector('#next-page')
    ?.addEventListener('click', () => {
      state.page++;
      loadVehicles();
    });
}


function updateCompareCount() {
  if (!compareCount) return;

  const count = state.compareVehicles.length;

  compareCount.textContent = `${count}/3 selected`;

  if (count === 0) {
    compareCount.classList.add('hidden');
  } else {
    compareCount.classList.remove('hidden');
  }
}


function addToCompare(vehicleId) {
  const vehicle = window.currentVehicles?.find(
    item => item.id === vehicleId
  );

  if (!vehicle) return;

  const alreadySelected = state.compareVehicles.some(
    item => item.id === vehicleId
  );

  if (alreadySelected) {
    removeFromCompare(vehicleId);
    return;
  }

  if (state.compareVehicles.length >= 3) {
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


function removeFromCompare(vehicleId) {
  state.compareVehicles = state.compareVehicles.filter(
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
  if (!window.currentVehicles) return;

  grid.innerHTML = window.currentVehicles
    .map(vehicleCard)
    .join('');

  attachVehicleButtons();
}


function renderCompare() {
  if (state.compareVehicles.length < 2) {
    compareSection.classList.add('hidden');
    compareTable.innerHTML = '';
    return;
  }

  compareSection.classList.remove('hidden');

  const rows = [
    ['Make / Model', vehicle => `${vehicle.make} ${vehicle.model}`],
    ['Variant', vehicle => vehicle.variant],
    ['Price', vehicle => money(vehicle.price)],
    ['Year', vehicle => vehicle.year],
    ['Fuel Type', vehicle => vehicle.fuelType],
    ['Transmission', vehicle => vehicle.transmission],
    ['Body Type', vehicle => vehicle.bodyType],
    [
      'KM Driven',
      vehicle => `${vehicle.kmDriven.toLocaleString('en-IN')} km`
    ],
    ['Safety Rating', vehicle => `${vehicle.safetyRating} / 5`],
    ['Seating Capacity', vehicle => `${vehicle.seatingCapacity} seats`],
    ['Mileage', vehicle => `${vehicle.mileage}`],
    ['City', vehicle => vehicle.city],
    ['Ownership', vehicle => `${vehicle.ownership} owner(s)`]
  ];

  compareTable.innerHTML = `
    <div class="flex items-center justify-between border-b border-ink/10 px-5 py-4">
      <div>
        <p class="text-sm font-bold text-pine">
          ${state.compareVehicles.length} vehicles selected
        </p>

        <p class="mt-1 text-xs text-ink/45">
          Compare the important specifications side by side.
        </p>
      </div>

      <button
        id="clear-comparison"
        class="rounded-full border border-coral/30 px-4 py-2 text-sm font-bold text-coral transition hover:bg-coral hover:text-white"
      >
        Clear all
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr class="border-b border-ink/10">
            <th class="min-w-[160px] px-5 py-4 font-bold">
              Specification
            </th>

            ${state.compareVehicles
              .map(
                vehicle => `
                  <th class="min-w-[220px] px-5 py-4">
                    <div class="flex items-start justify-between gap-4">
                      
                      <div>
                        <p class="text-xs font-bold uppercase tracking-[0.15em] text-coral">
                          ${vehicle.make}
                        </p>

                        <p class="mt-1 text-lg font-bold text-ink">
                          ${vehicle.model}
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
                <tr class="border-b border-ink/10 last:border-0">
                  
                  <td class="px-5 py-4 font-bold text-ink/55">
                    ${label}
                  </td>

                  ${state.compareVehicles
                    .map(
                      vehicle => `
                        <td class="px-5 py-4 text-ink/75">
                          ${getter(vehicle)}
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
    ?.addEventListener('click', clearComparison);

  document.querySelectorAll('.remove-compare').forEach(button => {
    button.addEventListener('click', () => {
      removeFromCompare(Number(button.dataset.id));
    });
  });
}


function attachVehicleButtons() {
  document.querySelectorAll('.detail-button').forEach(button => {
    button.addEventListener('click', () => {
      loadDetail(button.dataset.id);
    });
  });

  document.querySelectorAll('.compare-button').forEach(button => {
    button.addEventListener('click', () => {
      addToCompare(Number(button.dataset.id));
    });
  });
}


async function loadVehicles() {
  showStatus('Loading vehicles...');
  grid.innerHTML = '';

  const params = new URLSearchParams({
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
        headers: {
          'Content-Type': 'application/json'
        },
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
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to load vehicles.'
      );
    }

    hideStatus();

    resultTitle.textContent = state.query
      ? 'Your matches'
      : 'Explore vehicles';

    if (!data.vehicles.length) {
      showStatus(
        'No vehicles match this search. Try changing the budget, city, or vehicle type.'
      );
    }

    window.currentVehicles = data.vehicles;

    grid.innerHTML = data.vehicles
      .map(vehicleCard)
      .join('');

    renderPagination(data);
    attachVehicleButtons();
    updateCompareCount();
    renderCompare();
  } catch (error) {
    showStatus(error.message, 'error');
    pagination.innerHTML = '';
  }
}


async function loadDetail(id) {
  const dialog = document.querySelector('#vehicle-dialog');
  const detail = document.querySelector('#vehicle-detail');

  detail.innerHTML = `
    <p class="p-8 text-center text-ink/60">
      Loading details...
    </p>
  `;

  dialog.showModal();

  try {
    const response = await fetch(`/api/vehicles/${id}`);
    const vehicle = await response.json();

    if (!response.ok) {
      throw new Error(
        vehicle.error || 'Vehicle not found.'
      );
    }

    detail.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-coral">
            ${vehicle.make}
          </p>

          <h2 class="mt-1 font-display text-4xl">
            ${vehicle.model}
          </h2>

          <p class="mt-1 text-ink/55">
            ${vehicle.variant}
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

      <div class="mt-8 grid grid-cols-2 gap-5 border-y border-ink/10 py-6 text-sm">
        
        <div>
          <p class="text-ink/45">Price</p>
          <strong class="mt-1 block text-xl">
            ${money(vehicle.price)}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">Location</p>
          <strong class="mt-1 block">
            ${vehicle.city}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">Safety rating</p>
          <strong class="mt-1 block">
            ${vehicle.safetyRating} / 5
          </strong>
        </div>

        <div>
          <p class="text-ink/45">Ownership</p>
          <strong class="mt-1 block">
            ${vehicle.ownership} owner(s)
          </strong>
        </div>

        <div>
          <p class="text-ink/45">Mileage</p>
          <strong class="mt-1 block">
            ${vehicle.mileage}
          </strong>
        </div>

        <div>
          <p class="text-ink/45">Kilometres</p>
          <strong class="mt-1 block">
            ${vehicle.kmDriven.toLocaleString('en-IN')} km
          </strong>
        </div>

      </div>
    `;

    document
      .querySelector('#close-dialog')
      .addEventListener('click', () => {
        dialog.close();
      });
  } catch (error) {
    detail.innerHTML = `
      <p class="text-coral">
        ${error.message}
      </p>
    `;
  }
}


document
  .querySelector('#search-form')
  .addEventListener('submit', event => {
    event.preventDefault();

    state.query = searchInput.value.trim();
    state.page = 1;

    loadVehicles();
  });


document
  .querySelector('#sort-select')
  .addEventListener('change', event => {
    [state.sortBy, state.sortOrder] =
      event.target.value.split(':');

    state.page = 1;

    loadVehicles();
  });


document.querySelectorAll('.example-query').forEach(button => {
  button.addEventListener('click', () => {
    searchInput.value = button.dataset.query;
    searchInput.focus();
  });
});


document
  .querySelector('#vehicle-dialog')
  .addEventListener('click', event => {
    if (event.target.id === 'vehicle-dialog') {
      event.target.close();
    }
  });


updateCompareCount();
loadVehicles();