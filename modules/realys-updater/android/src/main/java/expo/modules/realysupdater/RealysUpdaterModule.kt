package expo.modules.realysupdater

import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.util.Rational
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

  // Ouve a entrada e a saída da janelinha sem depender de versão de biblioteca: o Android chama o
  // ouvinte (Consumer do androidx) que é ligado aqui por reflexão. Sem suporte, nada acontece.
  private var pipHooked = false
  private fun hookPip() {
    if (pipHooked) return
    val act = appContext.currentActivity ?: return
    try {
      val consumerCls = Class.forName("androidx.core.util.Consumer")
      var self: Any? = null
      val handler = java.lang.reflect.InvocationHandler { _, method, args ->
        when (method.name) {
          "accept" -> {
            val info = args?.getOrNull(0)
            val inPip = try {
              info?.javaClass?.getMethod("isInPictureInPictureMode")?.invoke(info) as? Boolean ?: false
            } catch (e: Throwable) {
              false
            }
            try {
              sendEvent("onPipChange", mapOf("inPip" to inPip, "closed" to false))
            } catch (e: Throwable) {}
            // Saiu da janelinha: tocou para abrir (o app volta) ou fechou no X (o app fica parado).
            // Confere aqui no Android, sem depender do app, e avisa "fechou" para parar o som.
            if (!inPip) {
              android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                val resumed = try {
                  val lc = act.javaClass.getMethod("getLifecycle").invoke(act)
                  val state = lc.javaClass.getMethod("getCurrentState").invoke(lc)
                  state.toString() == "RESUMED"
                } catch (e: Throwable) {
                  act.hasWindowFocus()
                }
                if (!resumed) {
                  try {
                    sendEvent("onPipChange", mapOf("inPip" to false, "closed" to true))
                  } catch (e: Throwable) {}
                }
              }, 600)
            }
            null
          }
          "hashCode" -> System.identityHashCode(self)
          "equals" -> (args?.getOrNull(0) === self)
          "toString" -> "RealysPipListener"
          else -> null
        }
      }
      val proxy = java.lang.reflect.Proxy.newProxyInstance(consumerCls.classLoader, arrayOf(consumerCls), handler)
      self = proxy
      act.javaClass.getMethod("addOnPictureInPictureModeChangedListener", consumerCls).invoke(act, proxy)
      pipHooked = true
    } catch (e: Throwable) {
      // Android ou biblioteca sem o ouvinte: o app usa o plano B (confere ao voltar para o app).
    }
  }

  override fun definition() = ModuleDefinition {
    Name("RealysUpdater")
    Events("onInstallStatus", "onPipChange")

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
    // Avisa o app quando entra e sai da janelinha (picture-in-picture), para ele mostrar só o player.
    OnActivityEntersForeground { hookPip() }

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

    // ---------- Janelinha por cima dos outros apps (picture-in-picture), como no YouTube ----------
    // Usada pela rádio (mostra a logo): o Re@lys inteiro vira uma janelinha no canto da tela, que a
    // pessoa arrasta, fecha no X ou toca para voltar. A TV usa a do próprio player de vídeo.
    Function("canPip") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
    }

    // Android 12+: sair do app (botão início) já abre a janelinha sozinho enquanto estiver ligado.
    Function("setAutoPip") { enabled: Boolean, w: Int, h: Int ->
      hookPip()
      val act = appContext.currentActivity
      if (act != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        act.runOnUiThread {
          try {
            val b = PictureInPictureParams.Builder().setAspectRatio(Rational(w, h))
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
              b.setAutoEnterEnabled(enabled)
              b.setSeamlessResizeEnabled(false)
            }
            act.setPictureInPictureParams(b.build())
          } catch (e: Throwable) {
            // celular sem suporte: a rádio continua tocando com o controle na barra de notificações
          }
        }
        true
      } else {
        false
      }
    }

    // Abre a janelinha agora (botão do player).
    Function("enterPip") { w: Int, h: Int ->
      hookPip()
      val act = appContext.currentActivity
      if (act != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        act.runOnUiThread {
          try {
            act.enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(Rational(w, h)).build())
          } catch (e: Throwable) {}
        }
        true
      } else {
        false
      }
    }

    // Minimizar o Re@lys (botão minimizar do player e voltar 2x): o app vai para segundo plano
    // e o som continua. Com algo tocando e janelinha liberada, vira a janelinha do player;
    // sem janelinha, o app só sai da frente (o som segue, com o controle na barra de notificações).
    Function("minimize") { pip: Boolean, w: Int, h: Int ->
      hookPip()
      val act = appContext.currentActivity
      if (act == null) {
        false
      } else {
        act.runOnUiThread {
          var done = false
          if (pip && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            act.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
            done = try {
              act.enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(Rational(w, h)).build())
            } catch (e: Throwable) {
              false
            }
          }
          if (!done) {
            try {
              act.moveTaskToBack(true)
            } catch (e: Throwable) {}
          }
        }
        true
      }
    }

    // Liga o "vigia" que encerra o som quando a pessoa fecha o app (TaskWatcherService).
    Function("watchTask") { on: Boolean ->
      try {
        val i = Intent(context, TaskWatcherService::class.java)
        if (on) context.startService(i) else context.stopService(i)
        true
      } catch (e: Throwable) {
        false
      }
    }

    Function("isInPip") {
      val act = appContext.currentActivity
      act != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && act.isInPictureInPictureMode
    }

    // true no Android 12 ou mais novo: dá para atualizar sem a tela de confirmação.
    // ---------- Vídeo em tela cheia (TV, clipes e lives) ----------
    // O Re@lys é em pé. Com um vídeo aberto, ele passa a girar junto com o celular ("auto", respeita a
    // trava de rotação do Android); o botão de tela cheia deita na marra ("landscape"); ao sair volta em pé.
    Function("setOrientation") { mode: String ->
      val act = appContext.currentActivity
      if (act == null) {
        false
      } else {
        act.runOnUiThread {
          try {
            act.requestedOrientation = when (mode) {
              "auto" -> ActivityInfo.SCREEN_ORIENTATION_FULL_USER
              "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
              else -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
          } catch (e: Throwable) {}
        }
        true
      }
    }

    // Esconde a barra de status e a de navegação enquanto o vídeo está em tela cheia (puxar da borda mostra).
    Function("setImmersive") { on: Boolean ->
      val act = appContext.currentActivity
      if (act == null) {
        false
      } else {
        act.runOnUiThread {
          try {
            val w = act.window
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
              val c = w.insetsController
              if (c != null) {
                if (on) {
                  c.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                  c.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                } else {
                  c.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                }
              }
            } else {
              @Suppress("DEPRECATION")
              w.decorView.systemUiVisibility = if (on)
                (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                  View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION)
              else View.SYSTEM_UI_FLAG_VISIBLE
            }
          } catch (e: Throwable) {}
        }
        true
      }
    }

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
