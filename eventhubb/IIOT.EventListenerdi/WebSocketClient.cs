using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace IIOT.EventListener
{
    public class WebSocketClient
    {
        private readonly ILogger _logger;
        private ClientWebSocket _client;
        private readonly string _serverUrl;
        private bool _isConnected;
        private readonly SemaphoreSlim _connectionSemaphore = new SemaphoreSlim(1, 1);
        
        public WebSocketClient(ILogger logger, string serverUrl)
        {
            _logger = logger;
            _serverUrl = serverUrl;
            _client = new ClientWebSocket();
        }
        
        public async Task EnsureConnectedAsync()
        {
            await _connectionSemaphore.WaitAsync();
            
            try
            {
                if (_client.State != WebSocketState.Open)
                {
                    _logger.LogInformation($"Connecting to WebSocket server at {_serverUrl}");
                    
                    // Create a new client if needed
                    if (_client.State == WebSocketState.Aborted || _client.State == WebSocketState.Closed)
                    {
                        _client = new ClientWebSocket();
                    }
                    
                    // Connect to the WebSocket server
                    var uri = new Uri(_serverUrl);
                    var cts = new CancellationTokenSource();
                    cts.CancelAfter(TimeSpan.FromSeconds(10)); // 10 second timeout
                    
                    try
                    {
                        await _client.ConnectAsync(uri, cts.Token);
                        _isConnected = true;
                        _logger.LogInformation("Successfully connected to WebSocket server");
                        
                        // Start the background receiver
                        _ = ReceiveMessagesAsync();
                    }
                    catch (Exception ex)
                    {
                        _isConnected = false;
                        _logger.LogError(ex, $"Failed to connect to WebSocket server: {ex.Message}");
                    }
                }
            }
            finally
            {
                _connectionSemaphore.Release();
            }
        }
        
        private async Task ReceiveMessagesAsync()
        {
            var buffer = new byte[4096];
            try
            {
                while (_client.State == WebSocketState.Open)
                {
                    WebSocketReceiveResult result = await _client.ReceiveAsync(
                        new ArraySegment<byte>(buffer), CancellationToken.None);
                    
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await _client.CloseAsync(WebSocketCloseStatus.NormalClosure, 
                            string.Empty, CancellationToken.None);
                        _isConnected = false;
                        _logger.LogInformation("WebSocket connection closed by server");
                        break;
                    }
                    
                    string message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    _logger.LogDebug($"Received message from WebSocket server: {message}");
                }
            }
            catch (Exception ex)
            {
                _isConnected = false;
                _logger.LogError(ex, $"Error receiving messages: {ex.Message}");
            }
        }
        
        public async Task SendTelemetryAsync(JObject telemetryData, string deviceName)
        {
            if (!_isConnected)
            {
                await EnsureConnectedAsync();
                if (!_isConnected) return;
            }
            
            try
            {
                // Create a message with the telemetry data
                var message = new JObject
                {
                    ["type"] = "telemetry",
                    ["device"] = deviceName,
                    ["timestamp"] = DateTime.UtcNow.ToString("o")
                };
                
                // Add all telemetry values from the original data
                foreach (var prop in telemetryData.Properties())
                {
                    if (prop.Name != "type" && prop.Name != "device" && prop.Name != "timestamp")
                    {
                        message[prop.Name] = prop.Value;
                    }
                }
                
                await SendMessageAsync(message.ToString());
                _logger.LogDebug($"Sent telemetry data for device {deviceName}");
            }
            catch (Exception ex)
            {
                _isConnected = false;
                _logger.LogError(ex, $"Error sending telemetry: {ex.Message}");
            }
        }
        
        public async Task SendAlarmAsync(JObject deviceData, string deviceName)
        {
            if (!_isConnected)
            {
                await EnsureConnectedAsync();
                if (!_isConnected) return;
            }
            
            try
            {
                // Create a message with the alarm data
                var message = new JObject
                {
                    ["type"] = "alarm",
                    ["device"] = deviceName,
                    ["timestamp"] = DateTime.UtcNow.ToString("o"),
                    ["alerts"] = deviceData["alerts"]
                };
                
                await SendMessageAsync(message.ToString());
                _logger.LogDebug($"Sent alarm data for device {deviceName}");
            }
            catch (Exception ex)
            {
                _isConnected = false;
                _logger.LogError(ex, $"Error sending alarm: {ex.Message}");
            }
        }
        
        private async Task SendMessageAsync(string message)
        {
            byte[] buffer = Encoding.UTF8.GetBytes(message);
            await _client.SendAsync(new ArraySegment<byte>(buffer), 
                WebSocketMessageType.Text, true, CancellationToken.None);
        }
        
        public async Task CloseAsync()
        {
            if (_client.State == WebSocketState.Open)
            {
                try
                {
                    await _client.CloseAsync(WebSocketCloseStatus.NormalClosure, 
                        "Closing connection", CancellationToken.None);
                    _isConnected = false;
                    _logger.LogInformation("WebSocket connection closed");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error closing connection: {ex.Message}");
                }
            }
        }
    }
}