/**
 * 大屏统计数据路由
 */
import { Router, type Request, type Response } from 'express';
import { tables, initData } from '../db.js';

const router = Router();

router.get('/stats', (_req: Request, res: Response): void => {
  initData();

  const personnel = {
    total: tables.personnel.length,
    safe: tables.personnel.filter(p => p.safety_status === 'safe').length,
    sheltered: tables.personnel.filter(p => p.safety_status === 'sheltered').length,
    rescuing: tables.personnel.filter(p => p.safety_status === 'rescuing').length,
    pending: tables.personnel.filter(p => p.safety_status === 'pending').length,
    severe_injury: tables.personnel.filter(p => p.injury_level === 'severe').length,
    minor_injury: tables.personnel.filter(p => p.injury_level === 'minor').length,
    no_injury: tables.personnel.filter(p => p.injury_level === 'none').length,
  };

  const warnings = {
    total: tables.warnings.length,
    active: tables.warnings.filter(w => w.status === 'active').length,
    red: tables.warnings.filter(w => w.level === 'red').length,
    orange: tables.warnings.filter(w => w.level === 'orange').length,
    yellow: tables.warnings.filter(w => w.level === 'yellow').length,
    blue: tables.warnings.filter(w => w.level === 'blue').length,
  };

  const rescue = {
    total: tables.rescue_tasks.length,
    in_progress: tables.rescue_tasks.filter(t => ['dispatched', 'enroute', 'arrived'].includes(t.status)).length,
    completed: tables.rescue_tasks.filter(t => t.status === 'completed').length,
    pending: tables.rescue_tasks.filter(t => t.status === 'pending').length,
  };

  const needCount: Record<string, number> = {};
  tables.personnel.forEach(p => {
    if (p.material_needs) {
      p.material_needs.split(',').forEach(item => {
        const trimmed = item.trim();
        if (trimmed) needCount[trimmed] = (needCount[trimmed] || 0) + 1;
      });
    }
  });

  const shelters = tables.shelters.map(s => ({
    ...s,
    village_name: tables.villages.find(v => v.id === s.village_id)?.name,
  }));

  res.json({
    success: true,
    data: { personnel, warnings, rescue, materialNeeds: needCount, shelters },
  });
});

export default router;
