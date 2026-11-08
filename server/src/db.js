// Banco de dados do Realys: SQLite (um arquivo só, data/realys.db), embutido no Node.
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
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),            -- moeda Realys (RLS), pode sacar
    gift_credits INTEGER NOT NULL DEFAULT 0 CHECK (gift_credits >= 0),  -- só compra no Realys
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
  // 4: verificação facial em cada serviço (aceite, finalização) e a cada 2 h para quem roda em transporte
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
  // 7: o Realys não aceita menores de 18 anos; a data de nascimento e a condição de maior ficam na conta
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
  // Conta do sistema: recebe as taxas do Realys (presentes, lives, vendas).
  db.prepare(`INSERT OR IGNORE INTO users (id, kind, name, username, roles, created_at) VALUES ('realys', 'sistema', 'Realys', 'realys', '["sistema"]', ?)`).run(Date.now());
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
