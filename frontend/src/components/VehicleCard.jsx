function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function VehicleCard({
  vehicle,
  isSelected,
  isFavourite,
  onView,
  onCompare,
  onFavourite
}) {
  return (
    <article className="group flex flex-col justify-between rounded-3xl border border-ink/10 bg-white/55 p-5 transition hover:-translate-y-1 hover:border-mint hover:bg-white">
      <div>
        <div className="mb-8 flex items-start justify-between">
          <span className="rounded-full bg-mint/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pine">
            {vehicle.bodyType}
          </span>
          <span className="text-sm text-ink/45">{vehicle.year}</span>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
          {vehicle.make}
        </p>
        <h3 className="mt-1 font-display text-3xl">{vehicle.model}</h3>
        <p className="mt-1 text-sm text-ink/55">{vehicle.variant}</p>
        <p className="mt-5 text-2xl font-bold">{money(vehicle.price)}</p>

        <div className="mt-5 grid grid-cols-2 gap-y-3 border-t border-ink/10 pt-4 text-sm text-ink/65">
          <span>{vehicle.fuelType}</span>
          <span>{vehicle.transmission}</span>
          <span>{Number(vehicle.kmDriven).toLocaleString('en-IN')} km</span>
          <span>{vehicle.seatingCapacity} seats</span>
        </div>
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
export { money };
