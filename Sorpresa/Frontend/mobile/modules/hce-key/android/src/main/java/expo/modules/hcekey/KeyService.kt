package expo.modules.hcekey

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

class KeyService : HostApduService() {

    companion object {
        private val AID = byteArrayOf(
            0xF0.toByte(), 0x01, 0x02, 0x03, 0x04, 0x05, 0x06
        )
        private val SW_OK = byteArrayOf(0x90.toByte(), 0x00)
        private val SW_NO_USER = byteArrayOf(0x69, 0x85.toByte())
        private val SW_UNKNOWN = byteArrayOf(0x6D, 0x00)
    }

    override fun processCommandApdu(apdu: ByteArray, extras: Bundle?): ByteArray {
        if (apdu.size >= 5 + AID.size &&
            apdu[0] == 0x00.toByte() && apdu[1] == 0xA4.toByte() &&
            apdu[2] == 0x04.toByte() &&
            apdu.copyOfRange(5, 5 + AID.size).contentEquals(AID)
        ) {
            val user = getSharedPreferences("llave", MODE_PRIVATE)
                .getString("usuario", "") ?: ""
            if (user.isEmpty()) return SW_NO_USER
            return user.toByteArray(Charsets.UTF_8) + SW_OK
        }
        return SW_UNKNOWN
    }

    override fun onDeactivated(reason: Int) {}
}
