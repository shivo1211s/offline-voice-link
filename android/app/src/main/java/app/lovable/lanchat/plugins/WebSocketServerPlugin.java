package app.lovable.lanchat.plugins;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.InetSocketAddress;
import java.net.URI;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "WebSocketServer")
public class WebSocketServerPlugin extends Plugin {
    private static final String TAG = "WebSocketServer";
    
    private LANChatServer server;
    private ConcurrentHashMap<String, WebSocket> serverClients = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, WebSocketClient> peerConnections = new ConcurrentHashMap<>();
    private int serverPort = 8765;
    
    @PluginMethod
    public void start(PluginCall call) {
        int port = call.getInt("port", 8765);
        serverPort = port;
        
        try {
            if (server != null) {
                server.stop();
            }
            
            server = new LANChatServer(new InetSocketAddress(port));
            server.start();
            
            JSObject result = new JSObject();
            result.put("port", port);
            call.resolve(result);
            
            Log.d(TAG, "WebSocket server started on port " + port);
        } catch (Exception e) {
            call.reject("Failed to start server", e);
        }
    }
    
    @PluginMethod
    public void stop(PluginCall call) {
        try {
            // Close all peer connections
            for (WebSocketClient client : peerConnections.values()) {
                client.close();
            }
            peerConnections.clear();
            serverClients.clear();
            
            if (server != null) {
                server.stop();
                server = null;
            }
            
            call.resolve();
            Log.d(TAG, "WebSocket server stopped");
        } catch (Exception e) {
            call.reject("Failed to stop server", e);
        }
    }
    
    @PluginMethod
    public void send(PluginCall call) {
        String clientId = call.getString("clientId");
        String data = call.getString("data");
        
        if (clientId == null || data == null) {
            call.reject("clientId and data are required");
            return;
        }
        
        // Try server clients first
        WebSocket serverClient = serverClients.get(clientId);
        if (serverClient != null && serverClient.isOpen()) {
            serverClient.send(data);
            call.resolve();
            return;
        }
        
        // Try peer connections
        WebSocketClient peerClient = peerConnections.get(clientId);
        if (peerClient != null && peerClient.isOpen()) {
            peerClient.send(data);
            call.resolve();
            return;
        }
        
        call.reject("Client not found: " + clientId);
    }
    
    @PluginMethod
    public void broadcast(PluginCall call) {
        String data = call.getString("data");
        
        if (data == null) {
            call.reject("data is required");
            return;
        }
        
        // Send to all server clients
        for (WebSocket client : serverClients.values()) {
            if (client.isOpen()) {
                client.send(data);
            }
        }
        
        // Send to all peer connections
        for (WebSocketClient client : peerConnections.values()) {
            if (client.isOpen()) {
                client.send(data);
            }
        }
        
        call.resolve();
    }
    
    @PluginMethod
    public void connectToPeer(PluginCall call) {
        String ip = call.getString("ip");
        int port = call.getInt("port", 8765);
        
        if (ip == null) {
            call.reject("ip is required");
            return;
        }
        
        String clientId = ip + ":" + port;
        
        // Don't reconnect if already connected
        if (peerConnections.containsKey(clientId)) {
            JSObject result = new JSObject();
            result.put("clientId", clientId);
            call.resolve(result);
            return;
        }
        
        try {
            URI uri = new URI("ws://" + ip + ":" + port);
            WebSocketClient client = new WebSocketClient(uri) {
                @Override
                public void onOpen(ServerHandshake handshake) {
                    peerConnections.put(clientId, this);
                    
                    JSObject data = new JSObject();
                    data.put("clientId", clientId);
                    notifyListeners("clientConnected", data);
                    
                    Log.d(TAG, "Connected to peer: " + clientId);
                }
                
                @Override
                public void onMessage(String message) {
                    JSObject data = new JSObject();
                    data.put("clientId", clientId);
                    data.put("data", message);
                    notifyListeners("messageReceived", data);
                }
                
                @Override
                public void onClose(int code, String reason, boolean remote) {
                    peerConnections.remove(clientId);
                    
                    JSObject data = new JSObject();
                    data.put("clientId", clientId);
                    notifyListeners("clientDisconnected", data);
                    
                    Log.d(TAG, "Disconnected from peer: " + clientId);
                }
                
                @Override
                public void onError(Exception ex) {
                    Log.e(TAG, "Peer connection error: " + ex.getMessage());
                }
            };
            
            client.connect();
            
            JSObject result = new JSObject();
            result.put("clientId", clientId);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to connect to peer", e);
        }
    }
    
    @PluginMethod
    public void disconnectFromPeer(PluginCall call) {
        String clientId = call.getString("clientId");
        
        if (clientId == null) {
            call.reject("clientId is required");
            return;
        }
        
        WebSocketClient client = peerConnections.remove(clientId);
        if (client != null) {
            client.close();
        }
        
        call.resolve();
    }
    
    @PluginMethod
    public void getConnectedClients(PluginCall call) {
        JSArray clients = new JSArray();
        
        for (String clientId : serverClients.keySet()) {
            clients.put(clientId);
        }
        
        for (String clientId : peerConnections.keySet()) {
            clients.put(clientId);
        }
        
        JSObject result = new JSObject();
        result.put("clients", clients);
        call.resolve(result);
    }
    
    private class LANChatServer extends WebSocketServer {
        public LANChatServer(InetSocketAddress address) {
            super(address);
        }
        
        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            String clientId = conn.getRemoteSocketAddress().toString();
            serverClients.put(clientId, conn);
            
            JSObject data = new JSObject();
            data.put("clientId", clientId);
            notifyListeners("clientConnected", data);
            
            Log.d(TAG, "Client connected: " + clientId);
        }
        
        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            String clientId = conn.getRemoteSocketAddress().toString();
            serverClients.remove(clientId);
            
            JSObject data = new JSObject();
            data.put("clientId", clientId);
            notifyListeners("clientDisconnected", data);
            
            Log.d(TAG, "Client disconnected: " + clientId);
        }
        
        @Override
        public void onMessage(WebSocket conn, String message) {
            String clientId = conn.getRemoteSocketAddress().toString();
            
            JSObject data = new JSObject();
            data.put("clientId", clientId);
            data.put("data", message);
            notifyListeners("messageReceived", data);
        }
        
        @Override
        public void onError(WebSocket conn, Exception ex) {
            Log.e(TAG, "Server error: " + ex.getMessage());
        }
        
        @Override
        public void onStart() {
            Log.d(TAG, "Server started successfully");
        }
    }
}
