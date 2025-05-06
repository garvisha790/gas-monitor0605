//layout.js
 
import React from 'react';

import { Box, AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar } from '@mui/material';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import Sidebar from './Sidebar';

import AlarmNotification from './siteView/alarmNotification';

 
const Layout = ({ children }) => {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {

    setAnchorEl(event.currentTarget);

  };
 
  const handleClose = () => {

    setAnchorEl(null);

  };
 
  const handleLogout = () => {

    logout();

    navigate('/login');

    handleClose();

  };
 
  return (
<Box sx={{ display: 'flex' }}>
<AppBar

        position="fixed"

        sx={{

          zIndex: (theme) => theme.zIndex.drawer + 1,

          backgroundColor: 'white',

          color: 'black',

          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'

        }}
>
<Toolbar>
<Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', textAlign: 'center' }}>

            Oxygen Plant Monitor
</Typography>
<div style={{ display: 'flex', alignItems: 'center' }}>
<AlarmNotification />
<IconButton

              size="large"

              aria-label="account of current user"

              aria-controls="menu-appbar"

              aria-haspopup="true"

              onClick={handleMenu}

              color="inherit"
>
<AccountCircleIcon />
</IconButton>
<Menu

              id="menu-appbar"

              anchorEl={anchorEl}

              anchorOrigin={{

                vertical: 'bottom',

                horizontal: 'right',

              }}

              keepMounted

              transformOrigin={{

                vertical: 'top',

                horizontal: 'right',

              }}

              open={Boolean(anchorEl)}

              onClose={handleClose}
>
<MenuItem disabled>{user?.email || 'User'}</MenuItem>
<MenuItem onClick={handleLogout}>Logout</MenuItem>
</Menu>
</div>
</Toolbar>
</AppBar>
<Box sx={{ width: '200px', height: '100vh', backgroundColor: '#0d47a1', color: 'white', position: 'fixed' }}>
<Sidebar />
</Box>
<Box sx={{

        marginLeft: '200px',

        marginTop: '64px', // Add space for the AppBar

        padding: '20px',

        width: 'calc(100% - 200px)'

      }}>

        {children}
</Box>
</Box>

  );

};
 
export default Layout;
 