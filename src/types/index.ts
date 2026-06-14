/**
 * FloodGuard 前端类型定义
 */

export type UserRole = 'admin' | 'villager' | 'rescue' | 'agriculture';
export type WarningLevel = 'red' | 'orange' | 'yellow' | 'blue';
export type InjuryLevel = 'none' | 'minor' | 'severe';
export type SafetyStatus = 'pending' | 'sheltered' | 'rescuing' | 'safe';
export type TaskStatus = 'pending' | 'dispatched' | 'enroute' | 'arrived' | 'completed' | 'cancelled';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  phone: string;
  avatar?: string;
  villageId?: string;
  teamId?: string;
  village?: Village;
  team?: RescueTeam;
}

export interface Village {
  id: string;
  name: string;
  township: string;
  lng: number;
  lat: number;
  terrain_risk: string;
}

export interface Shelter {
  id: string;
  name: string;
  village_id: string;
  lng: number;
  lat: number;
  capacity: number;
  current_count: number;
  village_name?: string;
  township?: string;
}

export interface Warning {
  id: string;
  level: WarningLevel;
  title: string;
  village_id: string;
  center_lng: number;
  center_lat: number;
  affected_radius: number;
  public_text: string;
  professional_text: string;
  derivation_json?: string;
  derivation?: ModelDerivation;
  publish_time: string;
  expire_time: string;
  status: string;
  village_name?: string;
  township?: string;
  terrain_risk?: string;
}

export interface ModelDerivation {
  rainfall: { intensity: number; cumulative: number; forecast: number; dataSource: string };
  runoff: { curveNumber: number; peakFlow: number; convergenceTime: number; yieldTime: number };
  channelRouting: {
    peakArrivalTime: number; peakVelocity: number;
    sections: { name: string; depth: number; flow: number }[];
  };
  inundation: { area: number; maxDepth: number; depthDistribution: string };
  riskAssessment: {
    hazard: number; exposure: number; vulnerability: number;
    riskScore: number; level: WarningLevel;
  };
  transferTask: { personCount: number; routes: string[]; shelterName: string; responsible: string };
  feedbackCorrection: { modelVersion: string; lastCalibrated: string; accuracyNote: string };
}

export interface Personnel {
  id: string;
  name: string;
  phone: string;
  village_id: string;
  lng: number;
  lat: number;
  shelter_arrive_time?: string;
  companion_count: number;
  injury_level: InjuryLevel;
  material_needs: string;
  safety_status: SafetyStatus;
  photo_url?: string;
  avatar?: string;
  user_id?: string;
  village_name?: string;
  township?: string;
  tasks?: RescueTask[];
}

export interface RescueTeam {
  id: string;
  name: string;
  leader_name: string;
  member_count: number;
  lng: number;
  lat: number;
  status: string;
}

export interface RescueTask {
  id: string;
  target_personnel_id: string;
  target_name: string;
  target_lng: number;
  target_lat: number;
  team_id: string;
  team_name?: string;
  injury_level: InjuryLevel;
  material_needs: string;
  hazard_note: string;
  forbidden_routes: string;
  optimal_route: string;
  status: TaskStatus;
  eta_minutes?: number;
  created_at: string;
  completed_at?: string;
  village_name?: string;
  terrain_risk?: string;
  target_phone?: string;
  leader_name?: string;
  member_count?: number;
  avatar?: string;
}

export interface TrackPoint {
  lng: number;
  lat: number;
  timestamp: string;
}

export interface AgricultureRecord {
  id: string;
  villager_name: string;
  village_id: string;
  crop_type?: string;
  crop_area?: number;
  crop_damage?: string;
  crop_loss?: number;
  livestock_type?: string;
  livestock_original?: number;
  livestock_dead?: number;
  barn_damage?: string;
  livestock_loss?: number;
  created_at: string;
  village_name?: string;
  township?: string;
}

export interface DashboardStats {
  personnel: {
    total: number; safe: number; sheltered: number; rescuing: number; pending: number;
    severe_injury: number; minor_injury: number; no_injury: number;
  };
  warnings: {
    total: number; active: number; red: number; orange: number; yellow: number; blue: number;
  };
  rescue: { total: number; in_progress: number; completed: number; pending: number };
  materialNeeds: Record<string, number>;
  shelters: (Shelter & { village_name: string })[];
}

// 预警等级配置
export const WARNING_CONFIG: Record<WarningLevel, { label: string; color: string; bg: string; text: string }> = {
  red: { label: '红色预警', color: '#E62020', bg: 'bg-[#E62020]', text: 'text-white' },
  orange: { label: '橙色预警', color: '#F57C00', bg: 'bg-[#F57C00]', text: 'text-white' },
  yellow: { label: '黄色预警', color: '#FBC000', bg: 'bg-[#FBC000]', text: 'text-[#1D2129]' },
  blue: { label: '蓝色预警', color: '#1976D2', bg: 'bg-[#1976D2]', text: 'text-white' },
};

export const INJURY_CONFIG: Record<InjuryLevel, { label: string; color: string }> = {
  none: { label: '无受伤', color: '#27AE60' },
  minor: { label: '轻微受伤', color: '#F57C00' },
  severe: { label: '重度受伤', color: '#E62020' },
};

export const SAFETY_STATUS_CONFIG: Record<SafetyStatus, { label: string; color: string }> = {
  pending: { label: '待避险', color: '#E62020' },
  sheltered: { label: '已安置', color: '#1976D2' },
  rescuing: { label: '救援中', color: '#F57C00' },
  safe: { label: '已安全', color: '#27AE60' },
};
