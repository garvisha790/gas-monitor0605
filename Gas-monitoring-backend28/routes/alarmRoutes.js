const express = require('express');
const Alarm = require('../models/alarmModel');

const router = express.Router();

const alarmController = require('../controllers/alarmController');
 
// Get all alarms

router.get('/', async (req, res) => {
    try {
      console.log("The alarms_________________ are:");
      const alarms = await Alarm.find().sort({ CreatedTimestamp: -1 });
      
      res.status(200).json(alarms);
    } catch (error) {
      console.error('❌ Error fetching alarms:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  );
 
// Get alarms by device ID

router.get('/device/:deviceId', alarmController.getAlarmsByDevice);
 
// Get unread alarms count

router.get('/unread/count', alarmController.getUnreadAlarmsCount);
 
// Mark alarm as read

router.put('/:alarmId/read', alarmController.markAlarmAsRead);
 
// Mark all alarms as read

router.put('/read/all', alarmController.markAllAlarmsAsRead);
 
module.exports = router;
 