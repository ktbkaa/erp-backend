/**
 * ELEK / TEKS (ve benzeri) firmalar için CRM + İK + PRJ + Finans genişletilmiş demo.
 * Operasyonel MAN/MRP döngüsünden sonra çağrılır; mevcut cari/stok/satış ile bağlanır.
 */
const pool = require('../../db');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;

function log(m) { console.log(m); }

async function api(method, urlPath, body, firmaId) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': 'owner',
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  let r;
  try {
    r = await fetch(BASE_URL + urlPath, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`${method} ${urlPath} → fetch: ${err.message}`);
  }
  clearTimeout(timer);
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    throw new Error(`${method} ${urlPath} → ${r.status}: ${data?.hata || data?.detay || text}`);
  }
  return data;
}

async function setCompany(table, id, companyId) {
  if (!id || !companyId) return;
  await pool.query(
    `UPDATE ${table} SET company_id = COALESCE(company_id, $2) WHERE id=$1`,
    [id, companyId]
  ).catch(() => {});
}

async function ownerUserId() {
  const r = await pool.query(
    `SELECT id FROM users WHERE user_code='owner' OR username='owner' ORDER BY id LIMIT 1`
  );
  return r.rows[0]?.id || null;
}

/**
 * @param {object} ctx
 * @param {object} ctx.firma — {id, company_code, company_name}
 * @param {object} ctx.plant
 * @param {object} [ctx.partners] — {mus1, mus2, ted1}
 * @param {object} [ctx.items] — {fg, ...}
 * @param {string} [ctx.tagPrefix] — ELEK | TEKS
 * @param {object} [ctx.links] — { manSalesOrder, manQuotation, manInvoice, mrpSalesOrder }
 * @param {string} [ctx.projectName] — sektöre uygun demo proje adı
 * @param {string} [ctx.industryCode] — CRM aday sektör kodu
 * @param {string} [ctx.leadName] — CRM aday adı
 */
async function seedExtendedModules(ctx) {
  const firma = ctx.firma;
  const plant = ctx.plant;
  const tag = `${ctx.tagPrefix || firma.company_code}-X`;
  const tagPrj = `${ctx.tagPrefix || firma.company_code}-PRJ`;
  const out = { crm: {}, hr: {}, prj: {}, finans: {}, baglantilar: {} };
  const userId = await ownerUserId();
  const mus = ctx.partners?.mus1 || ctx.partners?.mus2;
  const ted = ctx.partners?.ted1;
  const fg = ctx.items?.fg;

  log(`\n=== X. Genişletilmiş modüller (${firma.company_code}) CRM / İK / PRJ / Finans ===`);

  // ─── CRM: aday → kontak → fırsat(+kalem) → plan → faaliyet → görev → ajanda ───
  // + mevcut satış teklifine opportunity_id bağla
  try {
    const lead = await api('POST', '/crm-adaylar', {
      lead_name: ctx.leadName || `${firma.company_code} Demo Aday — Enerji / Perakende`,
      status: 'Nitelikli',
      owner_id: userId,
      priority: 'Yuksek',
      phone: '0212 555 0101',
      email: `aday.${firma.company_code.toLowerCase()}@demo.local`,
      province: 'İstanbul',
      country: 'TR',
      industry_code: ctx.industryCode || (firma.company_code === 'TEKS' ? 'TEKSTIL' : 'ELEKTRONIK'),
      lead_source: 'Fuar',
      notes: `[${tag}] Demo aday`,
      company_id: firma.id,
    }, firma.id);
    await setCompany('crm_leads', lead.id, firma.id);
    out.crm.lead = { id: lead.id, code: lead.lead_code };

    const kontakLead = await api('POST', '/crm-kontaklar', {
      first_name: 'Selin',
      last_name: 'Aydın',
      title: 'Satın Alma Müdürü',
      email: `selin.${firma.company_code.toLowerCase()}@demo.local`,
      phone: '0532 111 2233',
      lead_id: lead.id,
      is_primary: true,
      notes: `[${tag}] Aday kontak`,
      company_id: firma.id,
    }, firma.id);
    await setCompany('crm_contacts', kontakLead.id, firma.id);

    const firsatAday = await api('POST', '/crm-firsatlar', {
      opportunity_name: `${firma.company_code} Aday Fırsat — yeni hat`,
      subject: 'Demo fırsat (aday)',
      customer_type: 'Aday',
      lead_id: lead.id,
      stage_id: 2,
      created_by_user_id: userId,
      followed_by_id: userId,
      expected_revenue: 150000,
      plant_id: plant.id,
      description: `[${tag}] Aday fırsat`,
      company_id: firma.id,
      satirlar: fg ? [{ item_id: fg.id, quantity: 30, unit_price: 4200, line_no: 10 }] : [],
    }, firma.id);
    await setCompany('crm_opportunities', firsatAday.id, firma.id);
    out.crm.firsat_aday = { id: firsatAday.id, code: firsatAday.opportunity_code };

    let firsatMusteri = null;
    if (mus?.id) {
      const kontakMus = await api('POST', '/crm-kontaklar', {
        first_name: 'Burak',
        last_name: 'Kaya',
        title: 'Operasyon',
        email: `burak.${firma.company_code.toLowerCase()}@musteri.local`,
        partner_id: mus.id,
        is_primary: true,
        notes: `[${tag}] Müşteri kontak`,
        company_id: firma.id,
      }, firma.id);
      await setCompany('crm_contacts', kontakMus.id, firma.id);

      firsatMusteri = await api('POST', '/crm-firsatlar', {
        opportunity_name: `${firma.company_code} Müşteri Fırsat — tekrar sipariş`,
        subject: 'Mevcut müşteri upsell',
        customer_type: 'Musteri',
        partner_id: mus.id,
        stage_id: 3,
        created_by_user_id: userId,
        followed_by_id: userId,
        expected_revenue: 84000,
        plant_id: plant.id,
        description: `[${tag}] Müşteri fırsat — MAN satışa bağlı`,
        company_id: firma.id,
        satirlar: fg ? [{ item_id: fg.id, quantity: 20, unit_price: 4200, line_no: 10 }] : [],
      }, firma.id);
      await setCompany('crm_opportunities', firsatMusteri.id, firma.id);
      out.crm.firsat_musteri = { id: firsatMusteri.id, code: firsatMusteri.opportunity_code };

      // Satış teklifi ↔ fırsat bağlantısı
      if (ctx.links?.manQuotationId) {
        await pool.query(
          `UPDATE sales_quotations
           SET opportunity_id=$2, lead_id=COALESCE(lead_id,$3), company_id=COALESCE(company_id,$4)
           WHERE id=$1`,
          [ctx.links.manQuotationId, firsatMusteri.id, lead.id, firma.id]
        );
        out.baglantilar.teklif_firsat = {
          quotation_id: ctx.links.manQuotationId,
          opportunity_id: firsatMusteri.id,
        };
      }
    }

    const tipId = (await pool.query(
      `SELECT id FROM crm_activity_types WHERE is_active ORDER BY id LIMIT 1`
    )).rows[0]?.id;

    const plan = await api('POST', '/crm-faaliyet-planlari', {
      customer_type: mus?.id ? 'Musteri' : 'Aday',
      partner_id: mus?.id || null,
      lead_id: mus?.id ? null : lead.id,
      opportunity_id: (firsatMusteri || firsatAday).id,
      activity_type_id: tipId,
      entered_by_id: userId,
      assignee_id: userId,
      plant_id: plant.id,
      start_date: new Date().toISOString(),
      subject: `[${tag}] Keşif ziyareti planı`,
      description: 'Demo plan',
      company_id: firma.id,
    }, firma.id);
    await setCompany('crm_activity_plans', plan.id, firma.id);

    const faaliyet = await api('POST', '/crm-faaliyetler', {
      customer_type: mus?.id ? 'Musteri' : 'Aday',
      partner_id: mus?.id || null,
      lead_id: mus?.id ? null : lead.id,
      opportunity_id: (firsatMusteri || firsatAday).id,
      plan_id: plan.id,
      activity_type_id: tipId,
      entered_by_id: userId,
      plant_id: plant.id,
      start_date: new Date().toISOString(),
      spent_minutes: 45,
      subject: `[${tag}] Telefon görüşmesi`,
      description: 'İhtiyaç netleştirildi',
      status: 'Tamamlandi',
      company_id: firma.id,
    }, firma.id);
    await setCompany('crm_activities', faaliyet.id, firma.id);

    const gorev = await api('POST', '/crm-gorevler', {
      title: `[${tag}] Teklif hazırla`,
      description: 'Fırsat kalemlerine göre satış teklifi',
      owner_id: userId,
      partner_id: mus?.id || null,
      lead_id: lead.id,
      opportunity_id: (firsatMusteri || firsatAday).id,
      activity_id: faaliyet.id,
      priority: 'Yuksek',
      status: 'Acik',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      company_id: firma.id,
    }, firma.id);
    await setCompany('crm_tasks', gorev.id, firma.id);

    const ajanda = await api('POST', '/crm-ajanda', {
      title: `[${tag}] Müşteri toplantısı`,
      start_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      end_at: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
      type: 'Toplanti',
      partner_id: mus?.id || null,
      lead_id: lead.id,
      opportunity_id: (firsatMusteri || firsatAday).id,
      user_code: 'owner',
      description: 'Demo ajanda',
    }, firma.id).catch((e) => {
      log(`  ajanda: ${e.message}`);
      return null;
    });

    out.crm.plan = plan.plan_code || plan.id;
    out.crm.faaliyet = faaliyet.activity_code || faaliyet.id;
    out.crm.gorev = gorev.task_code || gorev.id;
    out.crm.ajanda = ajanda?.id || null;
    log(`  CRM OK: lead=${out.crm.lead.code} firsat=${out.crm.firsat_musteri?.code || out.crm.firsat_aday.code}`);
  } catch (err) {
    log(`  CRM hata: ${err.message}`);
    out.crm.hata = err.message;
  }

  // ─── İK: org → personel → izin → puantaj → bordro → işe alım ───
  try {
    const deptUretim = await api('POST', '/hr-org/departmanlar', {
      company_id: firma.id,
      department_name: `${firma.company_code} Üretim`,
      description: `[${tag}] Üretim`,
    }, firma.id);
    const deptIk = await api('POST', '/hr-org/departmanlar', {
      company_id: firma.id,
      department_name: `${firma.company_code} İnsan Kaynakları`,
    }, firma.id);
    const posOp = await api('POST', '/hr-org/pozisyonlar', {
      company_id: firma.id,
      position_name: 'Üretim Operatörü',
      department_id: deptUretim.id,
    }, firma.id);
    const posIk = await api('POST', '/hr-org/pozisyonlar', {
      company_id: firma.id,
      position_name: 'İK Uzmanı',
      department_id: deptIk.id,
    }, firma.id);
    const cal = await api('POST', '/hr-takvim/takvimler', {
      company_id: firma.id,
      calendar_name: `${firma.company_code} 5 Gün`,
      work_days_per_week: 5,
      daily_presence_hours: 9,
      daily_net_hours: 8,
      break_minutes: 60,
      weekly_net_hours: 40,
      effective_from: '2026-01-01',
    }, firma.id);

    const emp1 = await api('POST', '/hr-personel', {
      company_id: firma.id,
      first_name: firma.company_code === 'TEKS' ? 'Elif' : 'Can',
      last_name: firma.company_code === 'TEKS' ? 'Demir' : 'Öztürk',
      hire_date: '2024-02-01',
      department_id: deptUretim.id,
      position_id: posOp.id,
      work_calendar_id: cal.id,
      email: `uretim.${firma.company_code.toLowerCase()}@demo.local`,
      gross_amount: 48000,
      description: `[${tag}] Operatör`,
    }, firma.id);
    const emp2 = await api('POST', '/hr-personel', {
      company_id: firma.id,
      first_name: 'Zeynep',
      last_name: 'Aksoy',
      hire_date: '2023-06-15',
      department_id: deptIk.id,
      position_id: posIk.id,
      work_calendar_id: cal.id,
      email: `ik.${firma.company_code.toLowerCase()}@demo.local`,
      gross_amount: 55000,
    }, firma.id);

    const types = await api('GET', '/hr-izin/turler', null, firma.id);
    const yillik = (Array.isArray(types) ? types : []).find((t) => t.leave_code === 'YILLIK')
      || (Array.isArray(types) ? types : [])[0];
    if (yillik?.id) {
      await api('POST', '/hr-izin/bakiyeler/accrue', {
        company_id: firma.id,
        employee_id: emp1.id,
        leave_type_id: yillik.id,
        year_no: 2026,
        accrued: 14,
      }, firma.id).catch((e) => log(`  izin bakiye: ${e.message}`));
      const leave = await api('POST', '/hr-izin/talepler', {
        company_id: firma.id,
        employee_id: emp1.id,
        leave_type_id: yillik.id,
        start_date: '2026-04-06',
        end_date: '2026-04-10',
        quantity: 5,
        description: `[${tag}] Yıllık izin`,
      }, firma.id);
      await api('POST', `/hr-izin/talepler/${leave.id}/gonder`, {}, firma.id).catch(() => null);
      await api('POST', `/hr-izin/talepler/${leave.id}/onayla`, {}, firma.id).catch((e) => log(`  izin onay: ${e.message}`));
      out.hr.izin = leave.request_no || leave.id;
    }

    const workDate = '2026-03-10';
    await api('POST', '/hr-puantaj/ham', {
      company_id: firma.id,
      employee_id: emp1.id,
      event_time: `${workDate}T08:00:00`,
      event_type: 'Giris',
      source_record_id: `${firma.company_code}-IN-${emp1.id}`,
    }, firma.id);
    await api('POST', '/hr-puantaj/ham', {
      company_id: firma.id,
      employee_id: emp1.id,
      event_time: `${workDate}T17:30:00`,
      event_type: 'Cikis',
      source_record_id: `${firma.company_code}-OUT-${emp1.id}`,
    }, firma.id);
    await api('POST', '/hr-puantaj/isle', {
      company_id: firma.id,
      employee_id: emp1.id,
      work_date: workDate,
    }, firma.id).catch((e) => log(`  puantaj: ${e.message}`));

    let period;
    try {
      period = await api('POST', '/hr-bordro/donemler', {
        company_id: firma.id,
        year_no: 2025,
        month_no: 3,
      }, firma.id);
    } catch (_) {
      const periods = await api('GET', '/hr-bordro/donemler', null, firma.id).catch(() => []);
      period = (Array.isArray(periods) ? periods : []).find(
        (p) => Number(p.year_no) === 2025 && Number(p.month_no) === 3
      ) || (Array.isArray(periods) ? periods : []).find(
        (p) => Number(p.year_no) === 2026 && Number(p.month_no) === 3
      ) || (Array.isArray(periods) ? periods[0] : null);
      if (!period?.id) throw new Error('Bordro dönemi oluşturulamadı');
    }
    const run = await api('POST', '/hr-bordro/calismalar', {
      company_id: firma.id,
      period_id: period.id,
    }, firma.id);
    await api('POST', `/hr-bordro/calismalar/${run.id}/hesapla`, {}, firma.id).catch((e) => log(`  bordro hesap: ${e.message}`));
    await api('POST', `/hr-bordro/calismalar/${run.id}/onayla`, {}, firma.id).catch(() => null);
    await api('POST', `/hr-bordro/calismalar/${run.id}/kesinlestir`, {}, firma.id).catch(() => null);

    const job = await api('POST', '/hr-ise-alim/ilanlar', {
      company_id: firma.id,
      title: `${firma.company_code} Kalite Kontrol Teknisyeni`,
      department_id: deptUretim.id,
      position_id: posOp.id,
      description: `[${tag}] İlan`,
    }, firma.id);
    const cand = await api('POST', '/hr-ise-alim/adaylar', {
      company_id: firma.id,
      first_name: 'Mert',
      last_name: 'Yıldız',
      email: `aday.hr.${firma.company_code.toLowerCase()}@demo.local`,
      requisition_id: job.id,
    }, firma.id);
    const hired = await api('POST', `/hr-ise-alim/adaylar/${cand.id}/ise-al`, {
      hire_date: '2026-04-01',
    }, firma.id).catch((e) => {
      log(`  işe al: ${e.message}`);
      return null;
    });

    out.hr = {
      ...out.hr,
      departments: [deptUretim.department_name, deptIk.department_name],
      employees: [emp1.employee_no, emp2.employee_no],
      bordro: run.run_no || run.id,
      ilan: job.requisition_no || job.id,
      ise_alinan: hired?.employee_no || null,
    };
    log(`  İK OK: personel=${emp1.employee_no}/${emp2.employee_no} bordro=${out.hr.bordro}`);
  } catch (err) {
    log(`  İK hata: ${err.message}`);
    out.hr.hata = err.message;
  }

  // ─── PRJ: şablon/manuel proje + sprint + bütçe + risk (satış/cari bağlı) ───
  try {
    const managerId = userId;
    const code = `${tagPrj}-${Date.now().toString().slice(-5)}`;
    const projectName = ctx.projectName || (firma.company_code === 'TEKS'
      ? 'Denim Hat Modernizasyon Projesi'
      : 'Kompanzasyon Üretim Hattı Kurulum');
    let project;
    try {
      project = await api('POST', '/prj-integrations/from-template/TPL_MAKINE', {
        project_name: projectName,
        project_code: code,
        manager_user_id: managerId,
        partner_id: mus?.id || null,
        plant_id: plant.id,
        plan_start_date: '2026-02-01',
        plan_end_date: '2026-08-31',
        description: `${tagPrj} — ${firma.company_name} demo proje (satış/üretim bağlı)`,
      }, firma.id);
    } catch (_) {
      project = await api('POST', '/prj-projeler', {
        project_name: projectName,
        project_code: code,
        manager_user_id: managerId,
        partner_id: mus?.id || null,
        plant_id: plant.id,
        planned_budget: 320000,
        plan_start_date: '2026-02-01',
        plan_end_date: '2026-08-31',
        approach: 'classic',
        description: `${tagPrj} — manuel`,
        company_id: firma.id,
      }, firma.id);
      for (const title of [
        'Keşif ve ihtiyaç analizi',
        'Tedarik ve satınalma',
        'Montaj / kurulum',
        'Test ve kalite',
        'Eğitim ve teslim',
      ]) {
        await api('POST', '/prj-isler', {
          project_id: project.id,
          title,
          plan_start_date: '2026-02-10',
          plan_end_date: '2026-05-30',
          estimated_hours: 40,
          assignee_user_id: managerId,
        }, firma.id);
      }
    }
    await setCompany('projects', project.id, firma.id);

    // Satış siparişlerine proje kodu bağla
    if (ctx.links?.manSalesOrderId) {
      await pool.query(
        `UPDATE sales_orders SET project_code=COALESCE(NULLIF(project_code,''), $2)
         WHERE id=$1`,
        [ctx.links.manSalesOrderId, tagPrj]
      ).catch(() => {});
      out.baglantilar.so_prj = { sales_order_id: ctx.links.manSalesOrderId, project_code: tagPrj };
    }
    if (ctx.links?.mrpSalesOrderId) {
      await pool.query(
        `UPDATE sales_orders SET project_code=COALESCE(NULLIF(project_code,''), $2)
         WHERE id=$1`,
        [ctx.links.mrpSalesOrderId, `${tagPrj}-MRP`]
      ).catch(() => {});
    }

    const items = await api('GET', `/prj-isler?project_id=${project.id}`, null, firma.id);
    if (items?.[0]) {
      await api('POST', `/prj-isler/${items[0].id}/work-logs`, {
        work_date: '2026-02-12',
        hours_spent: 6,
        description: `${tagPrj} worklog`,
        start_time: '09:00',
        end_time: '15:00',
      }, firma.id).catch(() => null);
    }

    const board = await api('GET', `/prj-board?project_id=${project.id}`, null, firma.id).catch(() => null);
    const card = (board?.columns || []).flatMap((c) => c.cards || [])[0];
    const todo = (board?.columns || []).find((c) => ['TODO', 'IN_PROGRESS', 'Yapılacak'].includes(c.status_code) || /todo|progress|yapılacak/i.test(c.column_name || ''));
    if (card && todo) {
      await api('POST', '/prj-board/move', {
        work_item_id: card.id,
        to_status_id: todo.status_id,
      }, firma.id).catch(() => null);
    }

    const sp = await api('POST', '/prj-sprintler', {
      project_id: project.id,
      sprint_name: `${tagPrj} Sprint 1`,
      start_date: '2026-02-01',
      end_date: '2026-02-14',
      capacity_hours: 80,
      goal: 'Keşif ve tedarik',
    }, firma.id);
    if (items?.[0]) {
      await api('POST', `/prj-sprintler/${sp.id}/items`, { work_item_id: items[0].id }, firma.id).catch(() => null);
    }
    await api('POST', `/prj-sprintler/${sp.id}/start`, {}, firma.id).catch(() => null);

    await api('POST', `/prj-budget/${project.id}/lines`, {
      category_code: 'MALZEME',
      category_name: 'Ekipman / malzeme',
      planned_qty: 1,
      unit_price: 120000,
      planned_amount: 120000,
      description: tagPrj,
    }, firma.id);
    await api('POST', `/prj-budget/${project.id}/costs`, {
      category_code: 'MALZEME',
      amount: 45000,
      source_module: 'SATINALMA',
      source_table: 'purchase_orders',
      source_id: ctx.links?.manPurchaseOrderId || Date.now() % 100000,
      description: `${tagPrj} PO maliyeti`,
    }, firma.id).catch((e) => log(`  prj cost: ${e.message}`));

    const risk = await api('POST', '/prj-riskler', {
      project_id: project.id,
      title: 'Tedarik süresi sapması',
      probability: 'Medium',
      impact: 'High',
      mitigation: 'Alternatif tedarikçi + emniyet stoğu',
      description: tagPrj,
    }, firma.id);

    out.prj = {
      project_code: project.project_code,
      project_id: project.id,
      work_items: (items || []).length,
      sprint: sp.sprint_code || sp.id,
      risk: risk.title,
    };
    log(`  PRJ OK: ${project.project_code} iş=${out.prj.work_items}`);
  } catch (err) {
    log(`  PRJ hata: ${err.message}`);
    out.prj.hata = err.message;
  }

  // ─── Finans: kasa + banka + nakit hareket + tahsilat (faturaya bağlı) ───
  try {
    const kasa = await api('POST', '/finans-nakit/kasa-hesaplari', {
      cash_name: `${firma.company_code} Ana Kasa`,
      currency_code: 'TRY',
      company_id: firma.id,
    }, firma.id);
    const banka = await api('POST', '/finans-nakit/banka-hesaplari', {
      account_name: `${firma.company_code} İş Bankası TL`,
      currency_code: 'TRY',
      iban: `TR${String(firma.id).padStart(2, '0')}0001000000000000000001`,
      company_id: firma.id,
    }, firma.id);

    await api('POST', '/finans-nakit/hareketler', {
      direction: 'Giris',
      amount: 25000,
      currency_code: 'TRY',
      cash_account_id: kasa.id,
      partner_id: mus?.id || null,
      description: `[${tag}] Kasa açılış / tahsilat avansı`,
      movement_date: new Date().toISOString().slice(0, 10),
    }, firma.id).catch((e) => log(`  nakit hareket: ${e.message}`));

    let tahsilat = null;
    if (mus?.id) {
      tahsilat = await api('POST', '/tahsilat-odemeler', {
        type: 'Tahsilat',
        partner_id: mus.id,
        amount: 15000,
        currency_code: 'TRY',
        payment_method: 'Havale',
        invoice_id: ctx.links?.manSalesInvoiceId || null,
        status: 'Onayli',
        description: `[${tag}] Satış tahsilatı`,
        document_date: new Date().toISOString().slice(0, 10),
        project_code: tagPrj,
      }, firma.id).catch((e) => {
        log(`  tahsilat: ${e.message}`);
        return null;
      });
    }
    if (ted?.id) {
      await api('POST', '/tahsilat-odemeler', {
        type: 'Odeme',
        partner_id: ted.id,
        amount: 8000,
        currency_code: 'TRY',
        payment_method: 'Havale',
        invoice_id: ctx.links?.manPurchaseInvoiceId || null,
        status: 'Onayli',
        description: `[${tag}] Alış ödemesi`,
        document_date: new Date().toISOString().slice(0, 10),
      }, firma.id).catch((e) => log(`  odeme: ${e.message}`));
    }

    out.finans = {
      kasa: kasa.cash_code || kasa.id,
      banka: banka.account_code || banka.id,
      tahsilat: tahsilat?.document_no || tahsilat?.id || null,
    };
    log(`  Finans OK: kasa=${out.finans.kasa} banka=${out.finans.banka}`);
  } catch (err) {
    log(`  Finans hata: ${err.message}`);
    out.finans.hata = err.message;
  }

  return out;
}

module.exports = {
  seedExtendedModules,
  api,
  setCompany,
};
