import './src/webFrame';
// Recibo de entrega das mensagens: precisa estar pronto antes do app (roda até com o app fechado).
import './src/reciboNotificacao';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
