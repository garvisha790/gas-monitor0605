//controller
 
// controllers/deviceController.js

const Device = require('../models/Device');
 
// Get all devices (optionally by plantId)

exports.getDevices = async (req, res) => {

  try {

    const { plantId } = req.query;

    const devices = plantId

      ? await Device.find({ plantId })

      : await Device.find();

    res.json(devices);

  } catch (err) {

    res.status(500).json({ message: 'Server error while fetching devices' });

  }

};
 
// Get only parent devices for a plant

exports.getParentDevices = async (req, res) => {

  try {

    const { plantId } = req.query;

    if (!plantId) return res.status(400).json({ message: 'plantId is required' });
 
    const parentDevices = await Device.find({ plantId, parentDeviceId: null });

    res.json(parentDevices);

  } catch (err) {

    console.error('Error fetching parent devices:', err);

    res.status(500).json({ message: 'Server error while fetching parent devices' });

  }

};
 
// Get children of a parent device

exports.getChildDevices = async (req, res) => {

  try {

    const { parentId } = req.params;

    const children = await Device.find({ parentDeviceId: parentId });

    res.json(children);

  } catch (err) {

    console.error('Error fetching child devices:', err);

    res.status(500).json({ message: 'Server error while fetching child devices' });

  }

};
 
// Add new device (parent or child)

exports.addDevice = async (req, res) => {

  try {

    const {

      deviceName,

      serialNumber,

      macId,

      commissionedDate,

      plantId,

      parentDeviceId, // optional

    } = req.body;
 
    if (!deviceName || !serialNumber || !macId || !commissionedDate || !plantId) {

      return res.status(400).json({ message: 'All required fields must be filled' });

    }
 
    const newDevice = new Device({

      deviceName,

      serialNumber,

      macId,

      commissionedDate,

      plantId,

      parentDeviceId: parentDeviceId || null,

    });
 
    await newDevice.save();

    res.status(201).json(newDevice);

  } catch (err) {

    console.error('Error adding device:', err);

    res.status(400).json({ message: 'Error adding device' });

  }

};
 
// Update device

exports.updateDevice = async (req, res) => {

  try {

    const updatedDevice = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedDevice) return res.status(404).json({ message: 'Device not found' });

    res.json(updatedDevice);

  } catch (err) {

    console.error('Error updating device:', err);

    res.status(400).json({ message: 'Error updating device' });

  }

};
 
// Delete device

exports.deleteDevice = async (req, res) => {

  try {

    const deletedDevice = await Device.findByIdAndDelete(req.params.id);

    if (!deletedDevice) return res.status(404).json({ message: 'Device not found' });

    res.json({ message: 'Device deleted successfully' });

  } catch (err) {

    console.error('Error deleting device:', err);

    res.status(500).json({ message: 'Error deleting device' });

  }

};

 