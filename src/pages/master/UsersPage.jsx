import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  Fingerprint,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Button,
  Input,
  Modal,
  PageHeader,
  RoleBadge,
  SectionCard,
  Select,
  StatusBadge,
  TableSkeleton,
} from '../../components/ui/index.jsx';
import { cn } from '../../lib/utils.js';
import { DataTable } from '../../components/tables/DataTable.jsx';

const ROLES = ['admin', 'manager', 'noc', 'technician'];
const EMPTY_FORM = {
  employee_id: '',
  username: '',
  password: '',
  name: '',
  role: 'noc',
  email: '',
};

function UserAvatar({ name, role }) {
  const initials = name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '??';
  const roleColors = {
    admin: 'bg-primary/10 text-primary border-primary/20',
    noc: 'bg-info/10 text-info border-info/20',
    manager: 'bg-warning/10 text-warning border-warning/20',
    technician: 'bg-secondary/10 text-secondary border-secondary/20',
  };

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold',
        roleColors[role] || 'border-border bg-muted text-muted-foreground'
      )}
    >
      {initials}
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { addToast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getUsers();
      setUsers(response);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal('create');
  };

  const openEdit = (account) => {
    setForm({
      ...EMPTY_FORM,
      ...account,
      password: '',
    });
    setModal(account);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createUser(form);
        addToast('Personnel account created', 'success');
      } else {
        await api.updateUser(modal.id, form);
        addToast('Personnel account updated', 'success');
      }

      setModal(null);
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = useCallback(async (account) => {
    if (!window.confirm(`Deactivate account for ${account.name}?`)) {
      return;
    }

    try {
      await api.deleteUser(account.id);
      addToast('Personnel account deactivated', 'warning');
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }, [addToast, load]);

  const handleToggle = useCallback(async (account) => {
    try {
      await api.updateUser(account.id, { is_active: !account.is_active });
      addToast(`Account ${account.is_active ? 'disabled' : 'enabled'}`, 'info');
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  }, [addToast, load]);

  const columns = useMemo(() => [
    {
      accessorKey: 'identity',
      header: 'Name',
      size: 280,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.original.name} role={row.original.role} />
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.name}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>@{row.original.username}</span>
              <span>{row.original.employee_id || 'No employee ID'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      size: 120,
      meta: { className: 'text-center' },
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'directory',
      header: 'Contact',
      size: 220,
      meta: { flexible: true },
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{row.original.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Fingerprint className="h-3.5 w-3.5" />
            Employee ID: {row.original.employee_id || 'Not assigned'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 96,
      meta: { className: 'text-center' },
      cell: ({ row }) => <StatusBadge active={row.original.is_active} />,
    },
    ...(isAdmin ? [{
      accessorKey: 'is_active',
      header: 'Access',
      size: 90,
      meta: { className: 'text-center' },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => handleToggle(row.original)}
            className={cn(
              'relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              row.original.is_active ? 'bg-success' : 'bg-muted-foreground/30'
            )}
          >
            <span
              className={cn(
                'block h-4 w-4 rounded-full bg-background shadow transition-transform',
                row.original.is_active ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      ),
    }] : []),
    ...(isAdmin ? [{
      id: 'actions',
      header: '',
      size: 96,
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={() => openEdit(row.original)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => handleDelete(row.original)}
          />
        </div>
      ),
    }] : []),
  ], [handleDelete, handleToggle, isAdmin]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Personnel & Accounts"
        subtitle={isAdmin
          ? 'Manage personnel records and their system access from one place.'
          : 'Review active personnel and their assigned application roles.'}
        action={isAdmin ? (
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add Account
          </Button>
        ) : null}
      />

      <SectionCard
        title="Directory"
        subtitle={isAdmin
          ? 'This table is the single source for personnel identity and account access.'
          : 'Manager access is read-only. Contact an admin to create, deactivate, or change credentials.'}
        padding={false}
        className="flex-1 min-h-0"
      >
        {loading ? (
          <TableSkeleton rows={12} />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            globalFilter=""
            setGlobalFilter={() => {}}
            pageSize={50}
            getRowClassName={(row) => (!row.is_active ? 'opacity-60' : '')}
          />
        )}
      </SectionCard>

      {isAdmin ? (
        <Modal
          open={!!modal}
          onClose={() => setModal(null)}
          title={modal === 'create' ? 'Add Personnel Account' : 'Edit Personnel Account'}
          size="2xl"
          footer={(
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {modal === 'create' ? 'Create Account' : 'Save Changes'}
              </Button>
            </>
          )}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="Operational full name"
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                placeholder="personnel@company.com"
              />
              <Input
                label="Employee ID"
                value={form.employee_id}
                onChange={(event) => setField('employee_id', event.target.value)}
                placeholder="1001"
              />
              <Select
                label="Role"
                value={form.role}
                onChange={(event) => setField('role', event.target.value)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Username"
                value={form.username}
                onChange={(event) => setField('username', event.target.value)}
                placeholder="username"
                disabled={modal !== 'create'}
                description={modal === 'create' ? 'Used for login authentication.' : 'Username cannot be changed after account creation.'}
              />
              <Input
                label={modal === 'create' ? 'Password' : 'Reset Password'}
                type="password"
                value={form.password}
                onChange={(event) => setField('password', event.target.value)}
                placeholder={modal === 'create' ? 'Minimum operational password' : 'Leave blank to keep current password'}
              />
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
