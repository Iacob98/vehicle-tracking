import { VehicleForm } from '../VehicleForm';

export default function NewVehiclePage() {

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🚗 Добавить автомобиль</h1>
      <VehicleForm />
    </div>
  );
}
