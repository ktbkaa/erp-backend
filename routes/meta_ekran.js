'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const {
  listScreens,
  enrichScreen,
  resolveField,
  recordInfo,
  getScreen,
} = require('../src/meta/screenTables');

/** Modül gruplu ekran listesi (sol menü için) */
router.get('/ekranlar', async (req, res, next) => {
  try {
    const screens = listScreens();
    // Nav modül bilgisini docs registry’den zenginleştir (varsa)
    let navById = {};
    try {
      const reg = require('../docs/screen-registry.json');
      for (const s of reg.screens || []) {
        navById[s.legacyId] = {
          navModuleId: s.navModuleId,
          navModuleTitle: s.navModuleTitle,
        };
      }
    } catch (_) { /* optional */ }

    const grouped = {};
    for (const s of screens) {
      const nav = navById[s.screenId] || {};
      const modId = nav.navModuleId || 'diger';
      const modTitle = nav.navModuleTitle || 'Diğer';
      if (!grouped[modId]) grouped[modId] = { id: modId, title: modTitle, screens: [] };
      grouped[modId].screens.push({ ...s, navModuleId: modId, navModuleTitle: modTitle });
    }
    const modules = Object.values(grouped).sort((a, b) =>
      String(a.title).localeCompare(String(b.title), 'tr'),
    );
    res.json({ modules, screens });
  } catch (err) {
    next(err);
  }
});

router.get('/ekranlar/:screenId', async (req, res, next) => {
  try {
    const detail = await enrichScreen(pool, req.params.screenId);
    if (!detail) return res.status(404).json({ hata: 'Ekran meta kaydı yok' });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.get('/alan', async (req, res, next) => {
  try {
    const screenId = String(req.query.screen || req.query.ekran || '').trim();
    const field = String(req.query.field || req.query.alan || '').trim();
    if (!screenId || !field) {
      return res.status(400).json({ hata: 'screen ve field zorunlu' });
    }
    const info = await resolveField(pool, screenId, field);
    if (!info) return res.status(404).json({ hata: 'Ekran bulunamadı' });
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.get('/kayit-bilgi', async (req, res, next) => {
  try {
    const screenId = String(req.query.screen || req.query.ekran || '').trim();
    const id = req.query.id || req.query.kayit_id;
    if (!screenId || id == null) {
      return res.status(400).json({ hata: 'screen ve id zorunlu' });
    }
    const info = await recordInfo(pool, screenId, id);
    if (!info) return res.status(404).json({ hata: 'Ekran bulunamadı' });
    if (info.error) return res.status(400).json({ hata: info.error });
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.get('/audit-anahtar/:screenId', (req, res) => {
  const s = getScreen(req.params.screenId);
  if (!s) return res.status(404).json({ hata: 'Ekran bulunamadı' });
  res.json({
    screenId: s.screenId,
    title: s.title,
    auditTablo: s.auditTablo,
    primaryTable: s.primaryTable,
    endpoint: s.endpoint,
  });
});

module.exports = router;
