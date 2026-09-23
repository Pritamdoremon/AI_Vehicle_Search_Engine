function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatLakh(amount) {
  const lakhs = Number(amount) / 100000;
  if (Number.isInteger(lakhs)) {
    return `₹${lakhs}L`;
  }
  return `₹${lakhs.toFixed(1)}L`;
}

function formatPriceDelta(delta) {
  const abs = Math.abs(Number(delta));
  if (abs >= 100000) {
    return formatLakh(abs);
  }
  return `₹${Math.round(abs / 1000)}K`;
}

function getPriceInsightText(vehicle) {
  if (
    vehicle == null ||
    vehicle.similarAveragePrice == null ||
    vehicle.priceDelta == null
  ) {
    return null;
  }

  const delta = Number(vehicle.priceDelta);
  if (Math.abs(delta) < 1000) {
    return 'Priced near similar vehicles';
  }
  if (delta < 0) {
    return `${formatPriceDelta(delta)} below similar vehicles`;
  }
  return `${formatPriceDelta(delta)} above similar vehicles`;
}

// Fallback image when DB has no imageUrl — varies by vehicle id so cards look different
function getPlaceholderImage(bodyType, vehicleId) {
  const photos = [
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&q=80',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e5438994b?w=800&q=80',
    'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
    'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&q=80'
  ];

  const index = Math.abs(Number(vehicleId) || 0) % photos.length;
  return photos[index];
}

function getVehicleImage(vehicle) {
  if (vehicle.imageUrl || vehicle.image_url) {
    return vehicle.imageUrl || vehicle.image_url;
  }
  return getPlaceholderImage(vehicle.bodyType, vehicle.id);
}

// Build "Why this car" reasons from active search filters + this vehicle.
// No LLM call — only show reasons that truly match.
function getWhyThisCar(vehicle, filters) {
  if (!filters || !vehicle) {
    return [];
  }

  const reasons = [];

  if (filters.bodyType && vehicle.bodyType === filters.bodyType) {
    reasons.push(`Matches ${filters.bodyType.toUpperCase()}`);
  }

  if (filters.fuelType && vehicle.fuelType === filters.fuelType) {
    reasons.push(filters.fuelType);
  }

  if (filters.transmission && vehicle.transmission === filters.transmission) {
    reasons.push(
      filters.transmission.charAt(0).toUpperCase() + filters.transmission.slice(1)
    );
  }

  if (filters.make && vehicle.make === filters.make) {
    reasons.push(filters.make);
  }

  if (filters.model && vehicle.model === filters.model) {
    reasons.push(filters.model);
  }

  if (filters.city && vehicle.city === filters.city) {
    reasons.push(filters.city);
  }

  if (
    filters.seatingCapacity !== undefined &&
    Number(vehicle.seatingCapacity) === Number(filters.seatingCapacity)
  ) {
    reasons.push(`${filters.seatingCapacity} seats`);
  }

  if (
    filters.maxPrice !== undefined &&
    Number(vehicle.price) <= Number(filters.maxPrice)
  ) {
    reasons.push(`Within your ${formatLakh(filters.maxPrice)} budget`);
  }

  if (
    filters.minPrice !== undefined &&
    Number(vehicle.price) >= Number(filters.minPrice)
  ) {
    reasons.push(`Above ${formatLakh(filters.minPrice)}`);
  }

  if (
    filters.maxKmDriven !== undefined &&
    Number(vehicle.kmDriven) <= Number(filters.maxKmDriven)
  ) {
    reasons.push(`Under ${Number(filters.maxKmDriven).toLocaleString('en-IN')} km`);
  }

  if (
    filters.minKmDriven !== undefined &&
    Number(vehicle.kmDriven) >= Number(filters.minKmDriven)
  ) {
    reasons.push(`Above ${Number(filters.minKmDriven).toLocaleString('en-IN')} km`);
  }

  if (
    filters.minSafetyRating !== undefined &&
    Number(vehicle.safetyRating) >= Number(filters.minSafetyRating)
  ) {
    reasons.push(`Safety ≥ ${filters.minSafetyRating}`);
  }

  if (
    filters.minYear !== undefined &&
    Number(vehicle.year) >= Number(filters.minYear)
  ) {
    reasons.push(`From ${filters.minYear}`);
  }

  if (
    filters.maxYear !== undefined &&
    Number(vehicle.year) <= Number(filters.maxYear)
  ) {
    reasons.push(`Until ${filters.maxYear}`);
  }

  if (
    filters.ownership !== undefined &&
    Number(vehicle.ownership) === Number(filters.ownership)
  ) {
    reasons.push(`${filters.ownership} owner`);
  }

  return reasons;
}

function VehicleCard({
  vehicle,
  filters,
  isSelected,
  isFavourite,
  onView,
  onCompare,
  onFavourite
}) {
  const whyReasons = getWhyThisCar(vehicle, filters);
  const matchScore =
    vehicle.matchScore != null ? Math.round(Number(vehicle.matchScore)) : null;
  const priceInsight = getPriceInsightText(vehicle);

  return (
    <article className="group flex flex-col justify-between rounded-3xl border border-ink/10 bg-white/55 p-5 transition hover:-translate-y-1 hover:border-mint hover:bg-white">
      <div>
        <div className="mb-5 overflow-hidden rounded-2xl bg-pine/10">
          <img
            src={getVehicleImage(vehicle)}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-40 w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = getPlaceholderImage(vehicle.bodyType, vehicle.id);
            }}
          />
        </div>

        <div className="mb-6 flex items-start justify-between">
          <span className="rounded-full bg-mint/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pine">
            {vehicle.bodyType}
          </span>
          <div className="text-right">
            <span className="text-sm text-ink/45">{vehicle.year}</span>
            {matchScore != null && (
              <p className="mt-1 text-sm font-bold text-pine">{matchScore}% Match</p>
            )}
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
          {vehicle.make}
        </p>
        <h3 className="mt-1 font-display text-3xl">{vehicle.model}</h3>
        <p className="mt-1 text-sm text-ink/55">{vehicle.variant}</p>
        <p className="mt-5 text-2xl font-bold">{money(vehicle.price)}</p>

        {vehicle.similarAveragePrice != null && (
          <p className="mt-1 text-sm text-ink/55">
            Similar vehicles average: {formatLakh(vehicle.similarAveragePrice)}
          </p>
        )}
        {priceInsight && (
          <p className="mt-1 text-sm font-bold text-pine">
            Price Insight: {priceInsight}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-y-3 border-t border-ink/10 pt-4 text-sm text-ink/65">
          <span>{vehicle.fuelType}</span>
          <span>{vehicle.transmission}</span>
          <span>{Number(vehicle.kmDriven).toLocaleString('en-IN')} km</span>
          <span>{vehicle.seatingCapacity} seats</span>
        </div>

        {whyReasons.length > 0 && (
          <div className="mt-5 rounded-2xl border border-mint/40 bg-mint/20 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-pine">
              Why this car
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink/70">
              {whyReasons.map((reason) => (
                <li key={reason}>✓ {reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-4">
        <button
          type="button"
          className="text-left text-sm font-bold text-pine"
          onClick={() => onView(vehicle.id)}
        >
          View details <span className="text-xl">→</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            className={`rounded-full border px-3 py-2 text-sm font-bold transition ${
              isFavourite
                ? 'border-coral bg-coral text-white'
                : 'border-coral/40 text-coral hover:bg-coral hover:text-white'
            }`}
            onClick={() => onFavourite(vehicle.id)}
          >
            {isFavourite ? '♥' : '♡'}
          </button>

          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              isSelected
                ? 'border-pine bg-pine text-paper'
                : 'border-pine text-pine hover:bg-pine hover:text-paper'
            }`}
            onClick={() => onCompare(vehicle)}
          >
            {isSelected ? 'Selected' : 'Compare'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default VehicleCard;
export { money, getVehicleImage, getPlaceholderImage, getPriceInsightText, formatLakh };
