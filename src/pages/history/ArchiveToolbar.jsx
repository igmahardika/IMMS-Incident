import React from 'react';
import {
  FileSpreadsheet,
  FileUp,
  LayoutList,
  Map as MapIcon,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/index.jsx';

export function ArchiveToolbar({
  userRole,
  viewMode,
  selectedIds,
  allVisibleSelected,
  filteredData,
  setSelectedRowMap,
  deleting,
  handleDeleteSelected,
  setViewMode,
  exporting,
  handleExport,
  importing,
  handleImportClick,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {userRole === 'admin' && viewMode === 'list' && selectedIds.length > 0 ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (allVisibleSelected) {
                setSelectedRowMap({});
              } else {
                setSelectedRowMap(
                  filteredData.reduce((accumulator, item) => {
                    accumulator[String(item.id)] = true;
                    return accumulator;
                  }, {})
                );
              }
            }}
          >
            {allVisibleSelected ? 'Clear Selection' : 'Select Visible'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSelected}
            isLoading={deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedIds.length})
          </Button>
        </>
      ) : null}

      <div className="flex items-center rounded-md border border-border bg-muted/30 p-1">
        <Button
          type="button"
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <LayoutList className="mr-2 h-4 w-4" />
          List
        </Button>
        <Button
          type="button"
          variant={viewMode === 'map' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('map')}
        >
          <MapIcon className="mr-2 h-4 w-4" />
          Map
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        isLoading={exporting}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Export CSV
      </Button>

      {userRole === 'admin' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          isLoading={importing}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      ) : null}
    </div>
  );
}
