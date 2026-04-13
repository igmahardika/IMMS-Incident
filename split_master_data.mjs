import fs from 'fs';

const file = fs.readFileSync('src/pages/MasterDataPages.jsx', 'utf8');

const imports = `import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { ROLE_COLORS, GRADE_COLORS } from '../../utils/constants.js';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal, TableSkeleton, EmptyState, RoleBadge, StatusBadge, GradeBadge, AccentBadge, SectionCard, Button, Input, Spinner } from '../../components/ui/index.jsx';
import { Plus, Edit2, Trash2, Database, Download, Network, ChevronRight, ChevronDown, Layout, Map as MapIcon, LayoutList, MapPinOff, Search, Tag, Router, Cable, RadioReceiver } from 'lucide-react';
import DistributionMap from '../../components/ui/DistributionMap.jsx';
import CustomerMap from '../../components/ui/CustomerMap.jsx';
import GeoSummary from '../../components/ui/GeoSummary.jsx';
import { cn } from '../../lib/utils.js';
import { DataTable } from '../../components/tables/DataTable.jsx';

// Global icon stroke standard
const ICON_ST = 2;
const ICON_HD = 2.5;

function TableCard({ children, title, subtitle, footer, headerAction }) {
  return (
    <SectionCard title={title} subtitle={subtitle} footer={footer} headerAction={headerAction} padding={false} className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
        {children}
      </div>
    </SectionCard>
  );
}
`;

function extractComponent(file, compName) {
  const match = file.split(new RegExp(`export function ${compName}\\(\\)`));
  if(match.length < 2) return null;
  const content = `export function ${compName}()` + match[1].split('// ───')[0].split('export function')[0];
  return content.trim();
}

const comps = {
  'CustomersPage.jsx': 'MasterCustomerPage',
  'ClassificationsPage.jsx': 'MasterClassificationPage',
  'UsersPage.jsx': 'UserManagementPage',
  'TechnicalSupportPage.jsx': 'MasterTechnicalSupportPage',
  'DistribusiPage.jsx': 'MasterDistribusiPage',
  'ActionsPage.jsx': 'MasterActionPage'
};

if (!fs.existsSync('src/pages/master')) {
    fs.mkdirSync('src/pages/master');
}

for (const [filename, compName] of Object.entries(comps)) {
  const content = extractComponent(file, compName);
  if (content) {
    fs.writeFileSync(`src/pages/master/${filename}`, imports + '\n' + content + '\n');
    console.log(`Wrote ${filename}`);
  } else {
    console.log(`Failed to find ${compName}`);
  }
}
