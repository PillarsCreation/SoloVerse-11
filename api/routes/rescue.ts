/**
 * 救援任务路由
 */
import { Router, type Request, type Response } from 'express';
import { tables, initData, genId, nextTrackId } from '../db.js';

const router = Router();

// 救援队伍列表（含当前任务状态，供管理端下拉选择）
router.get('/teams', (req: Request, res: Response): void => {
  initData();
  const teams = tables.rescue_teams.map(t => {
    const activeTask = tables.rescue_tasks.find(
      rt => rt.team_id === t.id && rt.status !== 'completed'
    );
    return {
      id: t.id,
      name: t.name,
      leader_name: t.leader_name,
      member_count: t.member_count,
      lng: t.lng,
      lat: t.lat,
      status: t.status,
      current_task_id: activeTask?.id || null,
      current_target: activeTask?.target_name || null,
    };
  });
  res.json({ success: true, data: teams });
});

router.get('/tasks', (req: Request, res: Response): void => {
  initData();
  const { teamId, status, personnelId } = req.query;
  let result = tables.rescue_tasks.map(t => {
    const person = tables.personnel.find(p => p.id === t.target_personnel_id);
    const village = person ? tables.villages.find(v => v.id === person.village_id) : null;
    const team = tables.rescue_teams.find(tm => tm.id === t.team_id);
    return {
      ...t,
      team_name: team?.name,
      leader_name: team?.leader_name,
      member_count: team?.member_count,
      village_name: village?.name,
      avatar: person?.avatar,
    };
  });
  if (teamId) result = result.filter(t => t.team_id === teamId);
  if (status) result = result.filter(t => t.status === status);
  if (personnelId) result = result.filter(t => t.target_personnel_id === personnelId);
  result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json({ success: true, data: result });
});

router.get('/tasks/:id', (req: Request, res: Response): void => {
  initData();
  const task = tables.rescue_tasks.find(t => t.id === req.params.id);
  if (!task) { res.status(404).json({ success: false, error: '任务不存在' }); return; }
  const team = tables.rescue_teams.find(tm => tm.id === task.team_id);
  const person = tables.personnel.find(p => p.id === task.target_personnel_id);
  const village = person ? tables.villages.find(v => v.id === person.village_id) : null;
  const track = tables.track_points
    .filter(tp => tp.task_id === task.id)
    .map(tp => ({ lng: tp.lng, lat: tp.lat, timestamp: tp.timestamp }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  res.json({
    success: true,
    data: {
      ...task,
      team_name: team?.name, leader_name: team?.leader_name, member_count: team?.member_count,
      target_phone: person?.phone, village_name: village?.name, terrain_risk: village?.terrain_risk,
      avatar: person?.avatar,
      track,
    },
  });
});

router.post('/tasks', (req: Request, res: Response): void => {
  const { personnelId, teamId, hazardNote, forbiddenRoutes, optimalRoute } = req.body;
  if (!personnelId || !teamId) {
    res.status(400).json({ success: false, error: '请选择救援目标和救援队伍' }); return;
  }
  initData();
  const person = tables.personnel.find(p => p.id === personnelId);
  if (!person) { res.status(404).json({ success: false, error: '人员不存在' }); return; }
  const team = tables.rescue_teams.find(t => t.id === teamId);
  if (!team) { res.status(404).json({ success: false, error: '救援队伍不存在' }); return; }

  // 防重复指派：一个人员仅可被一支队伍指派（存在未完成任务时拒绝）
  const existing = tables.rescue_tasks.find(
    t => t.target_personnel_id === personnelId && t.status !== 'completed'
  );
  if (existing) {
    res.status(409).json({ success: false, error: `该人员已被指派给 ${existing.team_name || '其他队伍'}，请先撤销原任务` });
    return;
  }

  const eta = 240; // 固定4小时（山区救援典型耗时）
  const now = new Date().toISOString();
  const id = genId('RT');

  const task = {
    id, target_personnel_id: person.id, target_name: person.name,
    target_lng: person.lng, target_lat: person.lat,
    team_id: team.id, team_name: team.name,
    injury_level: person.injury_level, material_needs: person.material_needs || '',
    hazard_note: hazardNote || '山区道路湿滑，注意落石风险',
    forbidden_routes: forbiddenRoutes || '沿河低洼路段禁止通行',
    optimal_route: optimalRoute || '经村道高地路线前往安置点',
    status: 'dispatched', eta_minutes: eta, created_at: now,
  };
  tables.rescue_tasks.push(task);

  team.status = 'on_mission';
  person.safety_status = 'rescuing';

  tables.track_points.push({
    id: nextTrackId(), task_id: id, team_id: team.id,
    lng: team.lng, lat: team.lat, timestamp: now,
  });

  res.json({ success: true, data: task });
});

// 指派救援任务（等价于 POST /tasks，语义化接口）
router.post('/assign', (req: Request, res: Response): void => {
  const { personnelId, teamId, hazardNote, forbiddenRoutes, optimalRoute } = req.body;
  if (!personnelId || !teamId) {
    res.status(400).json({ success: false, error: '请选择救援目标和救援队伍' }); return;
  }
  initData();
  const person = tables.personnel.find(p => p.id === personnelId);
  if (!person) { res.status(404).json({ success: false, error: '人员不存在' }); return; }
  const team = tables.rescue_teams.find(t => t.id === teamId);
  if (!team) { res.status(404).json({ success: false, error: '救援队伍不存在' }); return; }

  // 防重复指派
  const existing = tables.rescue_tasks.find(
    t => t.target_personnel_id === personnelId && t.status !== 'completed'
  );
  if (existing) {
    res.status(409).json({
      success: false,
      error: `已指派：该人员当前任务由 ${existing.team_name || '救援队伍'} 执行中，请先撤销后再重新指派`,
    });
    return;
  }

  const eta = 240; // 固定4小时（山区救援典型耗时）
  const now = new Date().toISOString();
  const id = genId('RT');

  const task = {
    id, target_personnel_id: person.id, target_name: person.name,
    target_lng: person.lng, target_lat: person.lat,
    team_id: team.id, team_name: team.name,
    injury_level: person.injury_level, material_needs: person.material_needs || '',
    hazard_note: hazardNote || '山区道路湿滑，注意落石风险',
    forbidden_routes: forbiddenRoutes || '沿河低洼路段禁止通行',
    optimal_route: optimalRoute || '经村道高地路线前往安置点',
    status: 'dispatched', eta_minutes: eta, created_at: now,
  };
  tables.rescue_tasks.push(task);

  team.status = 'on_mission';
  person.safety_status = 'rescuing';

  tables.track_points.push({
    id: nextTrackId(), task_id: id, team_id: team.id,
    lng: team.lng, lat: team.lat, timestamp: now,
  });

  res.json({ success: true, data: task });
});

// 撤销救援任务（释放人员与队伍，可重新指派）
router.post('/cancel', (req: Request, res: Response): void => {
  const { taskId } = req.body;
  if (!taskId) {
    res.status(400).json({ success: false, error: '缺少任务ID' }); return;
  }
  initData();
  const task = tables.rescue_tasks.find(t => t.id === taskId);
  if (!task) { res.status(404).json({ success: false, error: '任务不存在' }); return; }
  if (task.status === 'completed') {
    res.status(400).json({ success: false, error: '已完成的任务不可撤销' }); return;
  }

  // 恢复人员与队伍状态
  task.status = 'cancelled';
  task.completed_at = new Date().toISOString();
  const person = tables.personnel.find(p => p.id === task.target_personnel_id);
  if (person && person.safety_status === 'rescuing') {
    person.safety_status = 'pending';
  }
  const team = tables.rescue_teams.find(t => t.id === task.team_id);
  if (team) team.status = 'standby';

  res.json({ success: true, data: { id: taskId, status: 'cancelled' } });
});

router.patch('/tasks/:id', (req: Request, res: Response): void => {
  const { status } = req.body;
  initData();
  const task = tables.rescue_tasks.find(t => t.id === req.params.id);
  if (!task) { res.status(404).json({ success: false, error: '任务不存在' }); return; }

  task.status = status;
  if (status === 'completed') {
    task.completed_at = new Date().toISOString();
    const person = tables.personnel.find(p => p.id === task.target_personnel_id);
    if (person) person.safety_status = 'safe';
    const team = tables.rescue_teams.find(t => t.id === task.team_id);
    if (team) team.status = 'standby';
  }
  res.json({ success: true, data: { id: req.params.id, status } });
});

router.post('/location', (req: Request, res: Response): void => {
  const { taskId, teamId, lng, lat } = req.body;
  if (!teamId || lng == null || lat == null) {
    res.status(400).json({ success: false, error: '缺少位置参数' }); return;
  }
  initData();
  const now = new Date().toISOString();
  const team = tables.rescue_teams.find(t => t.id === teamId);
  if (team) { team.lng = lng; team.lat = lat; }
  if (taskId) {
    tables.track_points.push({ id: nextTrackId(), task_id: taskId, team_id: teamId, lng, lat, timestamp: now });
  }
  res.json({ success: true, data: { lng, lat, timestamp: now } });
});

router.get('/track/:taskId', (req: Request, res: Response): void => {
  initData();
  const track = tables.track_points
    .filter(tp => tp.task_id === req.params.taskId)
    .map(tp => ({ lng: tp.lng, lat: tp.lat, timestamp: tp.timestamp }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const task = tables.rescue_tasks.find(t => t.id === req.params.taskId);
  const team = task ? tables.rescue_teams.find(t => t.id === task.team_id) : null;
  res.json({
    success: true,
    data: { track, task: task ? { ...task, team_lng: team?.lng, team_lat: team?.lat, team_status: team?.status } : null },
  });
});

export default router;
