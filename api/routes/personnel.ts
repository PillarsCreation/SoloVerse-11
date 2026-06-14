/**
 * 人员台账路由
 */
import { Router, type Request, type Response } from 'express';
import { tables, initData, genId } from '../db.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  initData();
  const { villageId, status, injuryLevel } = req.query;
  let result = tables.personnel.map(p => ({
    ...p,
    village_name: tables.villages.find(v => v.id === p.village_id)?.name,
    township: tables.villages.find(v => v.id === p.village_id)?.township,
  }));
  if (villageId) result = result.filter(p => p.village_id === villageId);
  if (status) result = result.filter(p => p.safety_status === status);
  if (injuryLevel) result = result.filter(p => p.injury_level === injuryLevel);
  const statusOrder: Record<string, number> = { pending: 0, rescuing: 1, sheltered: 2, safe: 3 };
  result.sort((a, b) => (statusOrder[a.safety_status] ?? 9) - (statusOrder[b.safety_status] ?? 9));
  res.json({ success: true, data: result });
});

router.get('/:id', (req: Request, res: Response): void => {
  initData();
  const person = tables.personnel.find(p => p.id === req.params.id);
  if (!person) { res.status(404).json({ success: false, error: '人员不存在' }); return; }
  const village = tables.villages.find(v => v.id === person.village_id);
  const tasks = tables.rescue_tasks
    .filter(t => t.target_personnel_id === person.id)
    .map(t => ({ ...t, team_name: tables.rescue_teams.find(tm => tm.id === t.team_id)?.name }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json({
    success: true,
    data: { ...person, village_name: village?.name, township: village?.township, tasks },
  });
});

router.post('/register', (req: Request, res: Response): void => {
  const { userId, name, phone, villageId, lng, lat, companionCount, photoUrl } = req.body;
  if (!name || !villageId) {
    res.status(400).json({ success: false, error: '请填写完整登记信息' }); return;
  }
  initData();
  const now = new Date().toISOString();

  // 安置点坐标：优先使用传入坐标，否则回退到所属村组安置点坐标
  let finalLng = lng;
  let finalLat = lat;
  if (finalLng == null || finalLat == null) {
    const shelter = tables.shelters.find(s => s.village_id === villageId);
    if (shelter) { finalLng = shelter.lng; finalLat = shelter.lat; }
    else { finalLng = 0; finalLat = 0; }
  }

  if (userId) {
    const existing = tables.personnel.find(p => p.user_id === userId);
    if (existing) {
      existing.lng = finalLng; existing.lat = finalLat;
      existing.companion_count = companionCount || 1;
      // 保持 pending 状态：村民到达安置点后仍需指挥部派发救援
      existing.safety_status = 'pending';
      existing.shelter_arrive_time = now;
      if (photoUrl) existing.photo_url = photoUrl;
      res.json({ success: true, data: { id: existing.id, status: 'pending' } });
      return;
    }
  }

  const id = genId('P');
  tables.personnel.push({
    id, name, phone: phone || '', village_id: villageId, lng: finalLng, lat: finalLat,
    companion_count: companionCount || 1, injury_level: 'none',
    material_needs: '', safety_status: 'pending',
    shelter_arrive_time: now, photo_url: photoUrl || undefined, user_id: userId || undefined,
  });

  const shelter = tables.shelters.find(s => s.village_id === villageId && s.current_count < s.capacity);
  if (shelter) shelter.current_count += companionCount || 1;

  res.json({ success: true, data: { id, status: 'pending', arriveTime: now } });
});

router.post('/report', (req: Request, res: Response): void => {
  const { userId, personnelId, injuryLevel, materialNeeds, lng, lat } = req.body;
  if (!injuryLevel || !materialNeeds) {
    res.status(400).json({ success: false, error: '请选择伤情等级和物资需求' }); return;
  }
  initData();
  let target = personnelId ? tables.personnel.find(p => p.id === personnelId) : null;

  if (!target && userId) {
    target = tables.personnel.find(p => p.user_id === userId);
  }

  if (!target) {
    const user = tables.users.find(u => u.id === userId);
    if (user) {
      const id = genId('P');
      target = {
        id, name: user.name, phone: user.phone, village_id: user.village_id || '',
        lng: lng || 0, lat: lat || 0, companion_count: 1,
        injury_level: injuryLevel, material_needs: materialNeeds,
        safety_status: 'pending', user_id: userId,
      };
      tables.personnel.push(target);
    }
  } else {
    target.injury_level = injuryLevel;
    target.material_needs = materialNeeds;
    if (lng != null) target.lng = lng;
    if (lat != null) target.lat = lat;
  }

  res.json({ success: true, data: { id: target?.id, injuryLevel, materialNeeds } });
});

export default router;
