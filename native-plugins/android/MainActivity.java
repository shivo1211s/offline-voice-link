package app.lovable.lanchat;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.lovable.lanchat.plugins.LanDiscoveryPlugin;
import app.lovable.lanchat.plugins.WebSocketServerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins
        registerPlugin(LanDiscoveryPlugin.class);
        registerPlugin(WebSocketServerPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
