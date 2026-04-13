import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  GitBranch,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  TableSkeleton,
} from '../../components/ui/index.jsx';

const EMPTY_FORM = {
  klasifikasi: '',
  sub_klasifikasi: '',
};

export default function MasterClassificationPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getClassifications();
      setClasses(response);
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

  const openEdit = (item) => {
    setForm({
      klasifikasi: item.klasifikasi,
      sub_klasifikasi: item.sub_klasifikasi || '',
    });
    setModal(item);
  };

  const handleSave = async () => {
    try {
      if (modal === 'create') {
        await api.createClassification(form);
        addToast('Classification created', 'success');
      } else {
        await api.updateClassification(modal.id, form);
        addToast('Classification updated', 'success');
      }

      setModal(null);
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete classification "${item.sub_klasifikasi || item.klasifikasi}"?`)) {
      return;
    }

    try {
      await api.deleteClassification(item.id);
      addToast('Classification deleted', 'warning');
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const grouped = useMemo(() => (
    classes.reduce((accumulator, item) => {
      if (!accumulator[item.klasifikasi]) accumulator[item.klasifikasi] = [];
      accumulator[item.klasifikasi].push(item);
      return accumulator;
    }, {})
  ), [classes]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <PageHeader
        title="Classifications"
        subtitle="Maintain incident classifications so forms, analytics, and closure workflows stay consistent."
        action={(
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add Classification
          </Button>
        )}
      />

      <div className="flex-1 overflow-y-auto pb-6">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : Object.keys(grouped).length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(grouped).map(([classification, items]) => (
              <SectionCard
                key={classification}
                title={classification}
                subtitle={`${items.length} entries in this group`}
                padding={false}
                headerAction={(
                  <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" />
                    Group
                  </div>
                )}
              >
                <div className="divide-y">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.sub_klasifikasi || 'General classification'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>ID: {String(item.id).padStart(3, '0')}</span>
                          <span>Parent: {item.klasifikasi}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          icon={<Edit2 className="h-4 w-4" />}
                          onClick={() => openEdit(item)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDelete(item)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        ) : (
          <SectionCard>
            <EmptyState
              icon={<GitBranch className="h-6 w-6" />}
              title="No classifications found"
              desc="Add a new classification group to start building the incident taxonomy."
              action={(
                <Button
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={openCreate}
                >
                  Add Classification
                </Button>
              )}
            />
          </SectionCard>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Classification' : 'Edit Classification'}
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {modal === 'create' ? 'Create Classification' : 'Save Changes'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Input
            label="Classification"
            value={form.klasifikasi}
            onChange={(event) => setField('klasifikasi', event.target.value)}
            placeholder="Infrastructure"
            required
          />
          <Input
            label="Sub-classification"
            value={form.sub_klasifikasi}
            onChange={(event) => setField('sub_klasifikasi', event.target.value)}
            placeholder="Core switch failure"
          />
        </div>
      </Modal>
    </div>
  );
}
