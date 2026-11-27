/**
 * zod tabanlı istek doğrulama. Hata yanıtı: 400 { hata, kod: 'ERR-VALIDATION', alanlar: [{ alan, mesaj }] }
 * Geçerli gövde/sorgu parse edilmiş (trim/coerce) haliyle req.body / req.validatedQuery’e yazılır.
 */
const { z } = require('zod');

function formatIssues(error) {
  return (error.issues || []).map((i) => ({
    alan: i.path.join('.') || '(gövde)',
    mesaj: i.message,
  }));
}

function respond(res, error) {
  const alanlar = formatIssues(error);
  return res.status(400).json({
    hata: `Geçersiz istek: ${alanlar.map((a) => `${a.alan} — ${a.mesaj}`).join('; ')}`,
    kod: 'ERR-VALIDATION',
    alanlar,
  });
}

function validateBody(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body ?? {});
    if (!r.success) return respond(res, r.error);
    req.body = r.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.query ?? {});
    if (!r.success) return respond(res, r.error);
    req.validatedQuery = r.data;
    next();
  };
}

const trimmed = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.preprocess(
  (v) => (v === '' || v == null ? undefined : String(v)),
  z.string().max(max).optional(),
);
const optionalInt = (min, max) => z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().int().min(min).max(max).optional(),
);

const schemas = {
  login: z.object({
    user_code: optionalText(80),
    username: optionalText(80),
    parola: optionalText(256),
    sifre: optionalText(256),
    password: optionalText(256),
    ldap: z.any().optional(),
    use_ldap: z.any().optional(),
    ldapMode: z.any().optional(),
  }).passthrough().refine((b) => b.user_code || b.username, {
    message: 'username (veya user_code) zorunlu.',
    path: ['username'],
  }),

  refresh: z.object({
    refresh_token: z.string().min(10).max(4096),
  }).passthrough(),

  sqlExecute: z.object({
    sql: z.string().trim().min(1, 'SQL boş.').max(100_000),
    txMode: z.enum(['commit', 'rollback', 'COMMIT', 'ROLLBACK']).optional().nullable(),
  }).passthrough(),

  sqlConnection: z.object({
    host: trimmed(255),
    port: optionalInt(1, 65535),
    database: trimmed(128),
    user: trimmed(128),
    password: z.string().max(1024).optional().nullable(),
    label: optionalText(120),
  }).passthrough(),

  systemUpdateApply: z.object({
    ids: z.array(z.coerce.number().int().positive()).max(200).optional().default([]),
  }).passthrough(),

  auditLogQuery: z.object({
    table_name: optionalText(80),
    tablo: optionalText(80),
    record_id: optionalInt(1, 2_147_483_647),
    user_code: optionalText(80),
    action: optionalText(20),
    ekran: optionalText(200),
    screen_name: optionalText(200),
    q: optionalText(200),
    limit: optionalInt(1, 100_000),
    offset: optionalInt(0, 10_000_000),
  }).passthrough(),
};

module.exports = { z, validateBody, validateQuery, schemas, formatIssues };
