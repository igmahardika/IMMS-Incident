import React from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Input } from '../../components/ui/index.jsx';
import { DropdownSurface } from './DropdownSurface.jsx';

export function DistributionNodeSelector({
  selectedItems,
  toggleItem,
  showDropdown,
  setShowDropdown,
  search,
  onSearchChange,
  filteredOptions,
}) {
  return (
    <div className="custom-dropdown-container relative space-y-2">
      <label className="text-sm font-medium text-foreground">
        Distribution Nodes
      </label>

      <button
        type="button"
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-accent',
          showDropdown && 'ring-1 ring-ring'
        )}
        onClick={() => setShowDropdown((previous) => !previous)}
      >
        {selectedItems.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Select one or more affected topology nodes
          </span>
        ) : (
          selectedItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
            >
              {item}
              <button
                type="button"
                className="rounded-sm p-0.5 transition-colors hover:bg-primary/10"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleItem(item);
                }}
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}

        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {showDropdown ? (
        <DropdownSurface className="max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-popover pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search topology nodes"
                wrapperClassName="gap-0"
                className="h-9 pl-9 pr-3"
                placeholder="Search topology nodes..."
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors hover:bg-accent"
                onClick={() => toggleItem(option.value)}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {option.value.split(':')[0]}
                  </p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No topology node matched your search.
              </div>
            ) : null}
          </div>
        </DropdownSurface>
      ) : null}
    </div>
  );
}
