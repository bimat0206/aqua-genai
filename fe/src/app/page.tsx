
'use client';

import React, { useState, useEffect } from 'react';
import NewVerificationPage from '@/components/new-verification-page';
import HistoryPage from '@/components/history-page';
import HomeLandingPage from '@/components/home-landing-page';
import HealthPage from '@/components/health-page';
import { Button } from '@/components/ui/button';
import { AppWindow, History, Waves, Home as HomeIcon, Loader2, HeartPulse } from 'lucide-react';
import type { ServiceStatusType } from '@/types';
import { cn } from '@/lib/utils';

type ActiveView = 'home' | 'new' | 'results' | 'health';

const StatusDisplayPill: React.FC<{ status: ServiceStatusType }> = ({ status }) => {
  let pillClasses = 'bg-muted text-foreground'; 
  let dotClasses = 'bg-gray-400'; 
  let statusText = 'Checking...';
  let ShowIcon: React.ElementType | null = Loader2; 

  if (status === 'Operational') {
    dotClasses = 'bg-green-400'; 
    statusText = 'Connected';
    ShowIcon = null;
  } else if (status === 'Degraded') {
    dotClasses = 'bg-yellow-400'; 
    statusText = 'Degraded';
    ShowIcon = null;
  } else if (status === 'Offline') {
    dotClasses = 'bg-red-400'; 
    statusText = 'Offline';
    ShowIcon = null;
  }


  return (
    <div
      className={cn(
        'flex items-center space-x-2 px-2 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200',
        pillClasses,
      )}
      aria-live="polite"
      aria-label={`System Status: ${status}`}
    >
      {ShowIcon ? (
        <ShowIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-foreground" />
      ) : (
        <span className={cn('inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full', dotClasses)} />
      )}
      <span>{statusText}</span>
    </div>
  );
};

export default function RootPage() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [systemHealthStatus, setSystemHealthStatus] = useState<ServiceStatusType>('Checking...');

  useEffect(() => {
    const fetchHealthStatus = () => {
      setTimeout(() => {
        const statuses: ServiceStatusType[] = ['Operational', 'Degraded', 'Offline'];
        const randomValue = Math.random();
        let randomStatus: ServiceStatusType;

        if (randomValue < 0.8) {
          randomStatus = 'Operational';
        } else if (randomValue < 0.95) {
          randomStatus = 'Degraded';
        } else {
          randomStatus = 'Offline';
        }
        setSystemHealthStatus(randomStatus);
      }, 500 + Math.random() * 500);
    };

    setSystemHealthStatus('Checking...');
    fetchHealthStatus();

    const intervalId = setInterval(() => {
        setSystemHealthStatus('Checking...');
        fetchHealthStatus();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const navigateTo = (view: ActiveView) => {
    setActiveView(view);
  };

  const navButtonClass = (view: ActiveView) => 
    activeView === view 
      ? 'bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to text-foreground shadow-md' 
      : 'text-muted-foreground hover:text-primary';

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-md p-1 -ml-1"
            aria-label="Go to homepage"
          >
            <Waves className="h-8 w-8 bg-clip-text text-transparent bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to">
              AquaVision
            </h1>
          </button>
          <nav className="flex items-center">
            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant={activeView === 'home' ? 'default' : 'ghost'}
                onClick={() => navigateTo('home')}
                className={navButtonClass('home')}
                aria-current={activeView === 'home' ? 'page' : undefined}
              >
                <HomeIcon className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button
                variant={activeView === 'new' ? 'default' : 'ghost'}
                onClick={() => navigateTo('new')}
                className={navButtonClass('new')}
                aria-current={activeView === 'new' ? 'page' : undefined}
              >
                <AppWindow className="mr-2 h-4 w-4" />
                New Verification
              </Button>
              <Button
                variant={activeView === 'results' ? 'default' : 'ghost'}
                onClick={() => navigateTo('results')}
                className={navButtonClass('results')}
                aria-current={activeView === 'results' ? 'page' : undefined}
              >
                <History className="mr-2 h-4 w-4" />
                Results
              </Button>
               <Button
                variant={activeView === 'health' ? 'default' : 'ghost'}
                onClick={() => navigateTo('health')}
                className={navButtonClass('health')}
                aria-current={activeView === 'health' ? 'page' : undefined}
              >
                <HeartPulse className="mr-2 h-4 w-4" />
                Health
              </Button>
            </div>
            <div className="ml-6"> 
                <StatusDisplayPill status={systemHealthStatus} />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeView === 'home' && <HomeLandingPage onNavigate={navigateTo} />}
        {activeView === 'new' && <NewVerificationPage onNavigate={navigateTo} />}
        {activeView === 'results' && <HistoryPage />}
        {activeView === 'health' && <HealthPage />}
      </main>

      <footer className="py-4 md:px-8 border-t border-border bg-card flex-shrink-0">
        <div className="container flex flex-col items-center justify-between gap-2 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} RenovaCloud. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
