/**
 * 认证路由 - 四类角色统一登录
 */
import { Router, type Request, type Response } from 'express';
import { tables, initData } from '../db.js';

const router = Router();
export const tokens = new Map<string, string>();

/**
 * 根据请求头获取当前用户（供其他模块复用）
 */
export function getUserFromReq(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const userId = tokens.get(token);
  if (!userId) return null;
  return tables.users.find(u => u.id === userId) || null;
}

router.post('/login', (req: Request, res: Response): void => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: '请输入用户名和密码' });
    return;
  }

  initData();
  const user = tables.users.find(u => u.username === username);

  if (!user || user.password !== password) {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
    return;
  }

  if (role && user.role !== role) {
    res.status(403).json({ success: false, error: '该账号无此角色权限' });
    return;
  }

  const token = `tk_${user.id}_${Date.now()}`;
  tokens.set(token, user.id);

  let extra: any = {};
  if (user.role === 'villager' && user.village_id) {
    extra.village = tables.villages.find(v => v.id === user.village_id);
  }
  if (user.role === 'rescue' && user.team_id) {
    extra.team = tables.rescue_teams.find(t => t.id === user.team_id);
  }

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id, username: user.username, role: user.role,
        name: user.name, phone: user.phone, avatar: user.avatar,
        villageId: user.village_id, teamId: user.team_id,
      },
      ...extra,
    },
  });
});

router.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ success: false, error: '未登录' }); return; }
  const token = authHeader.replace('Bearer ', '');
  const userId = tokens.get(token);
  if (!userId) { res.status(401).json({ success: false, error: 'Token无效' }); return; }

  const user = tables.users.find(u => u.id === userId);
  if (!user) { res.status(404).json({ success: false, error: '用户不存在' }); return; }

  let extra: any = {};
  if (user.role === 'villager' && user.village_id) {
    extra.village = tables.villages.find(v => v.id === user.village_id);
  }
  if (user.role === 'rescue' && user.team_id) {
    extra.team = tables.rescue_teams.find(t => t.id === user.team_id);
  }

  res.json({
    success: true,
    data: {
      id: user.id, username: user.username, role: user.role,
      name: user.name, phone: user.phone, avatar: user.avatar,
      villageId: user.village_id, teamId: user.team_id,
      ...extra,
    },
  });
});

export default router;
