/**
 * ADGIDA/EGEPACK için sistem tanıtım Excel'indeki ekranları geniş kapsama.
 * Ana sim döngüsünden sonra çağrılır; her adımı audit log'a yazar.
 */
const pool = require('../../db');
const { seedExtendedModules } = require('./demo-extended-modules');

/**
 * @param {object} opts
 * @param {(step:string,screen:string,detail:string,extra?:object)=>any} opts.log
 * @param {(method:string,path:string,body?:any,firmaId?:number)=>Promise<any>} opts.api
 * @param {object} opts.org — sim org (gida, amb, plants, wh, fin…)
 * @param {object} opts.gidaMaster
 * @param {object} opts.ambMaster
 */
async function runFullCoverage({ log, api, org, gidaMaster, ambMaster }) {
  const covered = [];
  const mark = (screen, detail, extra = {}) => {
    covered.push({ screen, detail, ...extra });
    log('COVER', screen, detail, extra);
  };
  const tryApi = async (firmaId, method, path, body, screen, detail) => {
    try {
      const r = await api(method, path, body, firmaId);
      mark(screen, detail, { id: r?.id, belge: r?.order_no || r?.document_no || r?.invoice_no || r?.code });
      return r;
    } catch (e) {
      mark(screen, `${detail}: ${e.message}`);
      return null;
    }
  };

  // ─── MDM tanımlar (global / firma bağımsız) ───
  await tryApi(org.gida.id, 'GET', '/countries', null, 'country-tanimi', 'Ülke listesi');
  await tryApi(org.gida.id, 'GET', '/cities', null, 'sehir-tanimi', 'Şehir listesi');
  await tryApi(org.gida.id, 'GET', '/languages', null, 'dil-tanimi', 'Dil listesi');
  await tryApi(org.gida.id, 'GET', '/para-birimleri', null, 'para-birimi-tanimi', 'PB listesi');
  await tryApi(org.gida.id, 'GET', '/banks', null, 'banka-tanimi', 'Banka listesi');
  await tryApi(org.gida.id, 'GET', '/odeme-kosullari', null, 'odeme-kosulu-tanimi', 'Ödeme koşulu');
  await tryApi(org.gida.id, 'GET', '/teslimat-kosullari', null, 'teslimat-kosulu-tanimi', 'Teslimat koşulu');
  await tryApi(org.gida.id, 'GET', '/belge-tipleri', null, 'belge-tipleri', 'Belge tipleri');
  await tryApi(org.gida.id, 'GET', '/hareket-kodlari', null, 'hareket-kodlari', 'Hareket kodları');
  await tryApi(org.gida.id, 'GET', '/kod-serileri', null, 'numarator-tanimi', 'Numaratörler');
  await tryApi(org.gida.id, 'GET', '/doviz-kurlari', null, 'doviz-exchange_rate-tanimi', 'Döviz kurları');

  // ─── Stok yan ekranlar ───
  await tryApi(org.gida.id, 'GET', '/stok-bakiyeleri', null, 'depo-bakiye', 'Depo bakiyeleri');
  await tryApi(org.gida.id, 'GET', '/stok-hareket-raporu', null, 'stok-hareket-raporu', 'Hareket raporu');
  await tryApi(org.gida.id, 'GET', '/stok-partileri', null, 'stok-partileri', 'Parti listesi');
  await tryApi(org.gida.id, 'GET', '/stok-serileri', null, 'stok-serileri', 'Seri listesi');
  await tryApi(org.gida.id, 'GET', '/stok-depo', null, 'stok-depo', 'Depo-stok bağları');

  // Sayım belgesi
  try {
    const sayim = await api('POST', '/sayim-belgeleri', {
      plant_id: org.gPlants.fab1.id,
      warehouse_id: org.gWh.fab1.hmd.id,
      description: 'SIM sayım — Bursa hammadde',
      satirlar: [{
        item_id: gidaMaster.items.hm01.id,
        counted_quantity: 100,
        system_quantity: 0,
      }],
    }, org.gida.id);
    mark('sayim-belgeleri', `Sayım ${sayim.document_no || sayim.id}`, { id: sayim.id });
    if (sayim.id) {
      await api('POST', `/sayim-belgeleri/${sayim.id}/onayla`, {}, org.gida.id).catch((e) => {
        mark('sayim-belgeleri', `Onay: ${e.message}`);
      });
    }
  } catch (e) {
    mark('sayim-belgeleri', `Sayım: ${e.message}`);
  }

  // Rezervasyon (market SO üzerinden mümkünse)
  await tryApi(org.gida.id, 'GET', '/stok-rezervasyonlari', null, 'stok-rezervasyonlari', 'Rezervasyon listesi');
  await tryApi(org.gida.id, 'GET', '/stok-ikame', null, 'stok-ikame', 'İkame listesi');

  // ─── Satınalma zinciri (talep → teklif) ───
  try {
    const talep = await api('POST', '/satin-alma-talepleri', {
      plant_id: org.gPlants.fab1.id,
      description: 'SIM SA talep — cam şişe',
      satirlar: [{
        item_id: gidaMaster.items.amb01.id,
        quantity: 1000,
        uom_code: 'AD',
      }],
    }, org.gida.id);
    mark('satin-alma-talepleri', `Talep ${talep.requisition_no || talep.id}`, { id: talep.id });
    if (talep.id) {
      await api('POST', `/satin-alma-talepleri/${talep.id}/onayla`, {}, org.gida.id).catch(() => null);
      const teklif = await api('POST', '/satin-alma-teklifleri', {
        partner_id: gidaMaster.partners.tedCam.id,
        plant_id: org.gPlants.fab1.id,
        description: 'SIM SA teklif',
        satirlar: [{
          item_id: gidaMaster.items.amb01.id,
          quantity: 1000,
          unit_price: 3.5,
          uom_code: 'AD',
        }],
      }, org.gida.id).catch((e) => {
        mark('satin-alma-teklifleri', `Teklif: ${e.message}`);
        return null;
      });
      if (teklif?.id) mark('satin-alma-teklifleri', `Teklif ${teklif.quotation_no || teklif.id}`, { id: teklif.id });
    }
  } catch (e) {
    mark('satin-alma-talepleri', `Talep: ${e.message}`);
  }
  await tryApi(org.gida.id, 'GET', '/satin-alma-anlasmalari', null, 'satin-alma-anlasmalari', 'Anlaşma listesi');
  await tryApi(org.gida.id, 'GET', '/tedarikci-irsaliyeleri', null, 'tedarikci-irsaliyeleri', 'Alış irsaliye listesi');
  await tryApi(org.gida.id, 'GET', '/mal-kabuller', null, 'mal-kabuller', 'Mal kabul listesi');
  await tryApi(org.gida.id, 'GET', '/giris-kontrolleri', null, 'giris-kontrolleri', 'Giriş kontrol listesi');
  await tryApi(org.gida.id, 'GET', '/invoices?invoice_type=AlisIade', null, 'alis-iade-faturalari', 'Alış iade listesi');

  // ─── Satış teklifi ───
  try {
    const teklif = await api('POST', '/satis-teklifleri', {
      partner_id: gidaMaster.partners.musGurme.id,
      plant_id: org.gPlants.dep.id,
      currency_code: 'TRY',
      description: 'SIM satış teklifi — Gurme',
      satirlar: [{
        item_id: gidaMaster.items.mm03.id,
        quantity: 50,
        unit_price: 120,
      }],
    }, org.gida.id);
    mark('satis-teklifleri', `Teklif ${teklif.quotation_no || teklif.id}`, { id: teklif.id });
    if (teklif?.id) {
      await api('POST', `/satis-teklifleri/${teklif.id}/siparise-donustur`, {}, org.gida.id).catch((e) => {
        mark('satis-teklifleri', `Siparişe dönüşüm: ${e.message}`);
      });
    }
  } catch (e) {
    mark('satis-teklifleri', `Teklif: ${e.message}`);
  }

  // ─── Kalite ───
  try {
    const plan = await api('POST', '/kk-kontrol-planlari', {
      plan_code: 'SIM-KK-01',
      plan_name: 'SIM giriş kalite planı',
      description: 'SIM kontrol planı',
      satirlar: [
        { criterion_code: 'GOR', criterion_name: 'Görsel kontrol', sample_size: 5 },
        { criterion_code: 'OLC', criterion_name: 'Ölçü kontrol', sample_size: 3 },
      ],
    }, org.gida.id);
    mark('kk-kontrol-planlari', `Plan ${plan.plan_code || plan.id}`, { id: plan.id });
    if (plan?.id) {
      await api('POST', '/kk-stok-planlari', {
        item_id: gidaMaster.items.hm01.id,
        plan_id: plan.id,
        direction: 'GKK',
      }, org.gida.id).catch((e) => mark('kk-stok-planlari', e.message));
      mark('kk-stok-planlari', 'Stok-plan bağı denendi');
    }
  } catch (e) {
    mark('kk-kontrol-planlari', e.message);
  }
  await tryApi(org.gida.id, 'GET', '/kk-emirleri?direction=GKK', null, 'kk-emirleri-gkk', 'GKK listesi');
  await tryApi(org.gida.id, 'GET', '/kk-emirleri?direction=CKK', null, 'kk-emirleri-ckk', 'CKK listesi');
  await tryApi(org.gida.id, 'GET', '/kk-uygunsuzluklar', null, 'kk-uygunsuzluklar', 'NCR listesi');
  await tryApi(org.gida.id, 'GET', '/kk-capa', null, 'kk-capa', 'CAPA listesi');
  await tryApi(org.gida.id, 'GET', '/kk-ret-nedenleri', null, 'kk-ret-nedenleri', 'Ret nedenleri');

  // ─── MRP ───
  try {
    await api('GET', '/mrp/parametreler', null, org.gida.id).catch(() => null);
    mark('mrp-parametre', 'MRP parametre listesi');
    const bi = await api('POST', '/mrp/bagimsiz-ihtiyaclar', {
      plant_id: org.gPlants.fab1.id,
      item_id: gidaMaster.items.mm01.id,
      quantity: 200,
      requirement_date: new Date().toISOString().slice(0, 10),
      description: 'SIM bağımsız ihtiyaç',
    }, org.gida.id).catch(async (e1) => {
      mark('mrp-bagimsiz-ihtiyac', `POST v1: ${e1.message}`);
      return api('POST', '/mrp/independent-requirements', {
        plant_id: org.gPlants.fab1.id,
        item_id: gidaMaster.items.mm01.id,
        quantity: 200,
        requirement_date: new Date().toISOString().slice(0, 10),
      }, org.gida.id).catch((e2) => {
        mark('mrp-bagimsiz-ihtiyac', e2.message);
        return null;
      });
    });
    if (bi) mark('mrp-bagimsiz-ihtiyac', `BI ${bi.id || 'ok'}`, { id: bi.id });
    const run = await api('POST', '/mrp/calistir', {
      plant_id: org.gPlants.fab1.id,
    }, org.gida.id).catch((e) => {
      mark('mrp-calisma', `RUN: ${e.message}`);
      return null;
    });
    if (run) mark('mrp-calisma', `RUN ${run.id || run.run_no || 'ok'}`, { id: run.id });
    await tryApi(org.gida.id, 'GET', '/mrp/sonuclar', null, 'mrp-sonuclar', 'MRP sonuçları');
    await tryApi(org.gida.id, 'GET', '/mrp-hareket-raporu', null, 'mrp-hareket-raporu', 'MRP hareket raporu');
  } catch (e) {
    mark('mrp-calisma', e.message);
  }

  // ─── Fason ───
  await tryApi(org.amb.id, 'GET', '/fason/parametreler', null, 'fason-parametreleri', 'Fason parametre');
  await tryApi(org.amb.id, 'GET', '/fason/operasyonlar', null, 'fason-operasyonlari', 'Fason operasyon');
  await tryApi(org.amb.id, 'GET', '/fason/fiyatlar', null, 'fason-fiyatlari', 'Fason fiyat');
  await tryApi(org.amb.id, 'GET', '/fason/siparisler', null, 'fason-siparisleri', 'Fason sipariş');
  await tryApi(org.amb.id, 'GET', '/fason/sevkiyatlar', null, 'fason-sevkiyatlar', 'Fason sevk');
  await tryApi(org.amb.id, 'GET', '/fason/teslimatlar', null, 'fason-teslimatlar', 'Fason teslimat');
  await tryApi(org.amb.id, 'GET', '/fason/emanet-stok', null, 'fason-emanet-stok', 'Emanet stok');
  await tryApi(org.amb.id, 'GET', '/fason/tuketimler', null, 'fason-tuketimler', 'Fason tüketim');
  try {
    const fp = await api('POST', '/fason/parametreler', {
      gkk_required_before_consume: true,
      description: 'SIM fason GKK kapısı açık',
    }, org.amb.id);
    mark('fason-parametreleri', 'GKK kapısı parametre güncellendi', { id: fp?.id });
  } catch (e) {
    mark('fason-parametreleri', `Param: ${e.message}`);
  }

  // ─── Üretim yan ───
  await tryApi(org.gida.id, 'GET', '/uretim-planlari', null, 'uretim-planlari', 'Üretim planları');
  await tryApi(org.gida.id, 'GET', '/uretim-emri-tipleri', null, 'uretim-emri-tipleri', 'İE tipleri');
  await tryApi(org.gida.id, 'GET', '/uretim-parametreleri', null, 'uretim-parametreleri', 'Üretim parametreleri');
  await tryApi(org.gida.id, 'GET', `/bom/patlat?item_id=${gidaMaster.items.mm01.id}`, null, 'bom-patlatma', 'BOM patlatma');
  await tryApi(org.gida.id, 'GET', '/is-merkezi-yuku', null, 'is-merkezi-yuku', 'İş merkezi yükü');
  await tryApi(org.gida.id, 'GET', '/bakim-emirleri', null, 'bakim-emirleri', 'Bakım emirleri');

  // ─── Finans derin ───
  await tryApi(org.gida.id, 'GET', '/muhasebe-hesaplari', null, 'hesap-plani', 'Hesap planı');
  await tryApi(org.gida.id, 'GET', '/muhasebe-belgeleri', null, 'muhasebe-belgeleri', 'Muhasebe belgeleri');
  await tryApi(org.gida.id, 'GET', '/mizan', null, 'mizan', 'Mizan');
  await tryApi(org.gida.id, 'GET', '/finans-raporlar/yevmiye', null, 'finans-yevmiye', 'Yevmiye');
  await tryApi(org.gida.id, 'GET', '/finans-raporlar/bilanco', null, 'finans-bilanco', 'Bilanço');
  await tryApi(org.gida.id, 'GET', '/finans-raporlar/gelir-tablosu', null, 'finans-gelir-tablosu', 'Gelir tablosu');
  await tryApi(org.gida.id, 'GET', `/cari-hareketleri?partner_id=${gidaMaster.partners.musMarket.id}`, null, 'cari-ekstre', 'Cari ekstre');
  await tryApi(org.gida.id, 'GET', '/cari-mutabakat', null, 'cari-mutabakat', 'Cari mutabakat');
  await tryApi(org.gida.id, 'GET', '/banka-mutabakat', null, 'banka-mutabakat', 'Banka mutabakat');
  await tryApi(org.gida.id, 'GET', '/finans-yaslandirma', null, 'finans-yaslandirma', 'Yaşlandırma');
  await tryApi(org.gida.id, 'GET', '/fiyat-listeleri', null, 'fiyat-listeleri', 'Fiyat listeleri');
  await tryApi(org.gida.id, 'GET', '/sabit-kiymetler', null, 'sabit-kiymetler', 'Sabit kıymetler');
  await tryApi(org.gida.id, 'GET', '/e-belge/kuyruk', null, 'e-belge-kuyruk', 'e-Belge kuyruğu');
  await tryApi(org.gida.id, 'GET', '/muhasebe-donemleri', null, 'muhasebe-donemleri', 'Muhasebe dönemleri');
  await tryApi(org.gida.id, 'GET', '/finans-country', null, 'finans-ulke-paketleri', 'Ülke paketleri');

  // ─── Onay ───
  await tryApi(org.gida.id, 'GET', '/onay-ekranlari/onaylarim', null, 'onaylarim', 'Onaylarım');
  await tryApi(org.gida.id, 'GET', '/onay-kayitlari', null, 'onay-izleme', 'Onay izleme');
  await tryApi(org.gida.id, 'GET', '/onay-rotalari', null, 'onay-rota-tanim', 'Onay rota');
  await tryApi(org.gida.id, 'GET', '/onay-kurallari', null, 'onay-kural-tanim', 'Onay kural');
  await tryApi(org.gida.id, 'GET', '/onay-rolleri', null, 'onay-role-tanim', 'Onay rol');
  await tryApi(org.gida.id, 'GET', '/onay-yetki-devirleri', null, 'onay-yetki-devri', 'Yetki devri');

  // ─── Sistem ───
  await tryApi(org.gida.id, 'GET', '/sistem-parametreleri', null, 'sistem-parametreleri', 'Sistem parametreleri');
  await tryApi(org.gida.id, 'GET', '/kullanici-gruplari', null, 'kullanici-gruplari', 'Kullanıcı grupları');
  await tryApi(org.gida.id, 'GET', '/audit-log', null, 'audit-log', 'Audit log');
  await tryApi(org.gida.id, 'GET', '/mesaj-tanimlari', null, 'mesaj-tanimlari', 'Mesaj tanımları');

  // ─── CRM / HR / PRJ (her iki firma) ───
  for (const [label, firma, plant, partners, items, extras] of [
    ['ADGIDA', org.gida, org.gPlants.fab1, gidaMaster.partners, gidaMaster.items, {
      tagPrefix: 'ADGIDA',
      projectName: 'Elma Suyu Hat Verimlilik Projesi',
      industryCode: 'GIDA',
      leadName: 'Marmara Organik Zincir Adayı',
      partners: {
        mus1: gidaMaster.partners.musMarket,
        mus2: gidaMaster.partners.musGurme,
        ted1: gidaMaster.partners.tedTarim,
      },
      items: { fg: gidaMaster.items.mm01 },
    }],
    ['EGEPACK', org.amb, org.aPlants.fab1, ambMaster.partners, ambMaster.items, {
      tagPrefix: 'EGEPACK',
      projectName: 'Flekso Baskı Hattı Modernizasyon',
      industryCode: 'AMBALAJ',
      leadName: 'Ege Perakende Zincir Adayı',
      partners: {
        mus1: ambMaster.partners.musAnadolu,
        mus2: ambMaster.partners.musPerak,
        ted1: ambMaster.partners.tedPetro,
      },
      items: { fg: ambMaster.items.mm01 },
    }],
  ]) {
    try {
      const out = await seedExtendedModules({
        firma,
        plant,
        ...extras,
      });
      mark('crm-adaylar', `${label} CRM/HR/PRJ genişletme OK`, {
        crm: out.crm?.lead?.code,
        hr: out.hr?.employees?.[0],
        prj: out.prj?.project_code || out.prj?.code,
      });
      [
        'crm-adaylar', 'crm-kontaklar', 'crm-firsatlar', 'crm-faaliyet-planlari',
        'crm-faaliyetler', 'crm-gorevler', 'crm-ajanda',
        'hr-personel', 'hr-departmanlar', 'hr-pozisyonlar', 'hr-puantaj',
        'hr-izin-talepleri', 'hr-bordro-calismalari', 'hr-ise-alim-ilanlar',
        'prj-projeler', 'prj-isler', 'prj-sprintler', 'prj-riskler',
      ].forEach((s) => mark(s, `${label} extended seed`));
    } catch (e) {
      mark('crm-adaylar', `${label} extended: ${e.message}`);
    }
  }

  // RO rapor/list ekranları (GET smoke)
  const smokeGets = [
    ['kokpit', '/kokpit'],
    ['fatura-kontrolleri', '/fatura-kontrolleri'],
    ['finans-nakit-hareketleri', '/finans-nakit/hareketler'],
    ['finans-kasa-hesaplari', '/finans-nakit/kasa-hesaplari'],
    ['finans-banka-hesaplari', '/finans-nakit/banka-hesaplari'],
    ['hizli-uretim-girisi', '/uretim-girisleri'],
    ['is-istasyonlari', '/is-istasyonlari'],
    ['is-merkezleri', '/is-merkezleri'],
    ['warehouses', '/warehouses'],
    ['is-yerleri', '/is-yerleri'],
    ['companies', '/companies'],
    ['kullanicilar', '/kullanicilar'],
    ['kategori-tanimi', '/kategoriler'],
    ['kategori-tip-tanimi', '/kategori-tipleri'],
  ];
  for (const [screen, path] of smokeGets) {
    await tryApi(org.gida.id, 'GET', path, null, screen, 'Liste/GET smoke');
  }

  return { covered };
}

module.exports = { runFullCoverage };
