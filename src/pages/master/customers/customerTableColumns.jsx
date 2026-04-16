import React from 'react';
import { Edit2, ExternalLink, MapPin, Trash2 } from 'lucide-react';
import { Button, GradeBadge, StatusBadge } from '../../../components/ui/index.jsx';

export function buildCustomerColumns({ onEdit, onDelete }) {
  return [
    {
      accessorKey: 'identity',
      header: 'Customer',
      size: 320,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {row.original.company_name}
            </p>
            {row.original.brand_site ? (
              <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                {row.original.brand_site}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Customer ID: {row.original.customer_id}</span>
            <span>Service ID: {row.original.service_id}</span>
            {row.original.odp_reference ? <span>ODP: {row.original.odp_reference}</span> : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      size: 240,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {[row.original.city, row.original.province].filter(Boolean).join(', ') || row.original.brand_site || 'Location pending'}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {row.original.address || 'No address registered'}
            </p>
            {(row.original.osc_reference || row.original.odc_reference || row.original.odp_reference) ? (
              <p className="text-[11px] text-muted-foreground">
                {[row.original.osc_reference, row.original.odc_reference, row.original.odp_reference].filter(Boolean).join(' / ')}
              </p>
            ) : null}
            {row.original.coord_source ? (
              <p className="text-[11px] text-muted-foreground">
                Source: {row.original.coord_source}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'service_type',
      header: 'Service',
      size: 160,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.service_type}
        </span>
      ),
    },
    {
      accessorKey: 'grade',
      header: 'Grade',
      size: 96,
      meta: { className: 'text-center' },
      cell: ({ row }) => <GradeBadge grade={row.original.grade} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      meta: { className: 'text-center' },
      cell: ({ row }) => <StatusBadge active={row.original.is_active} />,
    },
    {
      id: 'actions',
      header: '',
      size: 132,
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {row.original.link_coverage ? (
            <Button
              variant="ghost"
              size="icon"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(row.original.link_coverage, '_blank', 'noopener,noreferrer')}
            />
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={() => onEdit(row.original)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => onDelete(row.original)}
          />
        </div>
      ),
    },
  ];
}
