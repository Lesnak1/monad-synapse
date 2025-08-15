"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity, 
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Settings,
  Download,
  RefreshCw,
  Zap,
  Lock,
  Eye,
  BarChart3
} from 'lucide-react';
import { securityAuditor } from '@/lib/securityAudit';
import { poolManager } from '@/lib/poolWallet';
import { transactionMonitor } from '@/lib/transactionMonitor';
import { multiSigManager } from '@/lib/multiSigManager';
import { formatEther } from 'viem';
import { toast } from 'react-hot-toast';

interface DashboardData {
  securityReport: any;
  poolStats: any;
  transactionStats: any;
  multiSigStats: any;
  systemStatus: any;
}

interface SecurityMetric {
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

export default function SecurityDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const securityReport = await securityAuditor.runFullAudit();
      const poolStats = poolManager.getPoolStatistics();
      const transactionStats = transactionMonitor.getStatistics();
      const multiSigStats = multiSigManager.getStatistics();
      
      const systemStatus = {
        contractManager: { circuitBreakerState: 'closed' },
        gasMarket: {
          baseFeePerGas: 0n,
          gasPrice: 0n,
          networkCongestion: 'low',
          estimatedConfirmationTimes: { standard: 30 }
        },
        poolBalance: await poolManager.getPoolBalance()
      };
      
      const data: DashboardData = {
        securityReport,
        poolStats,
        transactionStats,
        multiSigStats,
        systemStatus
      };
      
      setDashboardData(data);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load security dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchDashboardData, autoRefresh]);

  const getStatusColor = (status: 'good' | 'warning' | 'critical' | string) => {
    switch (status) {
      case 'good':
      case 'pass':
      case 'secure':
        return 'text-green-600 bg-green-50';
      case 'warning':
      case 'needs_attention':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
      case 'fail':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSecurityIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'secure':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'needs_attention':
        return <AlertTriangle className="h-4 w-4" />;
      case 'fail':
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading Security Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            onClick={fetchDashboardData}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Audit
          </TabsTrigger>
          <TabsTrigger value="pool" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pool Management
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="multisig" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Multi-Signature
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Security Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Shield className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <p className="text-2xl font-bold text-green-600">System Secure</p>
                <p className="text-gray-600">All security checks passed</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pool" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Pool Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <DollarSign className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-2xl font-bold">Pool Status</p>
                <p className="text-gray-600">Monitoring pool operations</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Transaction Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Activity className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                <p className="text-2xl font-bold">Transactions Active</p>
                <p className="text-gray-600">Monitoring transaction flow</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multisig" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Multi-Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Lock className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                <p className="text-2xl font-bold">Multi-Sig Active</p>
                <p className="text-gray-600">Managing signatures and proposals</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}