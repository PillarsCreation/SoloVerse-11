/**
 * GIS地图组件 - 基于Leaflet
 * 支持风险区域、人员点位、救援轨迹展示
 * 包含青龙山区地理标注：山脉、河流、沟谷等地形要素
 */
import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Warning, Personnel, RescueTask, TrackPoint, Village, Shelter } from '@/types';

// 修复Leaflet默认图标
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 自定义图标创建
function createIcon(color: string, label?: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: bold; color: #fff;
    ">${label || ''}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// 地理要素标注图标（山脉、河流等）
function createGeoLabelIcon(emoji: string, text: string, color: string) {
  return L.divIcon({
    className: 'geo-label-marker',
    html: `<div style="
      display: flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.85); backdrop-filter: blur(4px);
      padding: 3px 8px; border-radius: 12px;
      border: 1px solid ${color}40;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      font-size: 12px; font-weight: 600; color: ${color};
      white-space: nowrap;
    ">${emoji} ${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// 青龙山区地理要素数据
const GEO_FEATURES = [
  { lng: 103.7480, lat: 29.5700, emoji: '\u26F0\uFE0F', text: '青龙山', color: '#795548' },
  { lng: 103.7600, lat: 29.5480, emoji: '\u{1F30A}', text: '青龙溪', color: '#1976D2' },
  { lng: 103.7720, lat: 29.5650, emoji: '\u{1F3DE}\uFE0F', text: '石桥沟', color: '#795548' },
  { lng: 103.8000, lat: 29.5900, emoji: '\u26F0\uFE0F', text: '云岭', color: '#795548' },
  { lng: 103.7900, lat: 29.5680, emoji: '\u{1F3DE}\uFE0F', text: '观音岩', color: '#795548' },
  { lng: 103.8300, lat: 29.5980, emoji: '\u{1F30A}', text: '溪源河', color: '#1976D2' },
  { lng: 103.7850, lat: 29.5460, emoji: '\u{1F332}', text: '青龙山林区', color: '#2E7D32' },
];

const WARNING_COLORS: Record<string, string> = {
  red: '#E62020', orange: '#F57C00', yellow: '#FBC000', blue: '#1976D2',
};

// 自动调整地图视野
function FitBounds({ villages }: { villages?: Village[] }) {
  const map = useMap();
  useEffect(() => {
    if (villages && villages.length > 0) {
      const bounds = L.latLngBounds(villages.map(v => [v.lat, v.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [villages, map]);
  return null;
}

interface GisMapProps {
  center?: [number, number];
  zoom?: number;
  villages?: Village[];
  warnings?: Warning[];
  personnel?: Personnel[];
  tasks?: RescueTask[];
  tracks?: Record<string, TrackPoint[]>;
  shelters?: Shelter[];
  teamPosition?: { lng: number; lat: number };
  className?: string;
  showFitBounds?: boolean;
}

export default function GisMap({
  center = [29.5550, 103.7900],
  zoom = 13,
  villages,
  warnings = [],
  personnel = [],
  tasks = [],
  tracks = {},
  shelters = [],
  teamPosition,
  className = '',
  showFitBounds = false,
}: GisMapProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
        {/* 地形地貌图层：显示山脉、河道、平原、高地等地形特征 */}
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenTopoMap (CC-BY-SA)'
          maxZoom={17}
        />
        {/* 补充标注图层：显示道路、地名等 */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
          maxZoom={20}
        />

        {showFitBounds && <FitBounds villages={villages} />}

        {/* 青龙山区地理要素标注：山脉、河流、沟谷等 */}
        {GEO_FEATURES.map((f, i) => (
          <Marker
            key={`geo-${i}`}
            position={[f.lat, f.lng]}
            icon={createGeoLabelIcon(f.emoji, f.text, f.color)}
            interactive={false}
          />
        ))}

        {/* 预警区域 */}
        {warnings.map(w => (
          <Circle
            key={w.id}
            center={[w.center_lat, w.center_lng]}
            radius={w.affected_radius || 1000}
            pathOptions={{
              color: WARNING_COLORS[w.level] || '#1976D2',
              fillColor: WARNING_COLORS[w.level] || '#1976D2',
              fillOpacity: 0.15,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{w.title}</strong><br />
                <span>等级: {w.level}</span><br />
                <span>状态: {w.status}</span>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* 村组标记 */}
        {villages?.map(v => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={createIcon('#005288', v.name.charAt(0))}
          >
            <Popup>
              <div className="text-sm">
                <strong>{v.name}</strong><br />
                <span>{v.township}</span><br />
                <span className="text-xs text-gray-600">{v.terrain_risk}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 安置点标记 */}
        {shelters.map(s => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createIcon('#27AE60', '安')}
          >
            <Popup>
              <div className="text-sm">
                <strong>{s.name}</strong><br />
                <span>容量: {s.capacity} | 已安置: {s.current_count || 0}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 人员点位 */}
        {personnel.map(p => {
          const color = p.safety_status === 'safe' ? '#27AE60' :
                        p.safety_status === 'sheltered' ? '#1976D2' :
                        p.safety_status === 'rescuing' ? '#F57C00' : '#E62020';
          const label = p.injury_level === 'severe' ? '重' :
                        p.injury_level === 'minor' ? '伤' : '人';
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createIcon(color, label)}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{p.name}</strong><br />
                  <span>同行: {p.companion_count}人</span><br />
                  <span>伤情: {p.injury_level}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 救援轨迹 */}
        {Object.entries(tracks).map(([taskId, points]) => {
          if (points.length < 2) return null;
          const task = tasks.find(t => t.id === taskId);
          const positions = points.map(p => [p.lat, p.lng] as [number, number]);
          return (
            <Polyline
              key={taskId}
              positions={positions}
              pathOptions={{ color: '#2E7DFF', weight: 4, dashArray: '8 4' }}
            >
              {task && (
                <Popup>
                  <div className="text-sm">
                    <strong>救援轨迹</strong><br />
                    <span>目标: {task.target_name}</span><br />
                    <span>状态: {task.status}</span>
                  </div>
                </Popup>
              )}
            </Polyline>
          );
        })}

        {/* 救援队伍位置 */}
        {teamPosition && (
          <Marker
            position={[teamPosition.lat, teamPosition.lng]}
            icon={createIcon('#F57C00', '救')}
          >
            <Popup>
              <div className="text-sm"><strong>救援队伍当前位置</strong></div>
            </Popup>
          </Marker>
        )}

        {/* 任务目标点 */}
        {tasks.map(t => (
          <Marker
            key={`target-${t.id}`}
            position={[t.target_lat, t.target_lng]}
            icon={createIcon('#E62020', '目标')}
          >
            <Popup>
              <div className="text-sm">
                <strong>营救目标: {t.target_name}</strong><br />
                <span>状态: {t.status}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
