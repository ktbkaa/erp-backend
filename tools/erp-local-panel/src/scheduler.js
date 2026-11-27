/**
 * Basit cron: "m h dom mon dow" (dakika saat gün ay haftanın_günü)
 * timezone: Europe/Istanbul duvar saati (DST basit offset ile)
 */
const logger = require('./util/logger');
const { getConfig } = require('./util/config');

function istanbulParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minute: Number(parts.minute),
    hour: Number(parts.hour),
    day: Number(parts.day),
    month: Number(parts.month),
    dow: dowMap[parts.weekday] ?? 0,
  };
}

function matchField(field, value) {
  if (field === '*' || field == null) return true;
  return String(field) === String(value);
}

function matchCron(cron, parts) {
  const [min, hour, dom, mon, dow] = String(cron || '0 17 * * 0').trim().split(/\s+/);
  return matchField(min, parts.minute)
    && matchField(hour, parts.hour)
    && matchField(dom, parts.day)
    && matchField(mon, parts.month)
    && matchField(dow, parts.dow);
}

function startScheduler(onFire) {
  let lastKey = '';
  const tick = async () => {
    const cfg = getConfig();
    if (!cfg.schedule?.enabled) return;
    const parts = istanbulParts();
    const key = `${parts.day}-${parts.month}-${parts.hour}-${parts.minute}`;
    if (!matchCron(cfg.schedule.cron, parts)) return;
    if (key === lastKey) return;
    lastKey = key;
    logger.append({ level: 'info', message: `Zamanlayıcı tetikledi (${cfg.schedule.cron})` });
    try {
      await onFire();
    } catch (err) {
      logger.append({ level: 'error', message: `Zamanlayıcı işi hata: ${err.message || err}` });
    }
  };
  const id = setInterval(tick, 20 * 1000);
  tick().catch(() => {});
  logger.append({ level: 'info', message: 'Dahili zamanlayıcı aktif (Europe/Istanbul)' });
  return () => clearInterval(id);
}

module.exports = { startScheduler, istanbulParts, matchCron };
