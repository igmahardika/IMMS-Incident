import React from 'react';
import { Database, Download, LayoutList, Map as MapIcon, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/index.jsx';

export function CustomerHeaderActions({
  viewMode,
  setViewMode,
  downloadTemplate,
  fileInputRef,
  openCreate,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-md border border-border bg-muted/30 p-1">
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          icon={<LayoutList className="h-4 w-4" />}
          onClick={() => setViewMode('list')}
        >
          List
        </Button>
        <Button
          variant={viewMode === 'map' ? 'secondary' : 'ghost'}
          size="sm"
          icon={<MapIcon className="h-4 w-4" />}
          onClick={() => setViewMode('map')}
        >
          Map
        </Button>
        <Button
          variant={viewMode === 'review' ? 'secondary' : 'ghost'}
          size="sm"
          icon={<Database className="h-4 w-4" />}
          onClick={() => setViewMode('review')}
        >
          Sync Review
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        icon={<Download className="h-4 w-4" />}
        onClick={downloadTemplate}
      >
        Template
      </Button>
      <Button
        variant="outline"
        size="sm"
        icon={<Database className="h-4 w-4" />}
        onClick={() => fileInputRef.current?.click()}
      >
        Import CSV
      </Button>
      <Button
        variant="primary"
        size="sm"
        icon={<Plus className="h-4 w-4" />}
        onClick={openCreate}
      >
        Add Customer
      </Button>
    </div>
  );
}
