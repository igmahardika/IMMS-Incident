import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../../utils/api.js';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext.jsx';
import { 
  Modal, 
  TableSkeleton, 
  SectionCard, 
  Button, 
  Input, 
  Select, 
  GradeBadge, 
  StatusBadge, 
  AccentBadge 
} from '../../components/ui/index.jsx';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  LayoutList, 
  Map as MapIcon, 
  Download, 
  Database, 
  MapPin, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Activity,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { DataTable } from '../../components/tables/DataTable.jsx';
import CustomerMap from '../../components/ui/CustomerMap.jsx';
import GeoSummary from '../../components/ui/GeoSummary.jsx';

/**
 * Customer Intelligence - High-Density Infrastructure Registry
 * Manages customer endpoints with dual-view spatial and tabular protocols.
 */

export default function MasterCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [modal, setModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ 
    customer_id: '', service_id: '', company_name: '', brand_site: '', 
    address: '', service_type: 'Internet Dedicated', grade: 'Bronze', 
    support_level: 'L1', link_coverage: '', latitude: '', longitude: '' 
  });
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers();
      setCustomers(res);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => {
    setForm({ 
      customer_id: '', service_id: '', company_name: '', brand_site: '', 
      address: '', service_type: 'Internet Dedicated', grade: 'Bronze', 
      support_level: 'L1', link_coverage: '', latitude: '', longitude: '' 
    });
    setModal('create');
  };

  const openEdit = (c) => {
    setForm({ ...c });
    setModal(c);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createCustomer(form);
        addToast('Intelligence node registered', 'success');
      } else {
        await api.updateCustomer(modal.id, form);
        addToast('Intel node refined', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleDelete = useCallback(async (item) => {
    if (!confirm(`Purge intelligence node for ${item.company_name}?`)) return;
    try {
      await api.deleteCustomer(item.id);
      addToast('Node purged from registry', 'warning');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  }, [addToast, load]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const parsed = rows.map(r => ({
        customer_id: r['Customer ID']?.toString() || '',
        service_id: r['Service ID']?.toString() || '',
        company_name: r['Company Name']?.toString() || '',
        brand_site: r['Brand / Site']?.toString() || '',
        address: r['Address']?.toString() || '',
        service_type: r['Service']?.toString() || '',
        grade: r['Grade']?.toString() || '',
        support_level: r['Support Level']?.toString() || '',
        link_coverage: r['Link Coverage']?.toString() || '',
      })).filter(c => c.customer_id);
      
      const res = await api.uploadCustomers(parsed);
      addToast(`Synched ${res.count} intelligence nodes`, 'success');
      load();
    } catch(err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'Customer ID': 'CUST-01', 'Service ID': 'SID-01', 'Company Name': 'GLOBAL TECH', 'Brand / Site': 'HQ', 'Address': 'STREET 01', 'Service': 'Internet Dedicated', 'Grade': 'Gold', 'Support Level': 'L2' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'IMMS_Intel_Template.xlsx');
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const priority = customers.filter(c => ['VIP', 'Gold'].includes(c.grade)).length;
    const spatial = customers.filter(c => c.latitude && c.longitude).length;
    return { total, priority, spatial };
  }, [customers]);

  const columns = useMemo(() => [
    {
      accessorKey: "identity",
      header: "Endpoint Identity",
      size: 320,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] font-black text-foreground/90 tracking-tight truncate leading-tight uppercase">
            {row.original.company_name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold text-primary/60 uppercase tracking-widest leading-none">
              CID: {row.original.customer_id}
            </span>
            <div className="w-[1px] h-2 bg-foreground/10" />
            <span className="text-[9px] font-mono font-bold text-foreground/30 uppercase tracking-widest leading-none">
              SID: {row.original.service_id}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "site",
      header: "Spatial Assignment",
      size: 200,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <MapPin size={12} className={cn(row.original.latitude ? "text-primary/40" : "text-foreground/10")} />
           <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] font-black uppercase text-foreground/50 truncate">
                {row.original.brand_site || 'UNSET_NODE'}
              </span>
              <span className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest leading-none truncate">
                {row.original.address || 'NO_ADDRESS_REGISTERED'}
              </span>
           </div>
        </div>
      ),
    },
    {
      accessorKey: "service_type",
      header: "Segment",
      size: 140,
      cell: ({ row }) => (
        <span className="text-[10px] font-black uppercase text-foreground/40 tracking-[0.1em] whitespace-nowrap">
          {row.original.service_type}
        </span>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      size: 90,
      meta: { className: 'text-center' },
      cell: ({ row }) => <GradeBadge grade={row.original.grade} />,
    },
    {
      accessorKey: "status",
      header: "State",
      size: 90,
      meta: { className: 'text-center' },
      cell: ({ row }) => <StatusBadge active={row.original.is_active} />,
    },
    {
      id: "actions",
      header: "",
      size: 80,
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity pr-2">
          {row.original.link_coverage && (
            <a href={row.original.link_coverage} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-foreground/30 hover:text-info hover:bg-info/5 transition-all">
              <ExternalLink size={13} strokeWidth={2.5} />
            </a>
          )}
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg text-foreground/30 hover:text-primary hover:bg-primary/5 transition-all">
            <Edit2 size={13} strokeWidth={2.5} />
          </button>
          <button onClick={() => handleDelete(row.original)} className="p-1.5 rounded-lg text-foreground/30 hover:text-error hover:bg-error/5 transition-all">
            <Trash2 size={13} strokeWidth={2.5} />
          </button>
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden font-sans">
      {/* Intelligence Header */}
      <div className="flex flex-col gap-6 shrink-0 mb-6">
        <div className="flex items-end justify-between gap-4 flex-wrap px-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black tracking-tight text-foreground uppercase">Customer Intelligence</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 leading-relaxed italic">
              Registry of <span className="text-primary font-mono">{customers.length}</span> active infrastructure endpoints
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/[0.06] rounded-xl px-3 h-10 w-[240px] focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-background transition-all">
                <Search size={14} className="text-foreground/20" />
                <input 
                  type="text" 
                  className="bg-transparent border-none focus:ring-0 text-[11px] font-bold w-full placeholder:text-foreground/20 uppercase tracking-widest" 
                  placeholder="Scan Intel Registry..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
             
             <div className="flex items-center gap-1 bg-foreground/[0.03] border border-foreground/[0.06] p-1 rounded-xl h-10">
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                    viewMode === 'list' ? "bg-background shadow-sm text-primary ring-1 ring-foreground/[0.05]" : "text-foreground/20 hover:text-foreground/40"
                  )}
                >
                  <LayoutList size={14} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                    viewMode === 'map' ? "bg-background shadow-sm text-primary ring-1 ring-foreground/[0.05]" : "text-foreground/20 hover:text-foreground/40"
                  )}
                >
                  <MapIcon size={14} strokeWidth={2.5} />
                </button>
             </div>

             <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="xs" onClick={downloadTemplate} className="font-black text-[9px] tracking-[0.2em] px-3 h-10 opacity-60 hover:opacity-100 flex items-center gap-2">
                   <Download size={13} /> TMPL
                </Button>
                <label className="cursor-pointer">
                   <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                   <Button variant="ghost" size="xs" className="font-black text-[9px] tracking-[0.2em] pointer-events-none px-3 h-10 opacity-60 hover:opacity-100 flex items-center gap-2">
                      <Database size={13} /> SYNC
                   </Button>
                </label>
                <Button variant="primary" icon={<Plus size={14} strokeWidth={2.5} />} onClick={openCreate} className="h-10 px-6">
                   Initialize node
                </Button>
             </div>
          </div>
        </div>

        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
           {[
             { label: 'Intelligence Nodes', val: stats.total, icon: Globe, color: 'text-primary' },
             { label: 'Priority Hubs', val: stats.priority, icon: ShieldCheck, color: 'text-warning' },
             { label: 'Spatial Registry', val: stats.spatial, icon: MapPin, color: 'text-info' },
             { label: 'Network Coverage', val: '100%', icon: Activity, color: 'text-success font-mono' },
           ].map((stat, i) => (
             <div key={i} className="bg-foreground/[0.02] border border-foreground/[0.04] rounded-2xl p-3 flex flex-col gap-2 group hover:bg-foreground/[0.04] transition-all">
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-black uppercase tracking-[0.25em] text-foreground/30 font-mono leading-none">{stat.label}</span>
                   <stat.icon size={12} className={cn("opacity-20 group-hover:opacity-100 transition-opacity", stat.color)} />
                </div>
                <span className="text-lg font-black tracking-tighter text-foreground/80 leading-none tabular-nums uppercase">{stat.val}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Main Intel Viewer */}
      <SectionCard padding={false} className={cn(
        "flex-1 min-h-0 border-foreground/[0.08] shadow-sm mb-4 relative overflow-hidden",
        viewMode === 'map' && "bg-foreground/[0.01]"
      )}>

        {loading ? <TableSkeleton rows={15} /> : viewMode === 'map' ? (
          <div className="flex-1 min-h-0 flex overflow-hidden group/mapview animate-in fade-in duration-700">
             {/* Map Area */}
             <div className="flex-1 min-h-0 relative h-full">
                <CustomerMap customers={customers} onRefresh={load} />
             </div>
             {/* Analytics Sidebar */}
             <GeoSummary customers={customers} />
          </div>
        ) : (
          <DataTable 
            data={customers} 
            columns={columns} 
            globalFilter={searchQuery} 
            setGlobalFilter={setSearchQuery}
            pageSize={50}
          />
        )}
      </SectionCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Initialize Node Intelligence' : 'Refine Node Metadata'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Abort</Button><Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20 leading-none">Commit Protocol Change</Button></>}
      >
        <div className="flex flex-col gap-8 py-2">
          {/* Identity & Topology Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-primary rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Core Identity & Topology</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Customer Unique CID *" value={form.customer_id} onChange={e => setF('customer_id', e.target.value)} required placeholder="IDENT-000-X" />
              <Input label="Service Topology SID *" value={form.service_id} onChange={e => setF('service_id', e.target.value)} required placeholder="SRV-TYPE-000" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Entity Legal Name *" value={form.company_name} onChange={e => setF('company_name', e.target.value)} required placeholder="PT. GLOBAL TECHNOLOGY" />
              <Input label="Install Site Label *" value={form.brand_site} onChange={e => setF('brand_site', e.target.value)} required placeholder="HQ BRANCH - LEVEL 1" />
            </div>
          </div>

          <div className="h-[1px] bg-foreground/5" />

          {/* Service Specs Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-warning rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Service Configuration</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1">Segment Protocol</label>
                <Select className="h-10 border-foreground/10" value={form.service_type} onChange={e => setF('service_type', e.target.value)}>
                  {['Internet Dedicated', 'Broadband', 'VPN IP', 'MPLS', 'Astinet', 'VSAT', 'Clear Channel'].map(o => <option key={o}>{o}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1">Criticality Grade</label>
                <Select className="h-10 border-foreground/10" value={form.grade} onChange={e => setF('grade', e.target.value)}>
                  {['VIP', 'Gold', 'Silver', 'Bronze'].map(o => <option key={o}>{o}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1">Support Tier</label>
                <Select className="h-10 border-foreground/10" value={form.support_level} onChange={e => setF('support_level', e.target.value)}>
                  {['L1', 'L2', 'L3'].map(o => <option key={o}>{o}</option>)}
                </Select>
              </div>
            </div>
            <Input label="Network Monitoring Link (NMS URL)" type="url" value={form.link_coverage} onChange={e => setF('link_coverage', e.target.value)} placeholder="https://nms.internal/customer-id" />
          </div>

          <div className="h-[1px] bg-foreground/5" />

          {/* Spatial Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1 h-3 bg-info rounded-full" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Geospatial Awareness</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/40 ml-1">Physical Address Registry</label>
              <textarea 
                className="flex w-full rounded-xl border border-foreground/10 bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm focus:ring-1 focus:ring-primary/20 min-h-[80px] transition-all placeholder:text-foreground/10 uppercase tracking-tight" 
                rows={2} value={form.address} onChange={e => setF('address', e.target.value)} 
                placeholder="PROVINCE, CITY, STREET..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Spatial Latitude" type="number" step="any" placeholder="-6.123456" value={form.latitude} onChange={e => setF('latitude', e.target.value)} />
              <Input label="Spatial Longitude" type="number" step="any" placeholder="110.123456" value={form.longitude} onChange={e => setF('longitude', e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
