package expo.modules.realysupdater

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// O Android avisa o app novo logo depois de substituir o antigo. Reabre o Realys,
// para a pessoa não precisar procurar o ícone. Se o sistema não deixar, ela abre pelo ícone.
class UpdatedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    try {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      context.startActivity(launch)
    } catch (e: Exception) {
      // Android bloqueou abrir em segundo plano: tudo bem, o app já está atualizado.
    }
  }
}
