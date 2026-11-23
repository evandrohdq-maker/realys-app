// Banco de dados do Realyz: SQLite (um arquivo só, data/realys.db), embutido no Node.
// Para a fase de testes (dezenas de usuários) é rápido, simples de copiar e de fazer backup.
// Quando crescer, as mesmas tabelas passam para PostgreSQL.
// Dinheiro é guardado em CENTAVOS (número inteiro), nunca com vírgula, para não perder centavos.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATIONS = [
  // 1: estrutura inicial
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('pessoa','empresa','sistema')),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    doc TEXT UNIQUE,              -- CPF (11 dígitos) ou CNPJ (14), só números
    email TEXT UNIQUE,
    phone TEXT,
    pass_hash TEXT,
    roles TEXT NOT NULL,          -- JSON: ["usuario","prestador"] / ["empresa","fornecedor","usuario"] / ["admin"]
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','bloqueado')),
    social_class TEXT,            -- classe do perfil social (artista, gamer...)
    about TEXT DEFAULT '',
    photo TEXT,
    privacy TEXT NOT NULL DEFAULT 'todos' CHECK (privacy IN ('todos','amigos','ninguem')),
    created_at INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    device TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE wallets (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),            -- moeda Realyz (RLS), pode sacar
    gift_credits INTEGER NOT NULL DEFAULT 0 CHECK (gift_credits >= 0),  -- só compra no Realyz
    live_credits INTEGER NOT NULL DEFAULT 0 CHECK (live_credits >= 0)   -- vira RLS quando converte
  );

  -- Extrato: toda entrada e saída de dinheiro, em qualquer "bolso" da carteira.
  CREATE TABLE ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    bucket TEXT NOT NULL CHECK (bucket IN ('saldo','presente','live')),
    amount INTEGER NOT NULL,      -- positivo entra, negativo sai
    cat TEXT NOT NULL,
    description TEXT NOT NULL,
    ref TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX ledger_user ON ledger(user_id, created_at DESC);

  CREATE TABLE deposits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente','confirmado','recusado')),
    created_at INTEGER NOT NULL,
    decided_at INTEGER
  );

  CREATE TABLE withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    pix_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente','pago','recusado')),
    created_at INTEGER NOT NULL,
    decided_at INTEGER
  );

  CREATE TABLE gifts (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL REFERENCES users(id),
    to_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    fee INTEGER NOT NULL,
    occasion TEXT,
    message TEXT,
    as_company INTEGER NOT NULL DEFAULT 0,
    tip INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    name TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    segment TEXT DEFAULT '',
    about TEXT DEFAULT '',
    logo TEXT,
    address TEXT DEFAULT '',
    lat REAL, lng REAL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE products (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Vários',
    price INTEGER NOT NULL CHECK (price > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    photo TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sponsored INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX products_company ON products(company_id);

  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL REFERENCES users(id),
    company_id TEXT NOT NULL REFERENCES companies(id),
    total INTEGER NOT NULL,
    from_gift INTEGER NOT NULL,
    from_wallet INTEGER NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0,
    address TEXT DEFAULT '',
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE order_items (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0)
  );

  CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL CHECK (kind IN ('post','story')),
    text TEXT DEFAULT '',
    media TEXT,
    visibility TEXT NOT NULL DEFAULT 'todos' CHECK (visibility IN ('todos','amigos')),
    flagged INTEGER NOT NULL DEFAULT 0,   -- marcado como informação falsa
    removed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER                    -- stories somem depois de 24 h
  );
  CREATE INDEX posts_created ON posts(created_at DESC);

  CREATE TABLE testimonials (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL REFERENCES users(id),
    to_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente','aceito','recusado')),
    created_at INTEGER NOT NULL
  );

  CREATE TABLE friends (
    a_id TEXT NOT NULL REFERENCES users(id),
    b_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('pendente','amigos')),
    requested_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (a_id, b_id)
  );

  CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL REFERENCES users(id),
    to_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  );
  CREATE INDEX messages_pair ON messages(from_id, to_id, created_at);

  CREATE TABLE providers (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    service TEXT NOT NULL,          -- eletricista, motorista, motoboy, hotel...
    functions TEXT NOT NULL,        -- JSON: o que faz
    price INTEGER NOT NULL,
    price_unit TEXT NOT NULL,       -- hora, corrida, visita, diária...
    available INTEGER NOT NULL DEFAULT 0,
    lat REAL, lng REAL,
    vehicle TEXT,
    rating REAL NOT NULL DEFAULT 5,
    rating_count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE service_calls (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES users(id),
    provider_id TEXT NOT NULL REFERENCES users(id),
    service TEXT NOT NULL,
    address TEXT DEFAULT '',
    when_text TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE ratings (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL REFERENCES users(id),
    target_kind TEXT NOT NULL CHECK (target_kind IN ('order','call')),
    target_id TEXT NOT NULL,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    UNIQUE (from_id, target_kind, target_id)
  );

  CREATE TABLE lives (
    id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL REFERENCES users(id),
    host_type TEXT NOT NULL,
    host_name TEXT NOT NULL,
    cat TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ao_vivo','encerrada')),
    gifts_total INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER NOT NULL,
    ended_at INTEGER
  );

  CREATE TABLE live_gifts (
    id TEXT PRIMARY KEY,
    live_id TEXT NOT NULL REFERENCES lives(id),
    from_id TEXT NOT NULL REFERENCES users(id),
    host_id TEXT NOT NULL REFERENCES users(id),
    gift TEXT NOT NULL,
    qty INTEGER NOT NULL,
    value INTEGER NOT NULL,
    fee INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE media (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL REFERENCES users(id),
    target_kind TEXT NOT NULL CHECK (target_kind IN ('post','user','product','live')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','procedente','improcedente')),
    created_at INTEGER NOT NULL,
    decided_at INTEGER
  );
  `,
  // 2: biometria (cadastro facial com documento) e trilha de auditoria da manutenção
  `
  CREATE TABLE biometria (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('sem_consentimento','pendente','em_analise','aprovado','recusado','revogado')),
    consent_version TEXT,
    consent_at INTEGER,
    selfie_media TEXT,            -- foto do rosto (apagada depois da decisão)
    doc_media TEXT,               -- foto do documento (apagada depois da decisão)
    template TEXT,                -- vetor do rosto, CIFRADO (nunca em texto puro)
    template_kid TEXT,            -- número da chave usada no template
    checks TEXT,                  -- JSON: resultados (prova de vida, semelhança, duplicado)
    reason TEXT,
    submitted_at INTEGER,
    decided_at INTEGER,
    decided_by TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX biometria_status ON biometria(status);

  CREATE TABLE biometria_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event TEXT NOT NULL,          -- consentimento, envio, decisao, revogacao, manutencao...
    detail TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX biometria_log_user ON biometria_log(user_id, created_at DESC);

  CREATE TABLE maintenance_runs (
    id TEXT PRIMARY KEY,
    job TEXT NOT NULL,
    result TEXT NOT NULL,         -- JSON com o que foi feito
    ok INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  `,
  // 3: seção do Mercado (não perecíveis, perecíveis, demais), escolhida pelo lojista
  `
  ALTER TABLE products ADD COLUMN secao TEXT CHECK (secao IN ('mercearia','hortifruti','acougue','frios','padaria','congelados','limpeza','bebidas','outros'));
  CREATE INDEX products_secao ON products(secao);
  `,
  // 4: verificação facial em cada serviço (aceite, finalização) e a cada 6 h para quem roda em transporte
  `
  ALTER TABLE biometria ADD COLUMN last_verified_at INTEGER;
  CREATE TABLE biometria_checks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    purpose TEXT NOT NULL CHECK (purpose IN ('aceite','finalizacao','periodica')),
    call_id TEXT,
    created_at INTEGER NOT NULL,
    used_at INTEGER              -- cada verificação vale uma vez só
  );
  CREATE INDEX biometria_checks_user ON biometria_checks(user_id, purpose, created_at);
  `,
  // 5: aparelhos cadastrados com a biometria; checagem de aparelho novo; venda e saque com checagem
  `
  CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    device_key TEXT NOT NULL,      -- identificador do aparelho, guardado no celular
    name TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    UNIQUE (user_id, device_key)
  );

  CREATE TABLE aparelho_checks (   -- conferência do rosto para entrar em aparelho novo (vale 5 min, uma vez)
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    device_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    used_at INTEGER
  );

  CREATE TABLE biometria_checks_v2 (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    purpose TEXT NOT NULL CHECK (purpose IN ('aceite','finalizacao','periodica','venda','saque')),
    call_id TEXT,
    created_at INTEGER NOT NULL,
    used_at INTEGER
  );
  INSERT INTO biometria_checks_v2 SELECT * FROM biometria_checks;
  DROP TABLE biometria_checks;
  ALTER TABLE biometria_checks_v2 RENAME TO biometria_checks;
  CREATE INDEX biometria_checks_user ON biometria_checks(user_id, purpose, created_at);
  `,
  // 6: classe e subclasse do cardápio (comida), modos de atendimento (entrega, retirada no local) e maioridade
  `
  ALTER TABLE products ADD COLUMN classe TEXT;
  ALTER TABLE products ADD COLUMN subclasse TEXT;
  ALTER TABLE products ADD COLUMN modos TEXT;
  ALTER TABLE products ADD COLUMN maioridade INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX products_classe ON products(classe, subclasse);
  `,
  // 7: o Realyz não aceita menores de 18 anos; a data de nascimento e a condição de maior ficam na conta
  `
  ALTER TABLE users ADD COLUMN nascimento TEXT;
  ALTER TABLE users ADD COLUMN maior_idade INTEGER NOT NULL DEFAULT 0;
  `,
  // 8: versão e data do aceite do termo de adesão (prova do consentimento; nova versão pede novo aceite)
  `
  ALTER TABLE users ADD COLUMN termos_versao TEXT;
  ALTER TABLE users ADD COLUMN termos_aceite_at INTEGER;
  `,
  // 9: carteira profissional (OAB, CRM, carteira funcional...) com as conferências feitas
  `
  CREATE TABLE credenciais (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    prof TEXT NOT NULL,
    numero TEXT NOT NULL,
    uf TEXT,
    orgao TEXT,
    gov INTEGER NOT NULL DEFAULT 0,
    discreto INTEGER NOT NULL DEFAULT 0, -- sigilo: a profissão não aparece no perfil público
    nome_confere INTEGER,
    rosto_semelhanca REAL,
    conselho_status TEXT,
    conselho_info TEXT,
    email_inst TEXT,
    email_hash TEXT,
    email_exp INTEGER,
    email_tentativas INTEGER NOT NULL DEFAULT 0,
    email_ok INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise','aprovado','recusado')),
    recebe_casos INTEGER NOT NULL DEFAULT 0,
    motivo TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX credenciais_user ON credenciais(user_id);
  `,
  // 10: moderação de imagens (nudez): resultado da IA e fila de revisão humana
  `
  ALTER TABLE media ADD COLUMN uso TEXT NOT NULL DEFAULT 'publico';
  ALTER TABLE media ADD COLUMN moderacao TEXT NOT NULL DEFAULT 'liberado';
  ALTER TABLE media ADD COLUMN nudez REAL;
  CREATE INDEX media_moderacao ON media(moderacao);
  CREATE TABLE moderacao_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT NOT NULL, -- foto | video | live
    ref TEXT,
    nudez REAL,
    decisao TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX moderacao_log_user ON moderacao_log(user_id, created_at);
  `,
  // 11: central de segurança (alertas e pedidos), plantão dos servidores públicos e casos acompanhados
  `
  CREATE TABLE alertas (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    kind TEXT NOT NULL CHECK (kind IN ('chave','coacao','perigo','denuncia','emergencia')),
    tipo TEXT,
    texto TEXT,
    onde TEXT,
    anon INTEGER NOT NULL DEFAULT 0,
    what TEXT,
    protocolo TEXT NOT NULL,
    lat REAL,
    lon REAL,
    endereco TEXT,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_acompanhamento','atendido','falso')),
    avisado_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX alertas_status ON alertas(status, created_at);
  CREATE TABLE plantao (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    credencial_id TEXT NOT NULL,
    prof TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE casos_acomp (
    alerta_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    credencial_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (alerta_id, user_id)
  );
  ALTER TABLE users ADD COLUMN bloqueio_motivo TEXT;
  ALTER TABLE users ADD COLUMN saldo_retido INTEGER NOT NULL DEFAULT 0;
  `,
  // 12: conferência de documentos (QR Code nos PDFs de contratos e receitas)
  `
  CREATE TABLE documentos (
    codigo TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    hash TEXT NOT NULL,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    partes TEXT NOT NULL,
    coacao INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
  // 13: módulo fiscal (receitas do Realyz, notas NFS-e e NF-e, configuração fiscal das lojas)
  `
  CREATE TABLE fiscal_receitas (
    id TEXT PRIMARY KEY,
    origem TEXT NOT NULL,           -- comissao_pedido, taxa_presente, taxa_live, taxa_protecao, taxa_visita, plano, anuncio, outro
    ref TEXT,                       -- pedido, presente, chamado... que gerou a receita
    tomador_id TEXT REFERENCES users(id),
    valor INTEGER NOT NULL CHECK (valor > 0),
    descricao TEXT NOT NULL,
    competencia TEXT NOT NULL,      -- AAAA-MM
    status TEXT NOT NULL,           -- pendente, agrupada, cancelada
    nota_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX fiscal_receitas_status ON fiscal_receitas(status, competencia);
  CREATE INDEX fiscal_receitas_ref ON fiscal_receitas(ref);

  CREATE TABLE fiscal_notas (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('nfse','nfe')),
    emitente TEXT NOT NULL,         -- 'realys' ou o id da loja (NF-e de produto)
    tomador_id TEXT REFERENCES users(id),
    ref TEXT,                       -- pedido (NF-e)
    serie INTEGER,
    numero INTEGER,
    competencia TEXT NOT NULL,
    valor INTEGER NOT NULL,
    imposto_estimado INTEGER,
    aliquota REAL,
    descricao TEXT NOT NULL,
    status TEXT NOT NULL,           -- fila, emitida, erro, cancelamento, cancelada
    tentativas INTEGER NOT NULL DEFAULT 0,
    erro TEXT,
    chave TEXT,
    id_dps TEXT,
    xml TEXT,
    link TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    emitida_em INTEGER,
    UNIQUE (tipo, emitente, serie, numero)
  );
  CREATE INDEX fiscal_notas_status ON fiscal_notas(status);
  CREATE INDEX fiscal_notas_tomador ON fiscal_notas(tomador_id, created_at DESC);

  CREATE TABLE fiscal_numeracao (
    serie INTEGER PRIMARY KEY,
    ultimo INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE fiscal_lojas (
    company_id TEXT PRIMARY KEY REFERENCES companies(id),
    emite_pelo_realys INTEGER NOT NULL DEFAULT 0,
    crt INTEGER NOT NULL DEFAULT 1, -- 1 Simples Nacional, 2 Simples com excesso, 3 regime normal
    uf TEXT NOT NULL DEFAULT 'RS',
    ie TEXT,
    updated_at INTEGER NOT NULL
  );
  ALTER TABLE products ADD COLUMN ncm TEXT;
  `,
  // 14: lives de jogos de celular: a live transmite a câmera ou a tela do celular
  `
  ALTER TABLE lives ADD COLUMN source TEXT NOT NULL DEFAULT 'camera';
  `,
  // 15: convites de chamada por link (Arena): quem não tem o app baixa, se cadastra e entra na sala
  `
  CREATE TABLE call_invites (
    code TEXT PRIMARY KEY,
    host_id TEXT NOT NULL REFERENCES users(id),
    sid TEXT NOT NULL,
    cid TEXT NOT NULL,
    server_name TEXT NOT NULL DEFAULT '',
    room_name TEXT NOT NULL DEFAULT '',
    uses INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX call_invites_host ON call_invites(host_id, created_at);
  `,
  // 16: streamers favoritos: quem favoritou e se quer o aviso quando ele entra ao vivo
  `
  CREATE TABLE streamer_favs (
    user_id TEXT NOT NULL REFERENCES users(id),
    host_id TEXT NOT NULL REFERENCES users(id),
    notify INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, host_id)
  );
  CREATE INDEX streamer_favs_host ON streamer_favs(host_id, notify);
  `,
  // 17: taxa de proteção Realyz (R$ 0,99 por compra, paga pelo cliente), guardada no pedido em que foi cobrada
  `
  ALTER TABLE orders ADD COLUMN protection INTEGER NOT NULL DEFAULT 0;
  `,
  // 18: taxa de visita dos serviços: o prestador define, o cliente paga ao pedir e o valor fica retido
  // até o cliente confirmar que a visita aconteceu (aí o Realyz fica com a parte dele e o resto vai ao prestador).
  `
  ALTER TABLE providers ADD COLUMN visit_fee INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE service_calls ADD COLUMN visit_fee INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE service_calls ADD COLUMN visit_from_gift INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE service_calls ADD COLUMN visit_state TEXT;
  ALTER TABLE service_calls ADD COLUMN problem TEXT DEFAULT '';
  ALTER TABLE service_calls ADD COLUMN ride_fee INTEGER NOT NULL DEFAULT 0;
  `,
  // 19: eventos e ingressos de verdade (empresa publica, cliente compra, portaria confere o código)
  `
  CREATE TABLE events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    title TEXT NOT NULL,
    detail TEXT DEFAULT '',
    when_text TEXT NOT NULL,
    starts_at INTEGER,
    place TEXT NOT NULL,
    city TEXT DEFAULT '',
    price INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    sold INTEGER NOT NULL DEFAULT 0,
    cover TEXT,
    status TEXT NOT NULL CHECK (status IN ('aberto','esgotado','encerrado')),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX events_status ON events(status, starts_at);
  CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    event_id TEXT NOT NULL REFERENCES events(id),
    buyer_id TEXT NOT NULL REFERENCES users(id),
    price INTEGER NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('valido','usado','cancelado')),
    created_at INTEGER NOT NULL,
    used_at INTEGER
  );
  CREATE INDEX tickets_buyer ON tickets(buyer_id, created_at DESC);
  CREATE INDEX tickets_event ON tickets(event_id);
  `,
  // 20: músicas à venda (o artista recebe o valor dele; o Realyz soma R$ 0,99 por download)
  `
  CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    genre TEXT DEFAULT 'Outros',
    price INTEGER NOT NULL,
    url TEXT NOT NULL,
    cover TEXT,
    plays INTEGER NOT NULL DEFAULT 0,
    sales INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX tracks_active ON tracks(active, created_at DESC);
  CREATE TABLE track_sales (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id),
    buyer_id TEXT NOT NULL REFERENCES users(id),
    price INTEGER NOT NULL,
    fee INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (track_id, buyer_id)
  );
  `,
  // 21: depósito por Pix de verdade (cobrança no banco: txid, código copia e cola e validade)
  `
  ALTER TABLE deposits ADD COLUMN txid TEXT;
  ALTER TABLE deposits ADD COLUMN pix_copia TEXT;
  ALTER TABLE deposits ADD COLUMN expira_em INTEGER;
  CREATE INDEX deposits_txid ON deposits(txid);
  `,
  // 22: atendente IA (ficha da empresa, conversas atendidas pela IA, mensagens escritas pela IA)
  `
  CREATE TABLE ia_fichas (
    owner_id TEXT PRIMARY KEY REFERENCES users(id),
    ligado INTEGER NOT NULL DEFAULT 0,
    horario TEXT DEFAULT '',
    entrega TEXT DEFAULT '',
    pagamento TEXT DEFAULT '',
    politicas TEXT DEFAULT '',
    sobre TEXT DEFAULT '',
    tom TEXT DEFAULT '',
    faq TEXT,
    ia_negocia INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE ia_conversas (
    owner_id TEXT NOT NULL REFERENCES users(id),
    client_id TEXT NOT NULL REFERENCES users(id),
    estado TEXT NOT NULL CHECK (estado IN ('ia','humano')),
    etapa TEXT NOT NULL DEFAULT 'novo',
    motivo TEXT,
    resumo TEXT,
    ia_msgs INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (owner_id, client_id)
  );
  ALTER TABLE messages ADD COLUMN ia INTEGER NOT NULL DEFAULT 0;
  `,
  // 23: contratação de artistas (vitrine de shows, pedidos, conversa do pedido e divulgação)
  `
  CREATE TABLE artist_shows (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    ativo INTEGER NOT NULL DEFAULT 0,
    nome TEXT NOT NULL,
    genero TEXT DEFAULT '',
    cidade TEXT NOT NULL,
    frase TEXT DEFAULT '',
    pacotes TEXT NOT NULL,        -- JSON [{id, nome, duracao, valor (centavos), desc}]
    eventos TEXT NOT NULL DEFAULT '[]',
    atende TEXT NOT NULL,         -- JSON {modo: cidade|regiao|viaja, raioKm, porKm (centavos), hospedagem}
    dias_semana TEXT NOT NULL DEFAULT '[]',
    agenda_ate TEXT,
    bloqueados TEXT NOT NULL DEFAULT '[]',
    vitrine TEXT NOT NULL DEFAULT '[]',
    estrutura TEXT DEFAULT '',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE show_pedidos (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL REFERENCES users(id),
    client_id TEXT NOT NULL REFERENCES users(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('contratacao','orcamento','contato')),
    status TEXT NOT NULL CHECK (status IN ('aguardando','proposta','confirmado','realizado','recusado','cancelado','conversa')),
    pacote TEXT,                  -- JSON do show escolhido
    data TEXT,                    -- AAAA-MM-DD
    hora TEXT DEFAULT '',
    evento TEXT DEFAULT '',
    local TEXT DEFAULT '',
    cidade TEXT DEFAULT '',
    publico INTEGER,
    valor INTEGER,                -- cachê (centavos)
    desloc INTEGER NOT NULL DEFAULT 0,
    pay_state TEXT CHECK (pay_state IN ('retida','liberada','devolvida')),
    from_gift INTEGER NOT NULL DEFAULT 0,
    divulga_artista INTEGER NOT NULL DEFAULT 0,
    divulga_cliente INTEGER NOT NULL DEFAULT 0,
    nota INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX show_pedidos_artist ON show_pedidos(artist_id, status);
  CREATE INDEX show_pedidos_client ON show_pedidos(client_id, status);
  CREATE INDEX show_pedidos_data ON show_pedidos(artist_id, data);
  CREATE TABLE show_msgs (
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL REFERENCES show_pedidos(id),
    from_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX show_msgs_pedido ON show_msgs(pedido_id, created_at);
  `,
  // 24: notificações com o app fechado (código de cada aparelho no Firebase)
  `
  CREATE TABLE push_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL DEFAULT 'android',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX push_tokens_user ON push_tokens(user_id);
  `,
  // 25: perfil da conta (foto, capa, sobre, página, agenda, Estúdio...) guardado no servidor:
  // é o mesmo no app e no site, em qualquer aparelho.
  `
  CREATE TABLE user_dados (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
  // 26: horário de trabalho do prestador: no horário ele fica disponível sozinho (mesmo com o app fechado).
  `
  ALTER TABLE providers ADD COLUMN horario TEXT;
  ALTER TABLE providers ADD COLUMN auto_horario INTEGER NOT NULL DEFAULT 0;
  `,
  // 27: Empregos: currículo (com o arquivo que a pessoa anexou), vagas, candidaturas e convites,
  // e o controle dos avisos de vaga (no máximo 1 por dia, ou 1 por semana para quem não tem currículo).
  `
  CREATE TABLE curriculos (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    dados TEXT NOT NULL,
    aberto INTEGER NOT NULL DEFAULT 1,
    arquivo_tipo TEXT,
    arquivo_nome TEXT,
    lat REAL, lng REAL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE vagas (
    id TEXT PRIMARY KEY,
    empresa_id TEXT NOT NULL REFERENCES users(id),
    dados TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada')),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX vagas_status ON vagas(status, created_at);
  CREATE TABLE candidaturas (
    id TEXT PRIMARY KEY,
    vaga_id TEXT NOT NULL REFERENCES vagas(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    origem TEXT NOT NULL CHECK (origem IN ('candidatou','convite')),
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (vaga_id, user_id)
  );
  CREATE INDEX candidaturas_user ON candidaturas(user_id);
  CREATE TABLE avisos_vaga (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    ultimo_at INTEGER NOT NULL
  );
  `,
  // 28: Central de entregas (pedido pronto → entregador mais perto, rota inteligente, código de
  // entrega), cargas para transportadoras (com propostas) e ofertas de fornecedores para empresas.
  `
  ALTER TABLE orders ADD COLUMN dest_lat REAL;
  ALTER TABLE orders ADD COLUMN dest_lng REAL;
  CREATE TABLE entregas (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('pedido','carga')),
    order_id TEXT,
    loja_id TEXT NOT NULL REFERENCES users(id),
    cliente_id TEXT REFERENCES users(id),
    coleta TEXT NOT NULL,
    destino TEXT NOT NULL,
    col_lat REAL, col_lng REAL, des_lat REAL, des_lng REAL,
    veiculo TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    km REAL,
    valor INTEGER NOT NULL,
    taxa_pct INTEGER NOT NULL,
    codigo TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('aberta','aceita','coletada','entregue','cancelada')),
    entregador_id TEXT REFERENCES users(id),
    rota_com TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX entregas_status ON entregas(status, created_at);
  CREATE INDEX entregas_entregador ON entregas(entregador_id, status);
  CREATE TABLE entrega_propostas (
    id TEXT PRIMARY KEY,
    entrega_id TEXT NOT NULL REFERENCES entregas(id),
    transportador_id TEXT NOT NULL REFERENCES users(id),
    valor INTEGER NOT NULL,
    prazo TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'enviada',
    created_at INTEGER NOT NULL,
    UNIQUE (entrega_id, transportador_id)
  );
  CREATE TABLE ofertas_fornecedor (
    id TEXT PRIMARY KEY,
    fornecedor_id TEXT NOT NULL REFERENCES users(id),
    dados TEXT NOT NULL,
    lat REAL, lng REAL,
    status TEXT NOT NULL DEFAULT 'ativa',
    validade INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE pedidos_fornecedor (
    id TEXT PRIMARY KEY,
    oferta_id TEXT NOT NULL REFERENCES ofertas_fornecedor(id),
    fornecedor_id TEXT NOT NULL REFERENCES users(id),
    comprador_id TEXT NOT NULL REFERENCES users(id),
    qtd REAL NOT NULL,
    total INTEGER NOT NULL,
    taxa INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE avisos_oferta (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    ultimo_at INTEGER NOT NULL
  );
  `,  // 29: curtidas e comentários dos posts (contas reais).
  `
  CREATE TABLE post_likes (
    post_id TEXT NOT NULL REFERENCES posts(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );
  CREATE TABLE post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    removed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX post_comments_post ON post_comments(post_id, created_at);
  `,
  // 30: outras profissões do prestador (além da principal, que vem do perfil). Aparece também nelas.
  `
  ALTER TABLE providers ADD COLUMN outros TEXT NOT NULL DEFAULT '[]';
  `,
  // 31: conhecimento das profissões (como trabalha, o que faz, como cobra, onde atende, exigências e MEI).
  `
  CREATE TABLE profissoes (
    key TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    classe TEXT NOT NULL,
    como TEXT NOT NULL,
    funcoes TEXT NOT NULL,
    cobra TEXT NOT NULL,
    atende TEXT NOT NULL,
    exige TEXT,
    mei_cnae TEXT,
    mei_ocupacao TEXT,
    pode_mei INTEGER,           -- 1 pode, 0 não pode (profissão regulamentada), NULL conferir no portal
    palavras TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL
  );
  `,
  // 32: parâmetros que se atualizam sozinhos (ex.: valores do MEI a partir do salário mínimo oficial).
  `
  CREATE TABLE parametros (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
  // 33: quem abre o perfil de quem (vira sugestão de amizade e opção no Enviar; nunca é mostrado como "viu seu perfil").
  `
  CREATE TABLE profile_views (
    viewer_id TEXT NOT NULL REFERENCES users(id),
    owner_id TEXT NOT NULL REFERENCES users(id),
    vezes INTEGER NOT NULL DEFAULT 1,
    ultimo_at INTEGER NOT NULL,
    PRIMARY KEY (viewer_id, owner_id)
  );
  CREATE INDEX profile_views_owner ON profile_views(owner_id, ultimo_at DESC);
  `,
  // 34: indicação de produto (quem divulgou ganha quando o pedido é entregue) e o bônus opcional da loja.
  `
  ALTER TABLE orders ADD COLUMN ref_id TEXT;
  ALTER TABLE orders ADD COLUMN ref_extra_pct INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE orders ADD COLUMN ref_pago INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE companies ADD COLUMN indicacao_extra_pct INTEGER NOT NULL DEFAULT 0;
  `,
  // 35: Turbinar (impulsionar um Reel, story ou post para ganhar seguidores ou cliques no produto).
  // gasto_mc em milésimos de centavo (uma visualização custa frações de centavo).
  `
  CREATE TABLE turbinar (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    alvo TEXT NOT NULL,
    alvo_tipo TEXT NOT NULL,
    objetivo TEXT NOT NULL,
    por_dia INTEGER NOT NULL,
    dias INTEGER NOT NULL,
    total INTEGER NOT NULL,
    cpm INTEGER NOT NULL,
    cpc INTEGER NOT NULL,
    gasto_mc INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    cliques INTEGER NOT NULL DEFAULT 0,
    seguidores INTEGER NOT NULL DEFAULT 0,
    devolvido INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativo',
    created_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL
  );
  CREATE INDEX turbinar_user ON turbinar(user_id, created_at DESC);
  CREATE INDEX turbinar_ativo ON turbinar(status, ends_at);
  CREATE TABLE turbinar_eventos (
    boost_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (boost_id, user_id, tipo)
  );
  `,
  // Contas de teste (criadas pelo administrador, sem CPF, marcadas como "Teste"): src/contasTeste.js
  `
  ALTER TABLE users ADD COLUMN teste INTEGER NOT NULL DEFAULT 0;
  `,
  // Cor de fundo do story só de texto (antes se perdia ao voltar do servidor).
  `
  ALTER TABLE posts ADD COLUMN bg TEXT;
  `,
  // Conversa completa: foto, vídeo e áudio nas mensagens.
  `
  ALTER TABLE messages ADD COLUMN media TEXT;
  ALTER TABLE messages ADD COLUMN media_type TEXT;
  `,
  // Esqueci a senha: código de 6 números por e-mail (só o resumo do código fica guardado).
  `
  ALTER TABLE users ADD COLUMN reset_hash TEXT;
  ALTER TABLE users ADD COLUMN reset_exp INTEGER;
  ALTER TABLE users ADD COLUMN reset_tentativas INTEGER NOT NULL DEFAULT 0;
  `,
  // Confirmação do e-mail: código de 6 números enviado no cadastro (e quando a pessoa pedir de novo).
  `
  ALTER TABLE users ADD COLUMN email_ok INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN email_cod_hash TEXT;
  ALTER TABLE users ADD COLUMN email_cod_exp INTEGER;
  ALTER TABLE users ADD COLUMN email_cod_tent INTEGER NOT NULL DEFAULT 0;
  -- Trocou a senha pelo "Esqueci a senha": precisa confirmar o rosto de novo para comprar e contratar.
  ALTER TABLE users ADD COLUMN rosto_pendente INTEGER NOT NULL DEFAULT 0;
  -- Conta sem biometria: 7 dias para navegar; depois, só com a biometria feita. Quem já existia ganha
  -- 7 dias a contar desta atualização (ninguém é travado de surpresa).
  ALTER TABLE users ADD COLUMN prazo_bio INTEGER;
  UPDATE users SET prazo_bio = CAST(strftime('%s','now') AS INTEGER) * 1000 + 7 * 86400000;
  `,
  // Verificação em duas etapas (Google Authenticator). O segredo fica lacrado com a chave do servidor.
  `
  ALTER TABLE users ADD COLUMN totp_on INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN totp_segredo TEXT;
  ALTER TABLE users ADD COLUMN totp_novo TEXT;
  `,
  // Empresa: o titular (quem abriu o CNPJ) faz a biometria com o documento dele.
  `
  ALTER TABLE users ADD COLUMN titular_nome TEXT;
  ALTER TABLE users ADD COLUMN titular_cpf TEXT;
  `,
  // Perfil profissional (prestador e empresa), como as páginas de empresa das redes grandes: não é
  // contato. As pessoas seguem, curtem o perfil e deixam depoimento; comprar e contratar é pela vitrine.
  `
  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (follower_id, target_id)
  );
  CREATE INDEX IF NOT EXISTS follows_target ON follows(target_id);
  CREATE TABLE IF NOT EXISTS profile_likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, target_id)
  );
  `,
  // Perfis de trabalho com CNPJ (prestador, artista, loja) dentro da conta da pessoa.
  `
  CREATE TABLE IF NOT EXISTS perfis_trabalho (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativo',
    created_at INTEGER NOT NULL,
    UNIQUE (owner_id, tipo)
  );
  CREATE INDEX IF NOT EXISTS perfis_trabalho_cnpj ON perfis_trabalho(cnpj);
  -- Empresa: o titular criou o perfil social dele (aparece o botão para trocar empresa ⇄ social).
  ALTER TABLE users ADD COLUMN social_titular INTEGER NOT NULL DEFAULT 0;
  `,
  // Realyz nativo de IA: planos (Grátis, Realyz, Pro), proteção automática contra golpe e fake news
  // (o robô abre denúncia na mesma fila do administrador) e o registro de buscas do painel de inteligência.
  `
  CREATE TABLE IF NOT EXISTS planos_conta (
    owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plano TEXT NOT NULL CHECK (plano IN ('gratis','realyz','pro')),
    ciclo TEXT NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal','anual')),
    status TEXT NOT NULL CHECK (status IN ('aguardando_pagamento','ativo','cancelado')),
    desde INTEGER,
    ate INTEGER,
    pedido_em INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  ALTER TABLE reports ADD COLUMN origem TEXT NOT NULL DEFAULT 'pessoa';
  ALTER TABLE reports ADD COLUMN pontos INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE reports ADD COLUMN parecer TEXT;
  ALTER TABLE reports ADD COLUMN tipo TEXT;
  CREATE INDEX IF NOT EXISTS reports_alvo ON reports(target_kind, target_id, status);
  CREATE TABLE IF NOT EXISTS buscas (
    termo TEXT NOT NULL,
    onde TEXT NOT NULL,
    resultados INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS buscas_quando ON buscas(created_at);
  `,
  `
  -- Suporte: chamados entre o usuário e a equipe do Realyz (antes ficavam só no celular).
  CREATE TABLE IF NOT EXISTS suporte_chamados (
    id TEXT PRIMARY KEY,
    n INTEGER NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    topic TEXT NOT NULL,
    urgent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('aberto','respondido','resolvido')),
    lotus_tried INTEGER NOT NULL DEFAULT 0,
    rating INTEGER,
    unread_user INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS suporte_user ON suporte_chamados(user_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS suporte_msgs (
    id TEXT PRIMARY KEY,
    chamado_id TEXT NOT NULL REFERENCES suporte_chamados(id),
    autor TEXT NOT NULL CHECK (autor IN ('user','team','system')),
    by_name TEXT,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS suporte_msgs_chamado ON suporte_msgs(chamado_id, created_at);
  `,
  `
  -- Date+: assinatura guardada no servidor (antes só no celular). until = até quando vale.
  CREATE TABLE IF NOT EXISTS date_subs (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    plan_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    until INTEGER NOT NULL,
    renew INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS date_sub_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL,
    price INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    until INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  `,
  `
  -- Primeira tele grátis paga pelo Realyz (custo de marketing), contada no servidor com orçamento por mês.
  CREATE TABLE IF NOT EXISTS tele_gratis (
    id TEXT PRIMARY KEY,
    mes TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    order_id TEXT NOT NULL,
    valor INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS tele_gratis_user ON tele_gratis(user_id);
  CREATE INDEX IF NOT EXISTS tele_gratis_mes ON tele_gratis(mes);
  `,
];

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const { user_version: v } = db.prepare('PRAGMA user_version').get();
  for (let i = v; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  // Conta do sistema: recebe as taxas do Realyz (presentes, lives, vendas).
  db.prepare(`INSERT OR IGNORE INTO users (id, kind, name, username, roles, created_at) VALUES ('realys', 'sistema', 'Realyz', 'realys', '["sistema"]', ?)`).run(Date.now());
  db.prepare(`INSERT OR IGNORE INTO wallets (user_id) VALUES ('realys')`).run();
  return db;
}

// Executa várias operações como uma só: ou tudo dá certo, ou nada é gravado.
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
