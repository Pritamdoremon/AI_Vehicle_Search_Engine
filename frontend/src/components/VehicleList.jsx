import VehicleCard from './VehicleCard.jsx';

function VehicleList({
  vehicles,
  filters,
  compareVehicles,
  favouriteIds,
  onView,
  onCompare,
  onFavourite
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          filters={filters}
          isSelected={compareVehicles.some((item) => item.id === vehicle.id)}
          isFavourite={favouriteIds.includes(vehicle.id)}
          onView={onView}
          onCompare={onCompare}
          onFavourite={onFavourite}
        />
      ))}
    </div>
  );
}

export default VehicleList;
