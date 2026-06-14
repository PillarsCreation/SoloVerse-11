/**
 * FloodGuard API Server - Express 应用配置
 */
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initData } from './db.js'
import authRoutes from './routes/auth.js'
import { getUserFromReq } from './routes/auth.js'
import geoRoutes from './routes/geo.js'
import warningRoutes from './routes/warnings.js'
import personnelRoutes from './routes/personnel.js'
import rescueRoutes from './routes/rescue.js'
import agricultureRoutes from './routes/agriculture.js'
import dashboardRoutes from './routes/dashboard.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 初始化数据
initData()

/**
 * API 角色权限校验中间件
 * 根据 路径+方法 匹配规则，校验调用者角色，不匹配返回 403
 */
interface RoleRule {
  pattern: RegExp
  method: string
  roles: string[]
}
const ROLE_RULES: RoleRule[] = [
  // 预警发布/取消 → 仅 admin
  { pattern: /^\/api\/warnings$/, method: 'POST', roles: ['admin'] },
  { pattern: /^\/api\/warnings\/simulate$/, method: 'POST', roles: ['admin'] },
  { pattern: /^\/api\/warnings\/[^/]+\/cancel$/, method: 'PATCH', roles: ['admin'] },
  // 救援任务指派/撤销 → 仅 admin
  { pattern: /^\/api\/rescue\/assign$/, method: 'POST', roles: ['admin'] },
  { pattern: /^\/api\/rescue\/cancel$/, method: 'POST', roles: ['admin'] },
  // 救援任务创建 → 仅 admin
  { pattern: /^\/api\/rescue\/tasks$/, method: 'POST', roles: ['admin'] },
  // 救援位置上报 → 仅 rescue
  { pattern: /^\/api\/rescue\/location$/, method: 'POST', roles: ['rescue'] },
  // 救援任务状态流转 → 仅 rescue
  { pattern: /^\/api\/rescue\/tasks\/[^/]+$/, method: 'PATCH', roles: ['rescue'] },
  // 村民登记/上报 → 仅 villager
  { pattern: /^\/api\/personnel\/register$/, method: 'POST', roles: ['villager'] },
  { pattern: /^\/api\/personnel\/report$/, method: 'POST', roles: ['villager'] },
  // 农业灾情录入 → 仅 agriculture
  { pattern: /^\/api\/agriculture\/records$/, method: 'POST', roles: ['agriculture'] },
]

app.use((req: Request, res: Response, next: NextFunction) => {
  const matched = ROLE_RULES.find(
    r => r.method === req.method && r.pattern.test(req.path)
  )
  if (!matched) return next()

  const user = getUserFromReq(req)
  if (!user) {
    res.status(401).json({ success: false, error: '未登录或Token失效' })
    return
  }
  if (!matched.roles.includes(user.role)) {
    res.status(403).json({ success: false, error: '无权限执行此操作（403 Forbidden）' })
    return
  }
  next()
})

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api', geoRoutes)          // /api/villages, /api/shelters
app.use('/api/warnings', warningRoutes)
app.use('/api/personnel', personnelRoutes)
app.use('/api/rescue', rescueRoutes)
app.use('/api/agriculture', agricultureRoutes)
app.use('/api/dashboard', dashboardRoutes)

/**
 * health check
 */
app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: '洪水安防API服务正常' })
})

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', error);
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: '接口不存在' })
})

export default app
