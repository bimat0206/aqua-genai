
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Server, Database, BrainCircuit, Globe } from 'lucide-react';
import type { ServiceHealthInfo, ServiceStatusType } from '@/types';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { getApiEndpoint } from '@/lib/api-client';

const initialServices: ServiceHealthInfo[] = [
  { id: 'ai-analysis', name: 'AI Analysis Service', status: 'Checking...', lastChecked: 'N/A', details: 'Responsible for product image analysis.' },
  { id: 'database', name: 'Database Connection', status: 'Checking...', lastChecked: 'N/A', details: 'Stores and retrieves verification data.' },
  { id: 'image-storage', name: 'Image Storage Service', status: 'Checking...', lastChecked: 'N/A', details: 'Manages uploaded product images.' },
];

const ServiceIcon: React.FC<{ serviceId: string }> = ({ serviceId }) => {
  switch (serviceId) {
    case 'ai-analysis':
      return <BrainCircuit className="w-6 h-6 text-primary" />;
    case 'database':
      return <Database className="w-6 h-6 text-primary" />;
    case 'image-storage':
      return <Server className="w-6 h-6 text-primary" />;
    default:
      return <Server className="w-6 h-6 text-primary" />;
  }
}

const getStatusBadgeVariant = (status: ServiceStatusType): { variant: "outline" | "default" | "secondary" | "destructive", className: string } => {
  switch (status) {
    case 'Operational':
      return { variant: 'default', className: 'bg-status-correct text-primary-foreground border-transparent font-bold' };
    case 'Degraded':
      return { variant: 'default', className: 'bg-status-uncertain text-primary-foreground border-transparent font-bold' };
    case 'Offline':
      return { variant: 'destructive', className: 'bg-status-incorrect text-destructive-foreground border-transparent font-bold' };
    case 'Checking...':
    default:
      return { variant: 'secondary', className: 'text-muted-foreground' };
  }
};

const HealthPage: React.FC = () => {
  const [services, setServices] = useState<ServiceHealthInfo[]>(initialServices);
  const [lastCheckedAll, setLastCheckedAll] = useState<string>('N/A');
  const [isChecking, setIsChecking] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string>('N/A');

  // Get current API endpoint
  useEffect(() => {
    try {
      const endpoint = getApiEndpoint();
      setCurrentEndpoint(endpoint);
    } catch (error) {
      setCurrentEndpoint('Not configured');
    }
  }, []);

  const checkServiceHealth = (service: ServiceHealthInfo): Promise<ServiceHealthInfo> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const statuses: ServiceStatusType[] = ['Operational', 'Degraded', 'Offline'];
        // Make "Operational" more likely
        const randomStatus = Math.random() < 0.7 ? 'Operational' : getRandomElement(statuses.filter(s => s !== 'Operational'));
        
        resolve({
          ...service,
          status: randomStatus,
          lastChecked: format(new Date(), 'PPpp'),
        });
      }, Math.random() * 1000 + 500); // Simulate network delay
    });
  };

  const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const refreshAllServices = async () => {
    setIsChecking(true);
    // Reset only the services listed in the current initialServices
    setServices(prevServices => 
        initialServices.map(initialService => {
            const existingService = prevServices.find(ps => ps.id === initialService.id);
            return { ...(existingService || initialService), status: 'Checking...' };
        })
    );


    const updatedServicesPromises = initialServices.map(service => checkServiceHealth(service));
    const updatedServices = await Promise.all(updatedServicesPromises);
    
    setServices(updatedServices);
    setLastCheckedAll(format(new Date(), 'PPpp'));
    setIsChecking(false);
  };

  useEffect(() => {
    refreshAllServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background text-foreground font-body p-4 md:p-6 min-h-full flex items-center justify-center">
      <div className="w-full max-w-7xl">
        
        <div className="text-center mb-8">
          <h1 className="text-center text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to bg-clip-text text-transparent">
              System Health Check
            </span>
          </h1>
          <p className="text-center text-muted-foreground mb-4 text-sm md:text-base">
            Monitor the status of AquaVision and its dependent services. Last full check: {lastCheckedAll}
          </p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <Card key={service.id} className="bg-card shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <ServiceIcon serviceId={service.id} />
                <Badge {...getStatusBadgeVariant(service.status)}>
                  {service.status}
                </Badge>
              </div>
              <CardTitle className="text-xl text-primary">{service.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground h-10"> {/* Fixed height for description */}
                {service.details}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Last Checked: {service.lastChecked}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-8 bg-card shadow-md">
        <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-primary">Overall System Status</CardTitle>
              <Button
                onClick={refreshAllServices}
                disabled={isChecking}
                size="sm"
                variant="outline"
                className="border-border hover:bg-muted/50 transition-colors"
              >
                <RefreshCcw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Refresh'}
              </Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              {isChecking ? (
                   <div className="flex items-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> 
                      <p className="text-muted-foreground">Calculating overall status...</p>
                   </div>
              ) : services.every(s => s.status === 'Operational') ? (
                  <div className="flex items-center space-x-2 text-status-correct">
                      <CheckCircle className="w-6 h-6" />
                      <p className="text-lg font-semibold">All systems operational.</p>
                  </div>
              ) : services.some(s => s.status === 'Offline') ? (
                   <div className="flex items-center space-x-2 text-status-incorrect">
                      <XCircle className="w-6 h-6" />
                      <p className="text-lg font-semibold">Critical services offline. System may be unstable.</p>
                  </div>
              ) : services.some(s => s.status === 'Degraded') ? (
                   <div className="flex items-center space-x-2 text-status-uncertain">
                      <AlertTriangle className="w-6 h-6" />
                      <p className="text-lg font-semibold">Some services are degraded. Performance may be affected.</p>
                  </div>
              ) : (
                   <div className="flex items-center space-x-2 text-muted-foreground">
                       <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-lg font-semibold">Determining system status...</p>
                   </div>
              )}
            </div>
            
            {/* Connected Endpoint Display */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span className="font-medium">Connected Endpoint:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                  {currentEndpoint}
                </code>
              </div>
            </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default HealthPage;
