package app.lovable.lanchat.plugins;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "LanDiscovery")
public class LanDiscoveryPlugin extends Plugin {
    private static final String TAG = "LanDiscovery";
    private static final String SERVICE_TYPE = "_lanchat._tcp.";
    
    private NsdManager nsdManager;
    private NsdManager.RegistrationListener registrationListener;
    private NsdManager.DiscoveryListener discoveryListener;
    private NsdManager.ResolveListener resolveListener;
    
    private ConcurrentHashMap<String, JSObject> discoveredPeers = new ConcurrentHashMap<>();
    private String serviceName;
    private int servicePort;
    private boolean isDiscovering = false;
    private boolean isRegistered = false;
    
    @Override
    public void load() {
        nsdManager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
    }
    
    @PluginMethod
    public void startAdvertising(PluginCall call) {
        serviceName = call.getString("serviceName", "LANChat-" + System.currentTimeMillis());
        servicePort = call.getInt("port", 8765);
        
        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        serviceInfo.setServiceName(serviceName);
        serviceInfo.setServiceType(SERVICE_TYPE);
        serviceInfo.setPort(servicePort);
        
        registrationListener = new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo info) {
                serviceName = info.getServiceName();
                isRegistered = true;
                Log.d(TAG, "Service registered: " + serviceName);
            }
            
            @Override
            public void onRegistrationFailed(NsdServiceInfo info, int errorCode) {
                Log.e(TAG, "Registration failed: " + errorCode);
            }
            
            @Override
            public void onServiceUnregistered(NsdServiceInfo info) {
                isRegistered = false;
                Log.d(TAG, "Service unregistered");
            }
            
            @Override
            public void onUnregistrationFailed(NsdServiceInfo info, int errorCode) {
                Log.e(TAG, "Unregistration failed: " + errorCode);
            }
        };
        
        try {
            nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to register service", e);
        }
    }
    
    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        if (registrationListener != null && isRegistered) {
            try {
                nsdManager.unregisterService(registrationListener);
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering service", e);
            }
        }
        isRegistered = false;
        call.resolve();
    }
    
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (isDiscovering) {
            call.resolve();
            return;
        }
        
        discoveryListener = new NsdManager.DiscoveryListener() {
            @Override
            public void onDiscoveryStarted(String serviceType) {
                isDiscovering = true;
                Log.d(TAG, "Discovery started");
            }
            
            @Override
            public void onServiceFound(NsdServiceInfo serviceInfo) {
                Log.d(TAG, "Service found: " + serviceInfo.getServiceName());
                // Don't resolve our own service
                if (serviceInfo.getServiceName().equals(serviceName)) {
                    return;
                }
                resolveService(serviceInfo);
            }
            
            @Override
            public void onServiceLost(NsdServiceInfo serviceInfo) {
                String peerId = serviceInfo.getServiceName();
                JSObject peer = discoveredPeers.remove(peerId);
                if (peer != null) {
                    notifyListeners("peerLost", peer);
                }
                Log.d(TAG, "Service lost: " + peerId);
            }
            
            @Override
            public void onDiscoveryStopped(String serviceType) {
                isDiscovering = false;
                Log.d(TAG, "Discovery stopped");
            }
            
            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                isDiscovering = false;
                Log.e(TAG, "Discovery failed: " + errorCode);
            }
            
            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {
                Log.e(TAG, "Stop discovery failed: " + errorCode);
            }
        };
        
        try {
            nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start discovery", e);
        }
    }
    
    private void resolveService(NsdServiceInfo serviceInfo) {
        NsdManager.ResolveListener resolver = new NsdManager.ResolveListener() {
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                Log.e(TAG, "Resolve failed: " + errorCode);
            }
            
            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                InetAddress host = serviceInfo.getHost();
                int port = serviceInfo.getPort();
                String name = serviceInfo.getServiceName();
                
                JSObject peer = new JSObject();
                peer.put("id", name);
                peer.put("name", name);
                peer.put("ip", host.getHostAddress());
                peer.put("port", port);
                
                discoveredPeers.put(name, peer);
                notifyListeners("peerFound", peer);
                
                Log.d(TAG, "Service resolved: " + name + " at " + host.getHostAddress() + ":" + port);
            }
        };
        
        try {
            nsdManager.resolveService(serviceInfo, resolver);
        } catch (Exception e) {
            Log.e(TAG, "Error resolving service", e);
        }
    }
    
    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (discoveryListener != null && isDiscovering) {
            try {
                nsdManager.stopServiceDiscovery(discoveryListener);
            } catch (Exception e) {
                Log.e(TAG, "Error stopping discovery", e);
            }
        }
        isDiscovering = false;
        call.resolve();
    }
    
    @PluginMethod
    public void getDiscoveredPeers(PluginCall call) {
        JSArray peersArray = new JSArray();
        for (JSObject peer : discoveredPeers.values()) {
            peersArray.put(peer);
        }
        
        JSObject result = new JSObject();
        result.put("peers", peersArray);
        call.resolve(result);
    }
    
    @PluginMethod
    public void getLocalIp(PluginCall call) {
        String ip = getLocalIpAddress();
        JSObject result = new JSObject();
        result.put("ip", ip != null ? ip : "0.0.0.0");
        call.resolve(result);
    }
    
    private String getLocalIpAddress() {
        try {
            // Try WiFi first
            WifiManager wifiManager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifiManager != null) {
                int ipInt = wifiManager.getConnectionInfo().getIpAddress();
                if (ipInt != 0) {
                    return String.format("%d.%d.%d.%d",
                            (ipInt & 0xff),
                            (ipInt >> 8 & 0xff),
                            (ipInt >> 16 & 0xff),
                            (ipInt >> 24 & 0xff));
                }
            }
            
            // Fallback to network interfaces
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface ni : interfaces) {
                List<InetAddress> addresses = Collections.list(ni.getInetAddresses());
                for (InetAddress addr : addresses) {
                    if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') < 0) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting local IP", e);
        }
        return null;
    }
}
