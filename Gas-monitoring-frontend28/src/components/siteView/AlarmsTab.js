import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAlarms } from '../../context/alarmContext';
import { markAlarmAsRead, getAllAlarms } from '../../services/alarmService';

const AlarmsTab = () => {
  // Direct state management for alarms in the component
  const [localAlarms, setLocalAlarms] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(null);
  
  // Context-based alarms (as backup)
  const { alarms: contextAlarms, loading: contextLoading, error: contextError, refreshData } = useAlarms();
  
  // UI state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Directly fetch alarms from the API
  const fetchAlarmsDirectly = async () => {
    try {
      setLocalLoading(true);
      console.log('DIRECT API FETCH - Starting...');
      // Use axios directly for more debugging info
      const response = await axios.get('http://localhost:5000/api/alarms');
      console.log('DIRECT API FETCH - Raw response:', response);
      const data = response.data;
      console.log('DIRECT API FETCH - Alarms data:', data);
      setLocalAlarms(Array.isArray(data) ? data : []);
      setLocalError(null);
    } catch (err) {
      console.error('DIRECT API FETCH ERROR:', err);
      setLocalError(err.message || 'Failed to fetch alarms directly');
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Fetch on mount
  useEffect(() => {
    fetchAlarmsDirectly();
  }, []);
  
  // Also log when context alarms change
  useEffect(() => {
    console.log('Context alarms updated:', contextAlarms);
  }, [contextAlarms]);
  
  // Determine which data source to use
  const displayAlarms = localAlarms.length > 0 ? localAlarms : contextAlarms || [];
  const isLoading = localLoading && contextLoading;
  const displayError = localError || contextError;
 
  const handleChangePage = (event, newPage) => {

    setPage(newPage);

  };
 
  const handleChangeRowsPerPage = (event) => {

    setRowsPerPage(parseInt(event.target.value, 10));

    setPage(0);

  };
  
  const handleMarkAsRead = async (alarmId) => {

    try {

      await markAlarmAsRead(alarmId);

      refreshData();

    } catch (error) {

      console.error('Error marking alarm as read:', error);

    }

  };
 
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
<Box sx={{ mt: 2 }}>
  {/* Status and Debug Info */}
  {displayError && (
    <Alert severity="error" sx={{ mb: 2 }}>
      Error: {displayError}
      <Button
        startIcon={<RefreshIcon />}
        onClick={fetchAlarmsDirectly}
        variant="contained"
        size="small"
        sx={{ ml: 2 }}
      >
        Retry
      </Button>
    </Alert>
  )}
  
  {displayAlarms && displayAlarms.length === 0 && !isLoading && (
    <Alert severity="info" sx={{ mb: 2 }}>
      No alarms found. The database might be empty.
    </Alert>
  )}
  
  {/* Refresh Button */}
  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
    <Button
      startIcon={<RefreshIcon />}
      onClick={fetchAlarmsDirectly}
      variant="outlined"
      size="small"
    >
      Refresh Data
    </Button>
  </Box>

  {/* Search Section */}
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
      <Typography>Search</Typography>
      <input
        type="text"
        placeholder="Search by Alarm Code or Description"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ padding: '8px', width: '300px' }}
      />
    </Box>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Typography>From Date</Typography>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        style={{ padding: '8px' }}
      />
      <Typography>To Date</Typography>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        style={{ padding: '8px' }}
      />
    </Box>
  </Paper>

  {/* Alarms Table */}
  <Paper elevation={2}>
    <TableContainer>
      <Table>
<TableHead>
  <TableRow>
    <TableCell>Alarm Id</TableCell>
    <TableCell>Alarm Code</TableCell>
    <TableCell>Alarm Name</TableCell>
    <TableCell>Alarm Generated Time</TableCell>
    <TableCell>Alarm Description</TableCell>
    <TableCell>Alarm Status</TableCell>
    <TableCell>Actions</TableCell>
  </TableRow>
</TableHead>
<TableBody>

              {(displayAlarms || [])
  .filter(alarm => {
    // Apply search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      (alarm.AlarmCode && alarm.AlarmCode.toLowerCase().includes(searchLower)) ||
      (alarm.AlarmDescription && alarm.AlarmDescription.toLowerCase().includes(searchLower));

    // Apply date filters
    const alarmDate = new Date(alarm.CreatedTimestamp);
    const matchesFromDate = !fromDate || alarmDate >= new Date(fromDate);
    const matchesToDate = !toDate || alarmDate <= new Date(toDate);

    return matchesSearch && matchesFromDate && matchesToDate;
  })
  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  .map((alarm) => (
    <TableRow key={alarm._id} hover>
      <TableCell>{alarm.AlarmId || '-'}</TableCell>
      <TableCell>{alarm.AlarmCode || '-'}</TableCell>
      <TableCell>{alarm.AlarmCode || '-'}</TableCell>
      <TableCell>
        {alarm.CreatedTimestamp ? 
          new Date(alarm.CreatedTimestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }) : '-'}
      </TableCell>
      <TableCell>{alarm.AlarmDescription || '-'}</TableCell>
      <TableCell>
        <Chip 
          icon={<WarningIcon />} 
          label={alarm.AlarmCode && alarm.AlarmCode.includes('HIGH') ? "HIGH" : "LOW"} 
          color={alarm.AlarmCode && alarm.AlarmCode.includes('HIGH') ? "error" : "warning"} 
          size="small" 
          sx={{ minWidth: '90px' }}
        />
      </TableCell>
      <TableCell>
        {!alarm.IsRead && (
          <Tooltip title="Mark as read">
            <IconButton size="small" onClick={() => handleMarkAsRead(alarm._id)}>
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  ))}
</TableBody>
</Table>
</TableContainer>
<TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={(displayAlarms || []).length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
</Paper>
</Box>

  );

};
 
export default AlarmsTab;
 