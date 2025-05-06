const Plant = require('../models/plant');

exports.getPlants = async (req, res) => {
  try {
    const plants = await Plant.find();
    res.json(plants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPlant = async (req, res) => {
  try {
    console.log('Incoming request body:', req.body);
    const { plantName, location, capacity, isActive } = req.body;

    if (!plantName || !location || capacity === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newPlant = new Plant({ plantName, location, capacity, isActive });
    await newPlant.save();
    res.status(201).json(newPlant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findByIdAndDelete(req.params.id);
    if (!plant) return res.status(404).json({ message: 'Plant not found' });
    res.json({ message: 'Plant deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePlant = async (req, res) => {
  try {
    const { plantName, location, capacity, isActive } = req.body;
    const updatedPlant = await Plant.findByIdAndUpdate(
      req.params.id,
      { plantName, location, capacity, isActive },
      { new: true }
    );
    if (!updatedPlant) return res.status(404).json({ message: 'Plant not found' });
    res.json(updatedPlant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};