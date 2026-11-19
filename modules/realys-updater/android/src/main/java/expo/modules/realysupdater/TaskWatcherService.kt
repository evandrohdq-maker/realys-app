package expo.modules.realysupdater

import android.app.Service
import android.content.Intent
import android.os.IBinder

// Fechar o Re@lys de verdade encerra o som.
// Minimizado (botão início, voltar 2x, botão minimizar), a rádio/TV/live continua tocando.
// Mas se a pessoa FECHA o app (arrasta para fora na tela de apps abertos), o Android avisa
// este serviço (onTaskRemoved) e ele encerra o Re@lys inteiro: nada fica tocando escondido.
// stopWithTask="false" no manifesto é o que faz o Android chamar o onTaskRemoved.
class TaskWatcherService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

  override fun onTaskRemoved(rootIntent: Intent?) {
    try {
      // Tira o player da barra de notificações e para o som junto com o app.
      (getSystemService(NOTIFICATION_SERVICE) as? android.app.NotificationManager)?.let { nm ->
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
          nm.activeNotifications.filter { it.isOngoing }.forEach { nm.cancel(it.tag, it.id) }
        }
      }
    } catch (e: Throwable) {}
    stopSelf()
    android.os.Process.killProcess(android.os.Process.myPid())
  }
}
