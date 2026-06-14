/**
 * FloodGuard API 客户端
 */
import type {
  User, Village, Shelter, Warning, Personnel, RescueTask, RescueTeam,
  TrackPoint, AgricultureRecord, DashboardStats, ModelDerivation,
} from '@/types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('fg_token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data as T;
}

// ============ 认证 API ============
export const authApi = {
  login: (username: string, password: string, role?: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),
  me: () => request<User>('/auth/me'),
};

// ============ 地理信息 API ============
export const geoApi = {
  villages: () => request<Village[]>('/villages'),
  shelters: (villageId?: string) =>
    request<Shelter[]>(`/shelters${villageId ? `?villageId=${villageId}` : ''}`),
};

// ============ 预警 API ============
export const warningApi = {
  list: (params?: { villageId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.villageId) qs.set('villageId', params.villageId);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return request<Warning[]>(`/warnings${query ? `?${query}` : ''}`);
  },
  detail: (id: string) => request<Warning & { derivation: ModelDerivation }>(`/warnings/${id}`),
  simulate: (data: {
    villageId: string; rainfallIntensity: number; cumulativeRainfall: number;
    forecastRainfall: number; population: number;
  }) =>
    request<{ derivation: ModelDerivation; publicText: string; professionalText: string; level: string; village: Village }>(
      '/warnings/simulate', { method: 'POST', body: JSON.stringify(data) }
    ),
  publish: (data: {
    villageId: string; rainfallIntensity: number; cumulativeRainfall: number;
    forecastRainfall: number; population: number; customPublicText?: string;
  }) => request<Warning>('/warnings', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) => request<{ id: string; status: string }>(`/warnings/${id}/cancel`, { method: 'PATCH' }),
};

// ============ 人员 API ============
export const personnelApi = {
  list: (params?: { villageId?: string; status?: string; injuryLevel?: string }) => {
    const qs = new URLSearchParams();
    if (params?.villageId) qs.set('villageId', params.villageId);
    if (params?.status) qs.set('status', params.status);
    if (params?.injuryLevel) qs.set('injuryLevel', params.injuryLevel);
    const query = qs.toString();
    return request<Personnel[]>(`/personnel${query ? `?${query}` : ''}`);
  },
  detail: (id: string) => request<Personnel & { tasks: RescueTask[] }>(`/personnel/${id}`),
  register: (data: {
    userId?: string; name: string; phone?: string; villageId: string;
    lng?: number; lat?: number; companionCount?: number; photoUrl?: string;
  }) => request<{ id: string; status: string; arriveTime?: string }>(
    '/personnel/register', { method: 'POST', body: JSON.stringify(data) }
  ),
  report: (data: {
    userId?: string; personnelId?: string; injuryLevel: string;
    materialNeeds: string; lng?: number; lat?: number;
  }) => request<{ id: string; injuryLevel: string; materialNeeds: string }>(
    '/personnel/report', { method: 'POST', body: JSON.stringify(data) }
  ),
};

// ============ 救援 API ============
export const rescueApi = {
  teams: () => request<(RescueTeam & { current_task_id?: string | null; current_target?: string | null })[]>('/rescue/teams'),
  tasks: (params?: { teamId?: string; status?: string; personnelId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.teamId) qs.set('teamId', params.teamId);
    if (params?.status) qs.set('status', params.status);
    if (params?.personnelId) qs.set('personnelId', params.personnelId);
    const query = qs.toString();
    return request<RescueTask[]>(`/rescue/tasks${query ? `?${query}` : ''}`);
  },
  taskDetail: (id: string) => request<RescueTask & { track: TrackPoint[] }>(`/rescue/tasks/${id}`),
  createTask: (data: {
    personnelId: string; teamId: string;
    hazardNote?: string; forbiddenRoutes?: string; optimalRoute?: string;
  }) => request<RescueTask>('/rescue/tasks', { method: 'POST', body: JSON.stringify(data) }),
  assign: (data: {
    personnelId: string; teamId: string;
    hazardNote?: string; forbiddenRoutes?: string; optimalRoute?: string;
  }) => request<RescueTask>('/rescue/assign', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (taskId: string) =>
    request<{ id: string; status: string }>('/rescue/cancel', {
      method: 'POST', body: JSON.stringify({ taskId })
    }),
  updateTask: (id: string, status: string) =>
    request<{ id: string; status: string }>(`/rescue/tasks/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status })
    }),
  reportLocation: (data: { taskId?: string; teamId: string; lng: number; lat: number }) =>
    request<{ lng: number; lat: number; timestamp: string }>('/rescue/location', {
      method: 'POST', body: JSON.stringify(data)
    }),
  track: (taskId: string) =>
    request<{ track: TrackPoint[]; task: RescueTask & { team_lng: number; team_lat: number; team_status: string } }>(
      `/rescue/track/${taskId}`
    ),
};

// ============ 农业 API ============
export const agricultureApi = {
  records: (params?: { villageId?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.villageId) qs.set('villageId', params.villageId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return request<AgricultureRecord[]>(`/agriculture/records${query ? `?${query}` : ''}`);
  },
  create: (data: Record<string, unknown>) =>
    request<AgricultureRecord>('/agriculture/records', { method: 'POST', body: JSON.stringify(data) }),
  summary: (villageId?: string) =>
    request<{ summary: Record<string, number>; byVillage: any[] }>(`/agriculture/summary${villageId ? `?villageId=${villageId}` : ''}`),
};

// ============ 大屏 API ============
export const dashboardApi = {
  stats: () => request<DashboardStats>('/dashboard/stats'),
};
