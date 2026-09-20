package com.vertexerp.cobrador;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Garantizar explícitamente que las capturas de pantalla estén permitidas en la app
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }
}
