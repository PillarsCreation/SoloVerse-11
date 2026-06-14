/**
 * FloodGuard 内存数据存储
 * 提供与数据库操作兼容的数据接口
 */

// ====== 数据类型 ======
interface Village {
  id: string; name: string; township: string; lng: number; lat: number; terrain_risk: string;
}
interface Shelter {
  id: string; name: string; village_id: string; lng: number; lat: number; capacity: number; current_count: number;
}
interface User {
  id: string; username: string; password: string; role: string; name: string; phone: string;
  village_id?: string; team_id?: string; avatar?: string;
}
interface RescueTeam {
  id: string; name: string; leader_name: string; member_count: number; lng: number; lat: number; status: string;
}
interface Warning {
  id: string; level: string; title: string; village_id: string; center_lng: number; center_lat: number;
  affected_radius: number; public_text: string; professional_text: string; derivation_json: string;
  publish_time: string; expire_time: string; status: string;
}
interface Personnel {
  id: string; name: string; phone: string; village_id: string; lng: number; lat: number;
  shelter_arrive_time?: string; companion_count: number; injury_level: string; material_needs: string;
  safety_status: string; photo_url?: string; user_id?: string; avatar?: string;
}
interface RescueTask {
  id: string; target_personnel_id: string; target_name: string; target_lng: number; target_lat: number;
  team_id: string; team_name?: string; injury_level?: string; material_needs?: string;
  hazard_note?: string; forbidden_routes?: string; optimal_route?: string; status: string;
  eta_minutes?: number; created_at: string; completed_at?: string;
}
interface TrackPoint {
  id: number; task_id: string; team_id: string; lng: number; lat: number; timestamp: string;
}
interface AgricultureRecord {
  id: string; villager_name: string; village_id: string;
  crop_type?: string; crop_area?: number; crop_damage?: string; crop_loss?: number;
  livestock_type?: string; livestock_original?: number; livestock_dead?: number;
  barn_damage?: string; livestock_loss?: number; created_at: string;
}

// ====== 内存数据表 ======
export const tables = {
  villages: [] as Village[],
  shelters: [] as Shelter[],
  users: [] as User[],
  rescue_teams: [] as RescueTeam[],
  warnings: [] as Warning[],
  personnel: [] as Personnel[],
  rescue_tasks: [] as RescueTask[],
  track_points: [] as TrackPoint[],
  agriculture_records: [] as AgricultureRecord[],
};

let trackIdCounter = 1;
let initialized = false;

function avatarUrl(prompt: string): string {
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square_hd`;
}

/**
 * 初始化种子数据
 */
export function initData(): void {
  if (initialized) return;
  initialized = true;

  // 村组数据
  tables.villages = [
    { id: 'V001', name: '青龙山村落', township: '青龙山乡', lng: 103.7521, lat: 29.5543, terrain_risk: '沟谷低洼地带，坡度35°，历史山洪多发区' },
    { id: 'V002', name: '石桥沟村落', township: '青龙山乡', lng: 103.7689, lat: 29.5612, terrain_risk: '河道拐弯凸岸，两侧坡度42°，泥石流隐患区' },
    { id: 'V003', name: '云岭村落', township: '云岭乡', lng: 103.8105, lat: 29.5837, terrain_risk: '双河口交汇处，汇流面积大，山洪高风险区' },
    { id: 'V004', name: '观音岩村落', township: '云岭乡', lng: 103.7923, lat: 29.5748, terrain_risk: '陡坡危岩区域，滑坡历史频发，坡度48°' },
    { id: 'V005', name: '溪源村落', township: '溪源乡', lng: 103.8356, lat: 29.5921, terrain_risk: '溪河上游低洼处，植被覆盖率低，产流快速' },
  ];

  tables.shelters = [
    { id: 'S001', name: '青龙山乡政府安置点', village_id: 'V001', lng: 103.7568, lat: 29.5589, capacity: 300, current_count: 0 },
    { id: 'S002', name: '石桥沟小学安置点', village_id: 'V002', lng: 103.7715, lat: 29.5648, capacity: 200, current_count: 0 },
    { id: 'S003', name: '云岭乡卫生院安置点', village_id: 'V003', lng: 103.8142, lat: 29.5862, capacity: 250, current_count: 0 },
    { id: 'S004', name: '观音岩村委会安置点', village_id: 'V004', lng: 103.7958, lat: 29.5781, capacity: 180, current_count: 0 },
    { id: 'S005', name: '溪源乡文化站安置点', village_id: 'V005', lng: 103.8389, lat: 29.5948, capacity: 220, current_count: 0 },
  ];

  tables.users = [
    { id: 'U001', username: 'admin', password: 'admin123', role: 'admin', name: '防汛抗旱指挥部', phone: '0833-6666001', avatar: avatarUrl('Chinese male flood control dispatch center director general in formal dark suit, professional, confident, headshot portrait, clean office background') },
    { id: 'U002', username: 'villager1', password: '123456', role: 'villager', name: '张志强', phone: '13800138001', village_id: 'V001', avatar: avatarUrl('Chinese male farmer in his 50s, weathered face, wearing simple grey jacket, headshot portrait, rural background') },
    { id: 'U003', username: 'villager2', password: '123456', role: 'villager', name: '李秀英', phone: '13800138002', village_id: 'V002', avatar: avatarUrl('Chinese female farmer in her 40s, friendly smile, wearing floral shirt, headshot portrait, rural background') },
    { id: 'U004', username: 'villager3', password: '123456', role: 'villager', name: '王建国', phone: '13800138003', village_id: 'V003', avatar: avatarUrl('Chinese male farmer in his 60s, thin face, wearing dark blue work clothes, headshot portrait, worried expression') },
    { id: 'U005', username: 'villager4', password: '123456', role: 'villager', name: '赵桂花', phone: '13800138004', village_id: 'V004', avatar: avatarUrl('Chinese elderly female farmer, grey hair, wearing red vest, headshot portrait, kind expression') },
    { id: 'U006', username: 'villager5', password: '123456', role: 'villager', name: '刘德明', phone: '13800138005', village_id: 'V005', avatar: avatarUrl('Chinese male farmer in his 40s, sturdy build, wearing green work clothes, headshot portrait, calm expression') },
    { id: 'U007', username: 'rescue1', password: '123456', role: 'rescue', name: '救援队队长·陈勇', phone: '13900139001', team_id: 'T001', avatar: avatarUrl('Chinese male rescue team captain in orange rescue vest and helmet, determined expression, headshot portrait, emergency background') },
    { id: 'U008', username: 'rescue2', password: '123456', role: 'rescue', name: '救援队队长·杨帆', phone: '13900139002', team_id: 'T002', avatar: avatarUrl('Chinese male rescue team leader in red rescue uniform, serious expression, headshot portrait, outdoor background') },
    { id: 'U009', username: 'agriculture', password: 'agri123', role: 'agriculture', name: '农业统计员·周明', phone: '0833-6666002', avatar: avatarUrl('Chinese male agricultural statistician in white shirt with clipboard, glasses, headshot portrait, office background') },
  ];

  tables.rescue_teams = [
    { id: 'T001', name: '青龙山应急救援一队', leader_name: '陈勇', member_count: 8, lng: 103.7550, lat: 29.5560, status: 'standby' },
    { id: 'T002', name: '云岭应急救援二队', leader_name: '杨帆', member_count: 6, lng: 103.8120, lat: 29.5850, status: 'standby' },
  ];

  tables.personnel = [
    { id: 'P001', name: '张志强', phone: '13800138001', village_id: 'V001', lng: 103.7525, lat: 29.5548, companion_count: 4, injury_level: 'minor', material_needs: '饮用水,食品', safety_status: 'pending', user_id: 'U002', avatar: avatarUrl('Chinese male farmer in his 50s, weathered face, wearing simple grey jacket, headshot portrait, rural background') },
    { id: 'P002', name: '李秀英', phone: '13800138002', village_id: 'V002', lng: 103.7692, lat: 29.5618, companion_count: 3, injury_level: 'none', material_needs: '饮用水', safety_status: 'pending', user_id: 'U003', avatar: avatarUrl('Chinese female farmer in her 40s, friendly smile, wearing floral shirt, headshot portrait, rural background') },
    { id: 'P003', name: '王建国', phone: '13800138003', village_id: 'V003', lng: 103.8108, lat: 29.5842, companion_count: 5, injury_level: 'severe', material_needs: '急救药品,饮用水,食品,保暖物资', safety_status: 'pending', user_id: 'U004', avatar: avatarUrl('Chinese male farmer in his 60s, thin face, wearing dark blue work clothes, headshot portrait, worried expression') },
    { id: 'P004', name: '赵桂花', phone: '13800138004', village_id: 'V004', lng: 103.7928, lat: 29.5753, companion_count: 2, injury_level: 'none', material_needs: '食品', safety_status: 'pending', user_id: 'U005', avatar: avatarUrl('Chinese elderly female farmer, grey hair, wearing red vest, headshot portrait, kind expression') },
    { id: 'P005', name: '刘德明', phone: '13800138005', village_id: 'V005', lng: 103.8362, lat: 29.5928, companion_count: 6, injury_level: 'minor', material_needs: '饮用水,食品,保暖物资', safety_status: 'pending', user_id: 'U006', avatar: avatarUrl('Chinese male farmer in his 40s, sturdy build, wearing green work clothes, headshot portrait, calm expression') },
    { id: 'P006', name: '孙长林', phone: '13800138006', village_id: 'V001', lng: 103.7530, lat: 29.5540, companion_count: 2, injury_level: 'none', material_needs: '', safety_status: 'safe', user_id: undefined, avatar: avatarUrl('Chinese male farmer in his 50s, tanned skin, wearing straw hat, headshot portrait, peaceful expression') },
    { id: 'P007', name: '陈国华', phone: '13800138007', village_id: 'V003', lng: 103.8110, lat: 29.5835, companion_count: 3, injury_level: 'none', material_needs: '饮用水', safety_status: 'sheltered', user_id: undefined, avatar: avatarUrl('Chinese male villager in his 40s, short hair, wearing white t-shirt, headshot portrait, relieved expression') },
  ];

  tables.agriculture_records = [
    { id: 'A001', villager_name: '张志强', village_id: 'V001', crop_type: '水稻', crop_area: 8.5, crop_damage: '全部冲毁', crop_loss: 28000, livestock_type: '鸡', livestock_original: 120, livestock_dead: 80, barn_damage: '圈舍倒塌', livestock_loss: 4800, created_at: '2025-07-15T10:00:00Z' },
    { id: 'A002', villager_name: '李秀英', village_id: 'V002', crop_type: '玉米', crop_area: 5.2, crop_damage: '严重倒伏', crop_loss: 12000, livestock_type: '猪', livestock_original: 15, livestock_dead: 3, barn_damage: '部分损毁', livestock_loss: 6000, created_at: '2025-07-15T10:30:00Z' },
  ];

  console.log('[DB] 内存数据初始化完成');
}

export function genId(prefix: string = ''): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
}

export function nextTrackId(): number {
  return trackIdCounter++;
}
