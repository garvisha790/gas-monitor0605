//device service 
// services/deviceService.js
 
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/devices';

export const getDevices = async (plantId) => {

  const response = await axios.get(`${API_URL}?plantId=${plantId}`);

  return response.data;

};

export const addDevice = async (deviceData) => {

  const response = await axios.post(API_URL, deviceData);

  return response.data;

};

export const deleteDevice = async (id) => {

  await axios.delete(`${API_URL}/${id}`);

};

export const getParentDevices = async (plantId) => {

  const response = await axios.get(`${API_URL}/parents?plantId=${plantId}`);

  return response.data;

};

export const getChildDevices = async (parentId) => {

  const response = await axios.get(`${API_URL}/${parentId}/children`);

  return response.data;

};

export const updateDevice = async (id, updatedData) => {

  const response = await axios.put(`${API_URL}/${id}`, updatedData);

  return response.data;

};
 
// Count child devices for a parent

export const getChildDeviceCount = async (parentId) => {

  const children = await getChildDevices(parentId);

  return children.length;

};
 
// Get all devices with their child counts

export const getDevicesWithChildCounts = async (plantId) => {

  const devices = await getDevices(plantId);

  // For parent devices, get child counts

  const devicesWithCounts = await Promise.all(

    devices.map(async (device) => {

      if (!device.parentDeviceId) {

        const childCount = await getChildDeviceCount(device._id);

        return { ...device, childCount };

      }

      return { ...device, childCount: 0 };

    })

  );

  return devicesWithCounts;

};
 