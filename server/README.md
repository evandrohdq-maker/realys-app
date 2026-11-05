# Servidor do Realys

Guarda tudo o que no app de demonstração ficava só no celular: contas, carteira, presentes, lojas, pedidos, posts, stories, depoimentos, mensagens, prestadores com GPS, lives e o acesso do administrador.

- **Sem dependências**: só o Node.js 22 (nada de `npm install`). Menos coisa para quebrar e para atualizar.
- **Banco SQLite** (um arquivo, `data/realys.db`): ideal para a fase de testes, com dezenas de usuários. Quando crescer, as mesmas tabelas passam para PostgreSQL.
- **Dinheiro em centavos** e toda movimentação no extrato. Operações com dinheiro são "tudo ou nada": nunca fica pela metade.
- **Avisos em tempo real** por WebSocket (o React Native já tem, sem pacote extra).

## Instalar na VPS (Hostinger KVM 2 ou parecida, Ubuntu 22.04/24.04)

1. Na Hostinger, crie a VPS com **Ubuntu 24.04** e data center no **Brasil**. Anote o IP e a senha de root.
2. (Recomendado) No DNS do seu domínio, crie um registro **A** `api` apontando para o IP da VPS (ex.: `api.realys.com.br`).
3. Entre na VPS (pelo terminal do navegador da Hostinger ou `ssh root@IP`) e rode:

```bash
curl -fsSL https://raw.githubusercontent.com/evandrohdq-maker/realys-app/main/server/deploy/setup-ubuntu.sh -o setup.sh
bash setup.sh api.realys.com.br     # ou só "bash setup.sh" se ainda não tiver domínio
```

O script instala o Node, o Caddy (HTTPS com cadeado automático), cria o serviço que liga sozinho, o firewall e o backup diário, e mostra no final o endereço e a **senha do administrador**.

4. No app: em `app.json` › `expo` › `extra` › `apiUrl`, coloque `https://api.realys.com.br` e gere o APK.

**Atualizar** depois de mudanças no GitHub: `bash /opt/realys/server/deploy/update.sh`
**Ver o que está acontecendo:** `journalctl -u realys -f`
**Backups:** `/var/backups/realys` (banco e mídias, últimos 14 dias)

> O repositório precisa estar público para o `curl`/`git clone` acima funcionarem. Se for privado, clone com um token do GitHub.

## Rodar no computador

```bash
cd server
ADMIN_PASSWORD=Admin12345 npm start     # http://localhost:8080
npm test                                # 10 testes de ponta a ponta
```

## Fase de testes: o que é de verdade e o que ainda é simulado

| Parte | Situação |
|---|---|
| Contas, login por usuário/CPF/CNPJ, sessão do aparelho | ✅ de verdade |
| Carteira, presentes, presentes de live, conversão em RLS, compras, estornos | ✅ de verdade (dinheiro interno) |
| **Depósito** | 🧪 entra na hora como "depósito de teste" (`TEST_DEPOSITS=true`). Pix real depende de contratar um intermediador de pagamento |
| **Saque** | 🧪 sai da carteira e fica pendente; o administrador faz o Pix na mão e marca como pago |
| Vídeo das lives | 🔜 a live, os espectadores e os presentes já estão aqui; o vídeo ao vivo entra com um serviço de transmissão (ex.: LiveKit) |
| Biometria facial com validação de documento | 🔜 depende de um serviço de verificação de identidade |

## API (resumo)

Todas as rotas usam JSON e, exceto as marcadas como públicas, o cabeçalho `Authorization: Bearer <accessToken>`.

**Conta:** `POST /auth/signup` · `POST /auth/login` (público) · `POST /auth/refresh` (público, troca a sessão do aparelho por acesso novo) · `POST /auth/logout` · `GET /auth/sessions` · `POST /auth/logout-all` · `POST /auth/password` · `GET /me` · `PATCH /me`

**Carteira:** `GET /wallet` · `GET /wallet/statement?bucket=saldo|presente|live` · `POST /wallet/deposit` · `POST /wallet/withdraw` · `POST /wallet/convert-live` · `POST /gifts` · `GET /gifts`

**Lojas:** `GET /companies` (público) · `GET /companies/:id` (público) · `PATCH /companies/me` · `GET /products?q=&category=&companyId=` (público) · `POST /products` · `PATCH /products/:id` · `GET /companies/me/stock` · `GET /companies/me/sales`

**Pedidos:** `POST /orders` (carrinho com várias lojas vira um pedido por loja) · `GET /orders` · `GET /companies/me/orders` · `PATCH /orders/:id` (status; cancelar devolve dinheiro e estoque)

**Social:** `GET /users?q=` · `GET /users/:id` · `POST|DELETE /friends/:id` · `GET /friends` · `POST /posts` · `GET /feed` · `GET /stories` · `DELETE /posts/:id` · `POST /testimonials` · `GET /testimonials/pending` · `POST /testimonials/:id/aceitar|recusar` · `GET /testimonials/feed` · `POST /messages` · `GET /conversations` · `GET /messages/:userId` · `POST /reports`

**Prestadores:** `PUT /providers/me` · `POST /providers/me/location` · `GET /providers/nearby?service=&lat=&lng=` · `GET /providers/:id` (público) · `POST /calls` · `GET /calls` · `PATCH /calls/:id` · `POST /calls/:id/pay` · `POST /ratings`

**Lives:** `GET /lives?cat=` (público) · `POST /lives` · `GET /lives/:id` · `POST /lives/:id/end` · `POST /lives/:id/gifts` · `GET /lives/:id/gifts`

**Mídia:** `PUT /media` (arquivo no corpo, com `Content-Type`) · `GET /media/:id` (público)

**Administrador:** `GET /admin/stats` · `GET /admin/users` · `POST /admin/users/:id/bloquear|desbloquear` · `GET /admin/deposits` · `POST /admin/deposits/:id/confirmar|recusar` · `GET /admin/withdrawals` · `POST /admin/withdrawals/:id/pagar|recusar` · `GET /admin/reports` · `POST /admin/reports/:id/procedente|improcedente`

**Tempo real:** `wss://SEU-DOMINIO/ws?token=<accessToken>` → `{ type, data }` com `message`, `gift`, `live_gift`, `order`, `call`, `tracking`, `payment`, `friend_request`, `friend_accepted`, `testimonial`, `deposit`, `withdrawal`.
