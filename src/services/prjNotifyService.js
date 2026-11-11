/**
 * PRJ onay + e-posta derin bağ.
 * Gerçek SMTP yoksa kayıt email_dispatches'ta Bekliyor/Basarisiz kalır (test güvenli).
 */
const { startApproval } = require('./onayService');
const { epostaKuyrugaAl } = require('./epostaService');
const { parametreAl } = require('../utils/yetki');

async function maybeQueueEmail(client, {
  sourceType,
  sourceId,
  subject,
  body,
  userId = null,
  fallbackEmail = null,
}) {
  const enabled = String(await parametreAl(client, 'PRJ_EMAIL_NOTIFY', 'Evet')).toLowerCase() === 'evet';
  if (!enabled) return null;

  let alici = fallbackEmail;
  if (!alici && userId) {
    const u = await client.query(`SELECT email_address FROM users WHERE id=$1`, [userId]);
    alici = u.rows[0]?.email_address || null;
  }
  if (!alici) {
    // Test/ortam fallback — kuyruk kaydı yine oluşsun
    recipient: alici = 'prj-notify@localhost.test';
  }
  return epostaKuyrugaAl(client, {
    kaynakTipi: sourceType,
    kaynakId: sourceId,
    recipient: alici,
    subject: subject,
    body_text: body,
  });
}

async function startPrjApproval(client, {
  screenId,
  documentId,
  documentNo = null,
  documentOzet = null,
  amount = 0,
  companyId = null,
  baslatanKisiId = null,
  description = null,
}) {
  return startApproval(client, {
    screen_id: screenId,
    module_code: 'proje',
    document_id: documentId,
    document_no: documentNo,
    document_summary: documentOzet,
    amount,
    company_id: companyId,
    initiator_user_id: baslatanKisiId,
    description,
  });
}

async function notifyBudgetOverrun(client, { project, actual, planned, userId = null }) {
  const approval = await startPrjApproval(client, {
    screenId: 'prj-butce',
    documentId: project.id,
    documentNo: project.project_code,
    documentOzet: `Bütçe aşımı: plan=${planned}, gerçekleşen=${actual}`,
    amount: Number(actual) - Number(planned),
    companyId: project.company_id,
    baslatanKisiId: userId,
    description: 'PRJ otomatik bütçe aşımı',
  });
  const mail = await maybeQueueEmail(client, {
    sourceType: 'prj_budget_overrun',
    sourceId: project.id,
    subject: `[PRJ] Bütçe aşımı — ${project.project_code}`,
    body: `Proje ${project.project_code} bütçe aşımına uğradı. Plan=${planned}, Gerçekleşen=${actual}.`,
    userId: project.manager_user_id || userId,
  });
  return { approval, mail };
}

async function notifyProjectClose(client, { project, userId = null }) {
  const approval = await startPrjApproval(client, {
    screenId: 'prj-projeler',
    documentId: project.id,
    documentNo: project.project_code,
    documentOzet: `Proje kapanış talebi`,
    amount: Number(project.actual_cost || 0),
    companyId: project.company_id,
    baslatanKisiId: userId,
    description: 'PRJ proje kapanış',
  });
  const mail = await maybeQueueEmail(client, {
    sourceType: 'prj_project_close',
    sourceId: project.id,
    subject: `[PRJ] Kapanış — ${project.project_code}`,
    body: `Proje ${project.project_code} kapanış sürecine alındı.`,
    userId: project.manager_user_id || userId,
  });
  return { approval, mail };
}

async function notifyWorkApproval(client, { workItem, project = null, userId = null }) {
  const approval = await startPrjApproval(client, {
    screenId: 'prj-isler',
    documentId: workItem.id,
    documentNo: workItem.work_item_no,
    documentOzet: workItem.title,
    amount: Number(workItem.estimated_hours || 0),
    companyId: workItem.company_id,
    baslatanKisiId: userId,
    description: 'PRJ iş onay bekliyor',
  });
  const mail = await maybeQueueEmail(client, {
    sourceType: 'prj_work_approval',
    sourceId: workItem.id,
    subject: `[PRJ] Onay bekliyor — ${workItem.work_item_no}`,
    body: `İş kaydı ${workItem.work_item_no}: ${workItem.title}`,
    userId: workItem.assignee_user_id || project?.manager_user_id || userId,
  });
  return { approval, mail };
}

async function notifyAssignment(client, { workItem, assigneeUserId }) {
  return maybeQueueEmail(client, {
    sourceType: 'prj_work_assigned',
    sourceId: workItem.id,
    subject: `[PRJ] Atama — ${workItem.work_item_no}`,
    body: `Size iş atandı: ${workItem.work_item_no} — ${workItem.title}`,
    userId: assigneeUserId,
  });
}

module.exports = {
  maybeQueueEmail,
  startPrjApproval,
  notifyBudgetOverrun,
  notifyProjectClose,
  notifyWorkApproval,
  notifyAssignment,
};
