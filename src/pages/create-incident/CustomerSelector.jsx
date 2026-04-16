import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '../../components/ui/index.jsx';
import { DropdownSurface } from './DropdownSurface.jsx';

export function CustomerSelector({
  ncal,
  search,
  onSearchChange,
  showDropdown,
  setShowDropdown,
  filteredCustomers,
  onCustomerSelect,
}) {
  return (
    <div className="custom-dropdown-container relative space-y-2">
      <label
        htmlFor="customer-search"
        className="text-sm font-medium text-foreground"
      >
        {ncal === 'BLUE' ? 'Installation Site' : 'Target Entity'}
      </label>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="customer-search"
          aria-label="Search customers"
          wrapperClassName="gap-0"
          className="h-9 pl-9 pr-10"
          placeholder="Search customer or site..."
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {showDropdown ? (
        <DropdownSurface className="max-h-80 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No customer matched your search.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="flex w-full flex-col rounded-md px-3 py-3 text-left transition-colors hover:bg-accent"
                  onClick={() => onCustomerSelect(customer)}
                >
                  <span className="text-sm font-medium text-foreground">
                    {customer.brand_site}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {customer.company_name} • Grade {customer.grade || '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DropdownSurface>
      ) : null}
    </div>
  );
}
