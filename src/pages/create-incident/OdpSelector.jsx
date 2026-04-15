import React from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Input } from '../../components/ui/index.jsx';
import { DropdownSurface } from './DropdownSurface.jsx';

export function OdpSelector({
  ncal,
  value,
  manualValue,
  onChange,
  onManualChange,
  showDropdown,
  setShowDropdown,
  search,
  onSearchChange,
  filteredOptions,
}) {
  return (
    <div className="custom-dropdown-container relative space-y-2">
      <label className="text-sm font-medium text-foreground">
        {ncal === 'YELLOW' ? 'Distribution Node (ODP/BTS)' : 'Node Sequence'}
      </label>

      <button
        type="button"
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent"
        onClick={() => setShowDropdown((previous) => !previous)}
      >
        <span className={cn(!value && 'text-muted-foreground')}>
          {value && value !== 'MANUAL_INPUT'
            ? value
            : value === 'MANUAL_INPUT'
              ? 'Manual entry selected'
              : 'Select topology node'}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {showDropdown ? (
        <DropdownSurface className="max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-popover pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Filter nodes..."
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  onChange(option);
                  setShowDropdown(false);
                }}
              >
                <span>{option}</span>
              </button>
            ))}

            <button
              type="button"
              className="mt-2 flex w-full items-center justify-between rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              onClick={() => {
                onChange('MANUAL_INPUT');
                setShowDropdown(false);
              }}
            >
              <span>Manual override</span>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </DropdownSurface>
      ) : null}

      {value === 'MANUAL_INPUT' ? (
        <Input
          id="manual-distribusi"
          label="Manual Node Value"
          value={manualValue}
          onChange={(event) => onManualChange(event.target.value.toUpperCase())}
          placeholder="Enter custom topology node"
          className="font-mono"
        />
      ) : null}
    </div>
  );
}
