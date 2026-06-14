/**
 * 村组与安置点路由
 */
import { Router, type Request, type Response } from 'express';
import { tables, initData } from '../db.js';

const router = Router();

router.get('/villages', (_req: Request, res: Response): void => {
  initData();
  const villages = [...tables.villages].sort((a, b) =>
    a.township.localeCompare(b.township) || a.name.localeCompare(b.name)
  );
  res.json({ success: true, data: villages });
});

router.get('/shelters', (req: Request, res: Response): void => {
  initData();
  const { villageId } = req.query;
  let shelters;
  if (villageId) {
    shelters = tables.shelters.filter(s => s.village_id === villageId);
  } else {
    shelters = tables.shelters.map(s => ({
      ...s,
      village_name: tables.villages.find(v => v.id === s.village_id)?.name,
      township: tables.villages.find(v => v.id === s.village_id)?.township,
    }));
  }
  res.json({ success: true, data: shelters });
});

export default router;
