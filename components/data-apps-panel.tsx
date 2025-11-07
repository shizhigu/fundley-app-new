'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ExternalLinkIcon, RefreshCw, Trash2, Archive, RotateCcw } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface DataApp {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  url: string;
  deployment_status: 'pending' | 'deploying' | 'ready' | 'deployed' | 'failed' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  fly_app_deleted?: boolean;
}

export function DataAppsPanel() {
  const { user } = useUser();
  const [apps, setApps] = useState<DataApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [redeployingSlug, setRedeployingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<DataApp | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<{ slug: string; title: string } | null>(null);

  const fetchApps = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('/api/data-apps');

      if (!response.ok) {
        throw new Error('Failed to fetch data apps');
      }

      const data = await response.json();
      setApps(data.apps || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data apps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchApps(true);
  };

  const handleDeleteClick = (slug: string, title: string) => {
    setAppToDelete({ slug, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appToDelete) return;

    setDeletingSlug(appToDelete.slug);
    setDeleteDialogOpen(false);

    try {
      const response = await fetch('/api/data-apps/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: appToDelete.slug }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete dashboard');
      }

      // Refresh apps list
      await fetchApps();
      setError(null);
    } catch (err) {
      console.error('Error deleting dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete dashboard');
    } finally {
      setDeletingSlug(null);
      setAppToDelete(null);
    }
  };

  const handleRedeploy = async (slug: string, title: string) => {
    setRedeployingSlug(slug);

    try {
      const response = await fetch('/api/data-apps/redeploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: slug }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to redeploy dashboard');
      }

      // Refresh apps list to show deploying status
      await fetchApps();
      setError(null);
    } catch (err) {
      console.error('Error redeploying dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to redeploy dashboard');
    } finally {
      setRedeployingSlug(null);
    }
  };

  // Initial load
  useEffect(() => {
    fetchApps();
  }, [user?.id]);

  // Smart polling: only poll if there are apps in deploying/pending state
  useEffect(() => {
    const hasDeployingApps = apps.some(
      (app) => app.deployment_status === 'deploying' || app.deployment_status === 'pending'
    );

    if (!hasDeployingApps) return;

    // Poll every 5 seconds only when there are deploying apps
    const interval = setInterval(fetchApps, 5000);
    return () => clearInterval(interval);
  }, [apps]);

  const getStatusIcon = (status: DataApp['deployment_status']) => {
    switch (status) {
      case 'ready':
      case 'deployed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'deploying':
      case 'pending':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'archived':
        return <Archive className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: DataApp['deployment_status']) => {
    switch (status) {
      case 'ready':
      case 'deployed':
        return 'Live';
      case 'deploying':
        return 'Deploying...';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'archived':
        return 'Archived';
      default:
        return 'Unknown';
    }
  };

  const isAppReady = (status: DataApp['deployment_status']) => {
    return status === 'ready' || status === 'deployed';
  };

  // If an app is selected, show iframe view
  if (selectedApp) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        {/* Header with back button */}
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedApp(null)}
              className="h-8 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="border-l border-border h-6" />
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
              {selectedApp.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(selectedApp.url, '_blank', 'noopener,noreferrer')}
            className="h-8 px-2"
          >
            <ExternalLinkIcon className="w-4 h-4 mr-1" />
            Open in new tab
          </Button>
        </div>

        {/* Iframe container */}
        <div className="flex-1 relative bg-white">
          <iframe
            src={selectedApp.url}
            className="absolute inset-0 w-full h-full border-0"
            title={selectedApp.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          />
        </div>
      </div>
    );
  }

  // List view
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-4">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ExternalLink className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">No dashboards yet</p>
          <p className="text-sm max-w-sm">
            Ask me to create a live dashboard for tracking stocks, analyzing data, or monitoring markets in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">My Dashboards</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {apps.length} {apps.length === 1 ? 'dashboard' : 'dashboards'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={cn(
                "w-3.5 h-3.5",
                refreshing && "animate-spin"
              )} />
            </Button>
          </div>
        </div>
      </div>

      {/* Apps List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className={cn(
                'group relative rounded-lg border-2 p-5',
                'transition-all duration-200',
                isAppReady(app.deployment_status)
                  ? 'border-border bg-card hover:border-brand-primary hover:bg-brand-primary/5 cursor-pointer hover:shadow-lg hover:scale-[1.02]'
                  : app.deployment_status === 'archived'
                  ? 'border-border bg-card opacity-80'
                  : 'border-border/50 bg-card/50 cursor-not-allowed opacity-60'
              )}
              onClick={() => {
                if (isAppReady(app.deployment_status)) {
                  setSelectedApp(app);
                }
              }}
            >
              {/* Status Badge - Top Right */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm">
                {getStatusIcon(app.deployment_status)}
                <span className="text-xs font-medium">
                  {getStatusText(app.deployment_status)}
                </span>
              </div>

              {/* Content */}
              <div className="pr-24">
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-brand-primary transition-colors flex items-center gap-2">
                  {app.title}
                  {isAppReady(app.deployment_status) && (
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </h3>
                {app.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {app.deployment_status === 'archived' && app.archived_at
                    ? `Archived ${new Date(app.archived_at).toLocaleDateString()}`
                    : `Updated ${new Date(app.updated_at).toLocaleDateString()}`}
                </span>
                <div className="flex items-center gap-2">
                  {isAppReady(app.deployment_status) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-brand-primary/10 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="font-medium">Click to view</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                  {app.deployment_status === 'archived' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRedeploy(app.slug, app.title);
                      }}
                      disabled={redeployingSlug === app.slug}
                      className="h-7 px-2 hover:bg-brand-primary/10 hover:text-brand-primary text-muted-foreground"
                      title="Redeploy dashboard"
                    >
                      {redeployingSlug === app.slug ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      )}
                      <span className="text-xs font-medium">Redeploy</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(app.slug, app.title);
                      }}
                      disabled={deletingSlug === app.slug}
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      title="Delete dashboard"
                    >
                      {deletingSlug === app.slug ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dashboard</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">
                  {appToDelete?.title}
                </span>
                ?
              </p>
              <p className="text-sm text-muted-foreground">
                This will permanently remove the app from Fly.io and cannot be undone.
              </p>
              <p className="text-sm text-muted-foreground">
                The source code will be preserved on the dev machine for future redeployment.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
