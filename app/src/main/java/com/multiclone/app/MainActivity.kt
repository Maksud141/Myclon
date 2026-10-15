package com.multiclone.app

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import android.view.View
import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView

    @Suppress("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(20, 91, 210)
        window.navigationBarColor = Color.WHITE
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR

        webView = WebView(this)
        webView.setBackgroundColor(Color.WHITE)
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }
        webView.addJavascriptInterface(AndroidAppsBridge(), "AndroidApps")
        setContentView(webView)

        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/www/index.html")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private inner class AndroidAppsBridge {
        @JavascriptInterface
        fun getInstalledAppsJson(): String {
            val result = JSONArray()
            val pm = packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
            val resolved = if (Build.VERSION.SDK_INT >= 33) {
                pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.queryIntentActivities(intent, 0)
            }
            val ownPackage = packageName
            resolved
                .filter { it.activityInfo.packageName != ownPackage }
                .distinctBy { it.activityInfo.packageName }
                .sortedBy { it.loadLabel(pm).toString().lowercase() }
                .forEach { info ->
                    val app = JSONObject()
                    app.put("id", info.activityInfo.packageName)
                    app.put("name", info.loadLabel(pm).toString())
                    app.put("package", info.activityInfo.packageName)
                    app.put("category", "Installed")
                    app.put("glyph", "▣")
                    app.put("css", "installed")
                    result.put(app)
                }
            return result.toString()
        }

        @JavascriptInterface
        fun launchApp(packageName: String): Boolean {
            return try {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return false
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
                true
            } catch (_: Exception) {
                false
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }
}
