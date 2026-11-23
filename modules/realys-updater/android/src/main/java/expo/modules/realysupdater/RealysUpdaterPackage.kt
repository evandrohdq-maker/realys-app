package expo.modules.realysupdater

import android.app.Application
import android.content.Context
import com.facebook.react.modules.network.OkHttpClientProvider
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import java.util.concurrent.TimeUnit

// Ligação do app com o servidor: o Android guarda uma ligação aberta e reaproveita para todos os
// pedidos. Quando ela morre sem aviso (troca de 4G para Wi-Fi, servidor reiniciando), os pedidos
// ficavam pendurados até dar "demorou". Com o "ping" a cada 10 s, a ligação morta é descoberta e
// trocada por uma nova sozinha; e ligar no servidor tem prazo de 10 s.
class RealysUpdaterPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
    listOf(object : ApplicationLifecycleListener {
      override fun onCreate(application: Application) {
        OkHttpClientProvider.setOkHttpClientFactory {
          OkHttpClientProvider.createClientBuilder(application)
            .pingInterval(10, TimeUnit.SECONDS)
            .connectTimeout(10, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
        }
      }
    })
}
