const Alarm = require('../models/alarmModel');
const Device = require('../models/Device');

/**
 * Create a new alarm record in MongoDB
 * @param {Object} alarmData - The alarm data to save
 * @returns {Promise<Object>} - The created alarm
 */
const createAlarm = async (alarmData) => {
  try {
    console.log(`🚨 Creating new alarm: ${alarmData.AlarmCode} - ${alarmData.AlarmDescription}`);
    
    // If deviceId is provided as a MongoDB ObjectId, find the device
    if (alarmData.deviceId) {
      const device = await Device.findById(alarmData.deviceId);
      if (device) {
        alarmData.DeviceName = device.deviceName;
      }
    } else if (alarmData.DeviceName) {
      // If DeviceName is provided but not deviceId, try to find device by name
      const device = await Device.findOne({ deviceName: alarmData.DeviceName });
      if (device) {
        alarmData.deviceId = device._id;
      }
    }
    
    // Create the alarm
    const alarm = new Alarm(alarmData);
    await alarm.save();
    
    console.log(`✅ Alarm created with ID: ${alarm._id}`);
    return alarm;
  } catch (error) {
    console.error('❌ Error creating alarm:', error);
    throw error;
  }
};

/**
 * Get all alarms with optional filtering
 * @param {Object} filter - Optional filter criteria
 * @param {Number} limit - Maximum number of alarms to return
 * @returns {Promise<Array>} - Array of alarms
 */
const getAlarms = async (filter = {}, limit = 100) => {
  try {
    return await Alarm.find(filter)
      .sort({ CreatedTimestamp: -1 })
      .limit(limit)
      .populate('deviceId');
  } catch (error) {
    console.error('❌ Error fetching alarms:', error);
    return [];
  }
};

/**
 * Get active alarms for a specific device
 * @param {String} deviceId - MongoDB ObjectId of the device
 * @returns {Promise<Array>} - Array of active alarms
 */
const getActiveAlarmsByDeviceId = async (deviceId) => {
  try {
    // Find MongoDB Device first
    const device = await Device.findById(deviceId);
    if (!device) {
      console.warn(`⚠️ No device found with ID: ${deviceId}`);
      return [];
    }
    
    // Get alarms for this device
    return await Alarm.find({
      deviceId: deviceId,
      IsActive: true
    }).sort({ CreatedTimestamp: -1 });
  } catch (error) {
    console.error(`❌ Error fetching active alarms for device: ${deviceId}`, error);
    return [];
  }
};

/**
 * Get active alarms for a specific device by name
 * @param {String} deviceName - Name of the device
 * @returns {Promise<Array>} - Array of active alarms
 */
const getActiveAlarmsByDeviceName = async (deviceName) => {
  try {
    // Find MongoDB Device first
    const device = await Device.findOne({ deviceName });
    if (device) {
      return getActiveAlarmsByDeviceId(device._id);
    }
    
    // If no device found, try to find alarms by DeviceName field
    return await Alarm.find({
      DeviceName: deviceName,
      IsActive: true
    }).sort({ CreatedTimestamp: -1 });
  } catch (error) {
    console.error(`❌ Error fetching active alarms for device name: ${deviceName}`, error);
    return [];
  }
};

/**
 * Mark an alarm as read
 * @param {String} alarmId - MongoDB ObjectId of the alarm
 * @returns {Promise<Object>} - Updated alarm
 */
const markAlarmAsRead = async (alarmId) => {
  try {
    return await Alarm.findByIdAndUpdate(
      alarmId, 
      { IsRead: true }, 
      { new: true }
    );
  } catch (error) {
    console.error(`❌ Error marking alarm as read: ${alarmId}`, error);
    throw error;
  }
};

/**
 * Update an alarm's status
 * @param {String} alarmId - MongoDB ObjectId of the alarm
 * @param {Boolean} isActive - Whether the alarm is active
 * @returns {Promise<Object>} - Updated alarm
 */
const updateAlarmStatus = async (alarmId, isActive) => {
  try {
    return await Alarm.findByIdAndUpdate(
      alarmId, 
      { IsActive: isActive }, 
      { new: true }
    );
  } catch (error) {
    console.error(`❌ Error updating alarm status: ${alarmId}`, error);
    throw error;
  }
};

module.exports = {
  createAlarm,
  getAlarms,
  getActiveAlarmsByDeviceId,
  getActiveAlarmsByDeviceName,
  markAlarmAsRead,
  updateAlarmStatus
};
