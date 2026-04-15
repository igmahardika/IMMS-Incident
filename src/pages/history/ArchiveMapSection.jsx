import React, { Suspense } from 'react';
import { SectionCard, TableSkeleton } from '../../components/ui/index.jsx';

export function ArchiveMapSection(props) {
  const {
    customerMapComponent,
    customers,
    refreshCustomers,
    startDate,
    endDate,
  } = props;

  const RenderMap = customerMapComponent;

  return (
    <SectionCard
      title="Spatial Archive View"
      subtitle="Visualize archived incident activity by customer location within the selected date range."
      padding={false}
      className="min-h-[640px] flex-1"
    >
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <RenderMap
          customers={customers}
          onRefresh={refreshCustomers}
          initialMode="trouble"
          showTroubleMode
          hideCustomerPins
          startDate={startDate}
          endDate={endDate}
        />
      </Suspense>
    </SectionCard>
  );
}
