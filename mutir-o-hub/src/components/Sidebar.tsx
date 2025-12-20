import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings,
  Activity,
  Clock,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Purpose: Main navigation sidebar for the admin dashboard
// Shows all available pages and highlights the current page

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Cities', path: '/cities', icon: Activity },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'Appointments', path: '/appointments', icon: Users },
  { name: 'Patients', path: '/patients', icon: Users },
  { name: 'Time Slots', path: '/time-slots', icon: Clock },
  { name: 'Conversation Logs', path: '/conversation-logs', icon: MessageSquare },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen sticky top-0">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Mutirão</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-secondary',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Admin User</p>
          <p>admin@mutirao.com</p>
        </div>
      </div>
    </aside>
  );
}
