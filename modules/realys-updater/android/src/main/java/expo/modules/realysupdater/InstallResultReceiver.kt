package expo.modules.realysupdater

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build

// Resultado da instalação. Se o Android pedir confirmação (Android antigo ou primeira vez),
// abre a tela dele. Sucesso no próprio app: o Android fecha o Re@lys e o UpdatedReceiver reabre.
class InstallResultReceiver : BroadcastReceiver() {
  companion object {
    var listener: ((String, String?) -> Unit)? = null
  }

  override fun onReceive(context: Context, intent: Intent) {
    val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
    val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
    when (status) {
      PackageInstaller.STATUS_PENDING_USER_ACTION -> {
        val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33) {
          intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
        } else {
          @Suppress("DEPRECATION")
          intent.getParcelableExtra(Intent.EXTRA_INTENT)
        }
        if (confirm != null) {
          confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          try {
            context.startActivity(confirm)
          } catch (e: Exception) {
            listener?.invoke("failed", e.message)
            return
          }
        }
        listener?.invoke("confirm", message)
      }
      PackageInstaller.STATUS_SUCCESS -> listener?.invoke("success", message)
      PackageInstaller.STATUS_FAILURE_ABORTED -> listener?.invoke("cancelled", message)
      else -> listener?.invoke("failed", message)
    }
  }
}
