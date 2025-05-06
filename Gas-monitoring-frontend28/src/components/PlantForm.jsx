import { useState } from 'react';
import { addPlant } from '../services/plantService';

const PlantForm = ({ refreshPlants }) => {
  const [plantName, setPlantName] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addPlant({ plantName, location, isActive: true });
    setPlantName('');
    setLocation('');
    refreshPlants();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-xl shadow-md mb-4">
      <input
        type="text"
        placeholder="Plant Name"
        value={plantName}
        onChange={(e) => setPlantName(e.target.value)}
        className="border p-2 rounded mr-2"
        required
      />
      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="border p-2 rounded mr-2"
        required
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add Plant</button>
    </form>
  );
};

export default PlantForm;