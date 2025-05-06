//alarmnotification 
 
import React, { useState } from 'react';

import { 

  IconButton, 

  Badge, 

  Menu, 

  MenuItem, 

  Typography, 

  List, 

  ListItem, 

  ListItemText, 

  Box, 

  Button,

  Divider

} from '@mui/material';

import NotificationsIcon from '@mui/icons-material/Notifications';

import { useNavigate } from 'react-router-dom';

import { useAlarms } from '../../context/alarmContext';

import { markAllAlarmsAsRead } from '../../services/alarmService';
 
const AlarmNotification = () => {

  const navigate = useNavigate();

  const { unreadCount, alarms, refreshData } = useAlarms();

  const [anchorEl, setAnchorEl] = useState(null);
 
  const handleOpen = (event) => {

    setAnchorEl(event.currentTarget);

  };
 
  const handleClose = () => {

    setAnchorEl(null);

  };
 
  const handleViewAll = () => {
    navigate('/telemetry-dashboard?tab=alarms');
    handleClose(); // If you want to close the dropdown/popover
  };
  
 
  const handleMarkAllRead = async () => {

    try {

      await markAllAlarmsAsRead();

      refreshData();

    } catch (error) {

      console.error('Error marking all alarms as read:', error);

    }

  };
 
  // Get only the 5 most recent alarms for the dropdown

  const recentAlarms = alarms.slice(0, 5);
 
  return (
<>
<IconButton

        size="large"

        color="inherit"

        onClick={handleOpen}

        aria-controls="notification-menu"

        aria-haspopup="true"
>
<Badge badgeContent={unreadCount} color="error">
<NotificationsIcon />
</Badge>
</IconButton>
<Menu

        id="notification-menu"

        anchorEl={anchorEl}

        open={Boolean(anchorEl)}

        onClose={handleClose}

        anchorOrigin={{

          vertical: 'bottom',

          horizontal: 'right',

        }}

        transformOrigin={{

          vertical: 'top',

          horizontal: 'right',

        }}

        PaperProps={{

          style: {

            width: '350px',

            maxHeight: '400px',

          },

        }}
>
<Box sx={{ p: 2 }}>
<Typography variant="h6">Notifications</Typography>

          {unreadCount > 0 && (
<Typography variant="body2" color="text.secondary">

              You have {unreadCount} unread alerts
</Typography>

          )}
</Box>
<Divider />

        {recentAlarms.length > 0 ? (
<List sx={{ maxHeight: '250px', overflow: 'auto' }}>

            {recentAlarms.map((alarm) => (
<ListItem key={alarm._id} sx={{ 

                backgroundColor: alarm.IsRead ? 'inherit' : 'rgba(144, 202, 249, 0.1)',

                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }

              }}>
<ListItemText

                  primary={alarm.AlarmDescription}

                  secondary={
<>
<Typography variant="body2" component="span">

                        {alarm.DeviceName} - {alarm.AlarmCode}
</Typography>
<br />
<Typography variant="caption" component="span">

                        {new Date(alarm.CreatedTimestamp).toLocaleString()}
</Typography>
</>

                  }

                />
</ListItem>

            ))}
</List>

        ) : (
<Box sx={{ p: 2, textAlign: 'center' }}>
<Typography variant="body1">No alarms</Typography>
</Box>

        )}
<Divider />
<Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between' }}>
<Button onClick={handleMarkAllRead} disabled={unreadCount === 0}>

            Mark all read
</Button>
<Button onClick={handleViewAll} color="primary">

            View all alerts
</Button>
</Box>
</Menu>
</>

  );

};
 
export default AlarmNotification;
 