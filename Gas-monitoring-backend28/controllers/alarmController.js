const Alarm = require('../models/alarmModel'); // Now pointing to oxygen_monitor DB
const Device = require('../models/Device');

console.log("Alarm model connected to oxygen_monitor DB" , Alarm);
// Get all alarms
exports.getAllAlarms = async (req, res) => {
  try {
    console.log("The alarms_________________ are:");
    const alarms = await Alarm.find().sort({ CreatedTimestamp: -1 });
    
    res.status(200).json(alarms);
  } catch (error) {
    console.error('❌ Error fetching alarms:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get alarms by device ID
exports.getAlarmsByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const alarms = await Alarm.find({ DeviceId: deviceId }).sort({ CreatedTimestamp: -1 });
    res.status(200).json(alarms);
  } catch (error) {
    console.error(`❌ Error fetching alarms for device ${req.params.deviceId}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get unread alarms count
exports.getUnreadAlarmsCount = async (req, res) => {
  try {
    const count = await Alarm.countDocuments({ IsRead: false });
    res.status(200).json({ count });
  } catch (error) {
    console.error('❌ Error fetching unread alarms count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark alarm as read
exports.markAlarmAsRead = async (req, res) => {
  try {
    const { alarmId } = req.params;
    const updatedAlarm = await Alarm.findByIdAndUpdate(
      alarmId,
      { IsRead: true },
      { new: true }
    );

    if (!updatedAlarm) {
      return res.status(404).json({ message: 'Alarm not found' });
    }

    res.status(200).json(updatedAlarm);
  } catch (error) {
    console.error(`❌ Error marking alarm ${req.params.alarmId} as read:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark all alarms as read
exports.markAllAlarmsAsRead = async (req, res) => {
  try {
    await Alarm.updateMany(
      { IsRead: false },
      { IsRead: true }
    );

    res.status(200).json({ message: 'All alarms marked as read' });
  } catch (error) {
    console.error('❌ Error marking all alarms as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
