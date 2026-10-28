package expo.modules.hcekey

import android.content.Context
import android.content.SharedPreferences
import android.nfc.NfcAdapter
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HceKeyModule : Module() {

    private val ctx: Context
        get() = appContext.reactContext ?: throw IllegalStateException("Sin contexto")

    private val prefs: SharedPreferences
        get() = ctx.getSharedPreferences("llave", Context.MODE_PRIVATE)

    override fun definition() = ModuleDefinition {
        Name("HceKey")

        Function("setUser") { user: String ->
            prefs.edit().putString("usuario", user).apply()
        }

        Function("getUser") {
            prefs.getString("usuario", "") ?: ""
        }

        Function("isNfcEnabled") {
            try {
                NfcAdapter.getDefaultAdapter(ctx)?.isEnabled ?: false
            } catch (e: Exception) {
                false
            }
        }
    }
}
