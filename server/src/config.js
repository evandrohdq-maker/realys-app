// Configuração do servidor, lida do arquivo .env (ao lado do package.json) e das variáveis de ambiente.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Lê o .env sem depender de nenhum pacote.
function loadDotEnv() {
  const file = resolve(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const bool = (v, def) => (v === undefined || v === '' ? def : /^(1|true|sim|yes)$/i.test(v));
const num = (v, def) => (v === undefined || v === '' || isNaN(Number(v)) ? def : Number(v));

export function loadConfig(overrides = {}) {
  loadDotEnv();
  const env = process.env;
  const production = env.NODE_ENV === 'production';
  const cfg = {
    production,
    port: num(env.PORT, 8080),
    host: env.HOST || '0.0.0.0',
    dataDir: resolve(ROOT, env.DATA_DIR || 'data'),
    // Segredo que assina os tokens de acesso. Em produção é obrigatório (gerado pelo script de instalação).
    jwtSecret: env.JWT_SECRET || (production ? '' : randomBytes(32).toString('hex')),
    accessTokenMinutes: num(env.ACCESS_TOKEN_MINUTES, 60),
    sessionDays: num(env.SESSION_DAYS, 180), // "continuar conectado": o aparelho fica logado
    corsOrigin: env.CORS_ORIGIN || '*',
    maxUploadMb: num(env.MAX_UPLOAD_MB, 60),
    // Fase de testes: depósito entra na hora como "depósito de teste" (sem Pix de verdade).
    // Desligado, o depósito fica pendente até o administrador confirmar.
    testDeposits: bool(env.TEST_DEPOSITS, true),
    // Regras de dinheiro (mesmas do app). Valores em reais.
    giftFeePct: num(env.GIFT_FEE_PCT, 10), // 10%, descontado do presente (igual ao app)
    giftFeeMin: num(env.GIFT_FEE_MIN, 0),
    giftMin: num(env.GIFT_MIN, 5),
    giftMax: num(env.GIFT_MAX, 2000),
    liveConvertMin: num(env.LIVE_CONVERT_MIN, 10),
    orderFeePct: num(env.ORDER_FEE_PCT, 0), // comissão do Realys sobre vendas (0 na fase de testes)
    withdrawMin: num(env.WITHDRAW_MIN, 10),
    // Servidor de vídeo próprio (MediaMTX + coturn numa VPS, ver deploy/video/LEIA-ME.md).
    // Vazio = ainda não contratado: as lives ficam no modo demonstração.
    // E-mail (código do e-mail institucional). Serviço Resend: RESEND_API_KEY e EMAIL_FROM.
    resendKey: env.RESEND_API_KEY || '',
    emailFrom: env.EMAIL_FROM || 'Realys <nao-responda@realys.com.br>',
    // Consulta de médicos do CFM (contratada à parte). Sem chave, a conferência fica manual.
    cfmWsUrl: env.CFM_WS_URL || '',
    cfmWsKey: env.CFM_WS_KEY || '',
    // Consulta automática nos outros conselhos (CRP, CRMV, COREN, CRO, CREA) pelo Infosimples.
    infosimplesToken: env.INFOSIMPLES_TOKEN || '',
    conselhoPaths: env.CONSELHO_PATHS || '',
    // Moderação de imagens (server/moderacao-ia): fotos, vídeos e lives. Vazio = desligada.
    moderacaoUrl: env.MODERACAO_URL || '',
    ffmpegPath: env.FFMPEG_PATH || 'ffmpeg',
    liveRtspBase: env.LIVE_RTSP_BASE || 'rtsp://127.0.0.1:8554/',
    liveCheckSec: num(env.LIVE_CHECK_SEC, 20),
    videoUrl: env.VIDEO_URL || '', // ex.: https://video.realys.com.br
    videoSecret: env.VIDEO_SECRET || '', // mesmo valor no MediaMTX (authHTTPAddress ...?k=)
    videoQuality: env.VIDEO_QUALITY || '720p', // qualidade padrão das lives (480p ou 720p economiza tráfego)
    turnUrl: env.TURN_URL || '', // ex.: turn:video.realys.com.br:3478?transport=udp,turn:video.realys.com.br:3478?transport=tcp
    turnSecret: env.TURN_SECRET || '', // mesmo valor do static-auth-secret do coturn
    // Administrador criado na primeira vez que o servidor sobe.
    adminUsername: env.ADMIN_USERNAME || 'admin',
    adminPassword: env.ADMIN_PASSWORD || '',
    // Biometria: chaves de criptografia ("1:<hex64>,2:<hex64>"), serviço de IA e limiares.
    biometricKeys: env.BIOMETRIA_KEYS || '',
    biometricServiceUrl: env.BIOMETRIA_SERVICE_URL || '',
    biometricMatchMin: num(env.BIOMETRIA_MATCH_MIN, 0.8),  // rosto x documento: 80% ou mais aprova
    biometricDupMin: num(env.BIOMETRIA_DUP_MIN, 0.8),
    biometricTimeoutMs: num(env.BIOMETRIA_TIMEOUT_MS, 15000),
    biometricVerifyMin: num(env.BIOMETRIA_VERIFY_MIN, 0.8),   // selfie x cadastro, na verificação do dia a dia
    biometricCheckTtlMin: num(env.BIOMETRIA_CHECK_TTL_MIN, 5), // a verificação vale 5 min para a ação
    biometricPeriodicHours: num(env.BIOMETRIA_PERIODIC_HOURS, 2), // entregador e motorista: a cada 2 h
    // Manutenção: backups, retenção e rotina diária.
    backupDir: resolve(ROOT, env.BACKUP_DIR || 'data/backups'),
    backupKeep: num(env.BACKUP_KEEP, 14),
    backupRemoteDir: env.BACKUP_REMOTE_DIR ? resolve(env.BACKUP_REMOTE_DIR) : '',
    maintenanceEnabled: bool(env.MAINTENANCE_ENABLED, true),
    maintenanceHours: num(env.MAINTENANCE_HOURS, 24),
    reviewMaxDays: num(env.BIOMETRIA_REVIEW_MAX_DAYS, 30),   // revisão parada além disso é recusada e as fotos apagadas
    auditKeepDays: num(env.AUDIT_KEEP_DAYS, 1825),           // trilha de auditoria: 5 anos
    // Módulo fiscal (src/fiscal). Desligado até ter CNPJ, certificado digital A1 e o contador conferir.
    fiscalAtivo: bool(env.FISCAL_ATIVO, false),
    fiscalAmbiente: num(env.FISCAL_AMBIENTE, 2), // 2 = produção restrita (testes), 1 = produção
    fiscalCnpj: env.FISCAL_CNPJ || '',
    fiscalIm: env.FISCAL_IM || '', // inscrição municipal em Passo Fundo
    fiscalMunicipio: env.FISCAL_MUNICIPIO || '4314100', // código IBGE de Passo Fundo
    fiscalRegime: env.FISCAL_REGIME || 'simples', // simples, presumido ou mei
    fiscalAnexo: env.FISCAL_ANEXO || 'fatorR', // fatorR = Anexo III ou V pela folha (intermediação); ou fixo: III, V
    fiscalFolha12m: num(env.FISCAL_FOLHA_12M, 0), // R$ de folha + pró-labore + encargos nos últimos 12 meses (fator R)
    fiscalIssPct: num(env.FISCAL_ISS_PCT, 5),
    fiscalCTribNac: env.FISCAL_CTRIBNAC || '100501', // item 10.05 da LC 116: intermediação
    fiscalCTribMun: env.FISCAL_CTRIBMUN || '',
    fiscalNbs: env.FISCAL_NBS || '',
    fiscalSerie: num(env.FISCAL_SERIE, 1),
    fiscalAgrupar: env.FISCAL_AGRUPAR || 'imediato', // imediato, diario ou mensal (uma nota por cliente)
    fiscalCertPem: env.FISCAL_CERT_PEM ? resolve(ROOT, env.FISCAL_CERT_PEM) : '',
    fiscalKeyPem: env.FISCAL_KEY_PEM ? resolve(ROOT, env.FISCAL_KEY_PEM) : '',
    fiscalNfseUrl: env.FISCAL_NFSE_URL || '',
    fiscalIntervaloMin: num(env.FISCAL_INTERVALO_MIN, 5),
    fiscalCustosMensais: num(env.FISCAL_CUSTOS_MENSAIS, 0), // R$: servidor, biometria, contador... (para o resumo de lucro)
    fiscalRbt12Inicial: num(env.FISCAL_RBT12_INICIAL, 0), // R$ faturados fora do Realys nos últimos 12 meses
    fiscalDestacarIbsCbs: bool(env.FISCAL_DESTACAR_IBS_CBS, false),
    nfeParceiroUrl: env.NFE_PARCEIRO_URL || '',
    nfeParceiroToken: env.NFE_PARCEIRO_TOKEN || '',
    ...overrides,
  };
  if (!cfg.jwtSecret) throw new Error('Defina JWT_SECRET no arquivo .env (o script de instalação gera um).');
  return cfg;
}
