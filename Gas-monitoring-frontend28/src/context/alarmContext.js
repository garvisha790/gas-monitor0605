import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUnreadAlarmsCount, getAllAlarms } from '../services/alarmService';

const AlarmContext = createContext();

export const useAlarms = () => useContext(AlarmContext);

export const AlarmProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlarms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllAlarms();
      console.log('Fetched alarms from API:', data);
      if (Array.isArray(data)) {
        setAlarms(data);
      } else {
        console.error('Invalid alarms data format:', data);
        setError('Invalid data format received from server');
        setAlarms([]);
      }
    } catch (error) {
      console.error('Failed to fetch alarms:', error);
      setError(error.message || 'Failed to fetch alarms');
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadAlarmsCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      setError(error.message);
    }
  };
 
  useEffect(() => {
    console.log('AlarmProvider: Initial data fetch');
    fetchAlarms();
    fetchUnreadCount();

    const pollingInterval = setInterval(() => {
      console.log('AlarmProvider: Polling for new data');
      fetchAlarms();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(pollingInterval);
  }, []);

  const refreshData = () => {
    console.log('AlarmProvider: Manual refresh triggered');
    fetchAlarms();
    fetchUnreadCount();
  };

  return (
    <AlarmContext.Provider value={{
      unreadCount,
      alarms,
      loading,
      error,
      refreshData
    }}>
      {children}
    </AlarmContext.Provider>
  );
};
  