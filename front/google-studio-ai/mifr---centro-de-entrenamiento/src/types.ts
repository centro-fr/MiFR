export type ViewMode = 'all' | 'desktop' | 'mobile';

export type DesktopState = 1 | 2 | 3 | 4;

export interface RoleInfo {
  id: 'alumnos' | 'profesores' | 'admin';
  title: string;
  badge: string;
  description: string;
  features: string[];
}
