import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

// Purpose: Main layout wrapper for all dashboard pages
// Includes sidebar, top navigation bar, and content area

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-border bg-card sticky top-0 z-10 shadow-sm">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Search - Removed */}
            <div className="flex-1 max-w-md">
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
