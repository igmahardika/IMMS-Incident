import React from 'react';
import { Activity, LayoutList, Map, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/index.jsx';

export function TopologyHeaderActions({ viewMode, setViewMode, openCreate }) {
  return (
    <>
      <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
        <Button
          variant={viewMode === 'explorer' ? 'default' : 'ghost'}
          size="sm"
          className="shadow-none"
          icon={<LayoutList className="h-4 w-4" />}
          onClick={() => setViewMode('explorer')}
        >
          Explorer
        </Button>
        <Button
          variant={viewMode === 'map' ? 'default' : 'ghost'}
          size="sm"
          className="shadow-none"
          icon={<Map className="h-4 w-4" />}
          onClick={() => setViewMode('map')}
        >
          Map
        </Button>
        <Button
          variant={viewMode === 'review' ? 'default' : 'ghost'}
          size="sm"
          className="shadow-none"
          icon={<Activity className="h-4 w-4" />}
          onClick={() => setViewMode('review')}
        >
          Review
        </Button>
      </div>

      <Button
        variant="primary"
        size="sm"
        icon={<Plus className="h-4 w-4" />}
        onClick={openCreate}
      >
        Add Node
      </Button>
    </>
  );
}
