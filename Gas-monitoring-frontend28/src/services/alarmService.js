import axios from 'axios';

import api from './apiService';
 
const API_BASE_URL = 'http://localhost:5000/api';
 
export const getAllAlarms = async () => {

  try {

    const response = await api.get('/alarms');

    return response.data;

  } catch (error) {

    console.error('Error fetching alarms:', error);

    throw error;

  }

};
 
export const getAlarmsByDevice = async (deviceId) => {

  try {

    const response = await api.get(`/alarms/device/${deviceId}`);

    return response.data;

  } catch (error) {

    console.error(`Error fetching alarms for device ${deviceId}:`, error);

    throw error;

  }

};
 
export const getUnreadAlarmsCount = async () => {

  try {

    const response = await api.get('/alarms/unread/count');

    return response.data.count;

  } catch (error) {

    console.error('Error fetching unread alarms count:', error);

    throw error;

  }

};
 
export const markAlarmAsRead = async (alarmId) => {

  try {

    const response = await api.put(`/alarms/${alarmId}/read`);

    return response.data;

  } catch (error) {

    console.error(`Error marking alarm ${alarmId} as read:`, error);

    throw error;

  }

};
 
export const markAllAlarmsAsRead = async () => {

  try {

    const response = await api.put('/alarms/read/all');

    return response.data;

  } catch (error) {

    console.error('Error marking all alarms as read:', error);

    throw error;

  }

};
 