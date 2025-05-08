/**
 * WebSocket Service for real-time data
 * Handles connections to the WebSocket server and provides methods for subscribing to channels
 */

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageHandlers = {
      telemetry: new Set(),
      alarm: new Set(),
      connection: new Set()
    };
    this.deviceSubscriptions = new Map(); // Map device IDs to handler functions
  }

  /**
   * Connect to the WebSocket server
   * @param {string} deviceId - Optional device ID to subscribe to specific device telemetry
   * @returns {Promise} - Resolves when connected, rejects on failure
   */
  connect(deviceId = null) {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        let wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5000/ws?clientType=consumer`;
        
        // Add device ID to URL if provided (for device-specific telemetry)
        if (deviceId) {
          wsUrl += `&deviceId=${deviceId}`;
        }
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Notify connection handlers
          this.messageHandlers.connection.forEach(handler => 
            handler({ type: 'connection', status: 'connected' }));
          
          resolve();
        };

        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
          
          // Notify connection handlers
          this.messageHandlers.connection.forEach(handler => 
            handler({ type: 'connection', status: 'disconnected' }));
          
          this._attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Route messages to appropriate handlers based on type
            if (message.type === 'telemetry') {
              this._handleTelemetryMessage(message);
            } else if (message.type === 'alarm') {
              this._handleAlarmMessage(message);
            } else if (message.type === 'connection') {
              // Connection confirmation messages
              this.messageHandlers.connection.forEach(handler => handler(message));
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Subscribe to telemetry updates
   * @param {Function} handler - Function to call when telemetry data is received
   * @returns {Function} - Unsubscribe function
   */
  subscribeTelemetry(handler) {
    this.messageHandlers.telemetry.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.telemetry.delete(handler);
    };
  }

  /**
   * Subscribe to device-specific telemetry
   * @param {string} deviceId - Device ID to subscribe to
   * @param {Function} handler - Function to call when telemetry data is received
   * @returns {Function} - Unsubscribe function
   */
  subscribeDeviceTelemetry(deviceId, handler) {
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set());
      
      // If already connected, reconnect with device ID to subscribe on server
      if (this.isConnected) {
        this.disconnect().then(() => this.connect(deviceId));
      }
    }
    
    this.deviceSubscriptions.get(deviceId).add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.deviceSubscriptions.get(deviceId);
      if (handlers) {
        handlers.delete(handler);
        
        // If no more handlers for this device, remove from map
        if (handlers.size === 0) {
          this.deviceSubscriptions.delete(deviceId);
          
          // Reconnect without device ID to unsubscribe from server
          if (this.isConnected) {
            this.disconnect().then(() => this.connect());
          }
        }
      }
    };
  }

  /**
   * Subscribe to alarm updates
   * @param {Function} handler - Function to call when alarm data is received
   * @returns {Function} - Unsubscribe function
   */
  subscribeAlarms(handler) {
    this.messageHandlers.alarm.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.alarm.delete(handler);
    };
  }

  /**
   * Subscribe to connection status updates
   * @param {Function} handler - Function to call when connection status changes
   * @returns {Function} - Unsubscribe function
   */
  subscribeConnection(handler) {
    this.messageHandlers.connection.add(handler);
    
    // Immediately call handler with current status
    if (this.isConnected) {
      handler({ type: 'connection', status: 'connected' });
    } else {
      handler({ type: 'connection', status: 'disconnected' });
    }
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.connection.delete(handler);
    };
  }

  /**
   * Disconnect from the WebSocket server
   * @returns {Promise} - Resolves when disconnected
   */
  disconnect() {
    return new Promise((resolve) => {
      if (this.socket && this.isConnected) {
        this.socket.onclose = () => {
          this.isConnected = false;
          resolve();
        };
        this.socket.close();
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle telemetry messages from WebSocket
   * @param {Object} message - Telemetry message
   * @private
   */
  _handleTelemetryMessage(message) {
    // Notify all telemetry subscribers
    this.messageHandlers.telemetry.forEach(handler => handler(message));
    
    // Notify device-specific subscribers if applicable
    const deviceId = message.device || message.deviceId;
    if (deviceId && this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.get(deviceId).forEach(handler => handler(message));
    }
  }

  /**
   * Handle alarm messages from WebSocket
   * @param {Object} message - Alarm message
   * @private
   */
  _handleAlarmMessage(message) {
    // Notify all alarm subscribers
    this.messageHandlers.alarm.forEach(handler => handler(message));
  }

  /**
   * Attempt to reconnect to the WebSocket server
   * @private
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: Wait longer after each failed attempt
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (Attempt ${this.reconnectAttempts})`);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        // If reconnect fails, the onclose handler will trigger another attempt
      });
    }, delay);
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
