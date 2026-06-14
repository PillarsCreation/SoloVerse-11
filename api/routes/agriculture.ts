/**
 * 农业灾情统计路由
 */
import { Router, type Request, type Response } from 'express';
import { tables, initData, genId } from '../db.js';

const router = Router();

router.get('/records', (req: Request, res: Response): void => {
  initData();
  const { villageId, page, pageSize } = req.query;
  let records = tables.agriculture_records.map(a => ({
    ...a,
    village_name: tables.villages.find(v => v.id === a.village_id)?.name,
    township: tables.villages.find(v => v.id === a.village_id)?.township,
  }));
  if (villageId) records = records.filter(a => a.village_id === villageId);
  records.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const pageNum = parseInt(page as string) || 1;
  const size = parseInt(pageSize as string) || 20;
  const total = records.length;
  const offset = (pageNum - 1) * size;
  const paged = records.slice(offset, offset + size);

  res.json({
    success: true,
    data: paged,
    pagination: { page: pageNum, pageSize: size, total },
  });
});

router.post('/records', (req: Request, res: Response): void => {
  const {
    villagerName, villageId,
    cropType, cropArea, cropDamage, cropLoss,
    livestockType, livestockOriginal, livestockDead, barnDamage, livestockLoss,
  } = req.body;
  if (!villagerName || !villageId) {
    res.status(400).json({ success: false, error: '请填写村民姓名和村组' }); return;
  }
  initData();
  const id = genId('A');
  const record = {
    id, villager_name: villagerName, village_id: villageId,
    crop_type: cropType || undefined, crop_area: cropArea || 0,
    crop_damage: cropDamage || '', crop_loss: cropLoss || 0,
    livestock_type: livestockType || undefined, livestock_original: livestockOriginal || 0,
    livestock_dead: livestockDead || 0, barn_damage: barnDamage || '',
    livestock_loss: livestockLoss || 0, created_at: new Date().toISOString(),
  };
  tables.agriculture_records.push(record);
  res.json({
    success: true,
    data: { ...record, village_name: tables.villages.find(v => v.id === villageId)?.name },
  });
});

router.get('/summary', (req: Request, res: Response): void => {
  initData();
  const { villageId } = req.query;
  let records = tables.agriculture_records;
  if (villageId) records = records.filter(a => a.village_id === villageId);

  const summary = {
    total_records: records.length,
    affected_households: new Set(records.map(r => r.villager_name)).size,
    total_crop_area: records.reduce((s, r) => s + (r.crop_area || 0), 0),
    total_crop_loss: records.reduce((s, r) => s + (r.crop_loss || 0), 0),
    total_livestock_dead: records.reduce((s, r) => s + (r.livestock_dead || 0), 0),
    total_livestock_loss: records.reduce((s, r) => s + (r.livestock_loss || 0), 0),
    total_loss: records.reduce((s, r) => s + (r.crop_loss || 0) + (r.livestock_loss || 0), 0),
  };

  const villageMap = new Map<string, any>();
  records.forEach(r => {
    if (!villageMap.has(r.village_id)) {
      const v = tables.villages.find(v => v.id === r.village_id);
      villageMap.set(r.village_id, {
        village_name: v?.name, township: v?.township,
        records: 0, crop_area: 0, crop_loss: 0, livestock_loss: 0, total_loss: 0,
      });
    }
    const entry = villageMap.get(r.village_id);
    entry.records++; entry.crop_area += r.crop_area || 0;
    entry.crop_loss += r.crop_loss || 0; entry.livestock_loss += r.livestock_loss || 0;
    entry.total_loss = entry.crop_loss + entry.livestock_loss;
  });
  const byVillage = [...villageMap.values()].sort((a, b) => b.total_loss - a.total_loss);

  res.json({ success: true, data: { summary, byVillage } });
});

export default router;
