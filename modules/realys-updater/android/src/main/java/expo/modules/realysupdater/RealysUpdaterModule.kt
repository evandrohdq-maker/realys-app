package expo.modules.realysupdater

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.media.AudioManager
import android.os.SystemClock
import android.view.KeyEvent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// Atualização do próprio Re@lys pelo instalador de pacotes do Android (PackageInstaller).
// No Android 12+ o app pede "sem ação do usuário": como é o próprio Re@lys se atualizando,
// com a mesma assinatura, o Android instala por cima sem perguntar.
// Única exigência do Android: a chave "Instalar apps desconhecidos" do Re@lys ligada uma vez.
// Se o Android ainda assim exigir confirmação, abre a tela normal dele (nunca trava).
class RealysUpdaterModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "Contexto do app indisponível" }

  override fun definition() = ModuleDefinition {
    Name("RealysUpdater")
    Events("onInstallStatus")

    OnCreate {
      InstallResultReceiver.listener = { status, message ->
        sendEvent("onInstallStatus", mapOf("status" to status, "message" to (message ?: "")))
      }
      // Lives de jogos: transmitir a TELA do celular. O Android exige um serviço em primeiro plano
      // (com aviso na barra de notificações) enquanto a tela é capturada. O react-native-webrtc já
      // traz esse serviço, mas ele vem desligado: aqui ele é ligado (sem depender da versão da biblioteca).
      try {
        val cls = Class.forName("com.oney.WebRTCModule.WebRTCModuleOptions")
        val options = cls.getMethod("getInstance").invoke(null)
        cls.getField("enableMediaProjectionService").setBoolean(options, true)
      } catch (e: Throwable) {
        // biblioteca de vídeo ausente ou diferente: a live de tela fica indisponível, o resto segue normal
      }
    }
    OnDestroy { InstallResultReceiver.listener = null }

    // Música de outro app (Spotify, YouTube Music, rádio…) tocando agora?
    // A Lotus usa isso para não pausar a música: com música tocando, o "abrir Lotus" fica desligado.
    Function("isMusicActive") {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      am?.isMusicActive ?: false
    }

    // Dá "play" de novo no app de música que estava tocando (o microfone do Google pausa a música
    // enquanto ouve a Lotus). É o mesmo botão de play do fone/volante do carro.
    Function("resumeMusic") {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      if (am != null && !am.isMusicActive) {
        val t = SystemClock.uptimeMillis()
        am.dispatchMediaKeyEvent(KeyEvent(t, t, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY, 0))
        am.dispatchMediaKeyEvent(KeyEvent(t, t, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY, 0))
      }
    }

    // true no Android 12 ou mais novo: dá para atualizar sem a tela de confirmação.
    Function("supportsSilentUpdate") { Build.VERSION.SDK_INT >= Build.VERSION_CODES.S }

    // A chave "Instalar apps desconhecidos" do Re@lys está ligada?
    Function("canRequestInstalls") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.O || context.packageManager.canRequestPackageInstalls()
    }

    // Abre direto a chave "Instalar apps desconhecidos" do Re@lys nas configurações.
    Function("openInstallPermission") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + context.packageName))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    // Copia o APK baixado para uma sessão de instalação, apaga o arquivo e pede a instalação.
    AsyncFunction("install") { fileUri: String ->
      val path = Uri.parse(fileUri).path ?: fileUri
      val apk = File(path)
      if (!apk.exists()) throw IllegalStateException("Arquivo da atualização não encontrado")

      val installer = context.packageManager.packageInstaller
      val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
      params.setAppPackageName(context.packageName)
      params.setSize(apk.length())
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
      }

      val sessionId = installer.createSession(params)
      val session = installer.openSession(sessionId)
      try {
        session.openWrite("realys.apk", 0, apk.length()).use { out ->
          apk.inputStream().use { it.copyTo(out) }
          session.fsync(out)
        }
        // O Android já tem a cópia: o arquivo baixado não serve mais.
        apk.delete()

        val result = Intent(context, InstallResultReceiver::class.java).setPackage(context.packageName)
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags = flags or PendingIntent.FLAG_MUTABLE
        val pending = PendingIntent.getBroadcast(context, sessionId, result, flags)
        session.commit(pending.intentSender)
      } catch (e: Exception) {
        session.abandon()
        throw e
      } finally {
        session.close()
      }
      sessionId
    }
  }
}
