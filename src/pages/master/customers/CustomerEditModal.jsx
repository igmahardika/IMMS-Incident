import React from 'react';
import { Button, Input, Modal, Select, Textarea } from '../../../components/ui/index.jsx';
import { COORD_SOURCE_OPTIONS } from './config.js';

export function CustomerEditModal({
  modal,
  form,
  setField,
  handleSave,
  onClose,
  serviceTypeOptions,
  gradeOptions,
  supportOptions,
}) {
  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      title={modal === 'create' ? 'Add Customer Record' : 'Edit Customer Record'}
      subtitle={modal === 'create'
        ? 'Create a new customer endpoint with topology and coordinate context.'
        : 'Maintain customer identity, topology references, and survey evidence from a single workspace.'}
      size="2xl"
      bodyClassName="pt-6"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {modal === 'create' ? 'Create Record' : 'Save Changes'}
          </Button>
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Identity</h3>
              <p className="text-xs text-muted-foreground">Primary registry details used throughout incidents, maps, and history views.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Customer ID"
                value={form.customer_id}
                onChange={(event) => setField('customer_id', event.target.value)}
                placeholder="CUST-0001"
                required
              />
              <Input
                label="Service ID"
                value={form.service_id}
                onChange={(event) => setField('service_id', event.target.value)}
                placeholder="SID-0001"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Company Name"
                value={form.company_name}
                onChange={(event) => setField('company_name', event.target.value)}
                placeholder="PT Global Technology"
                required
              />
              <Input
                label="Brand / Site"
                value={form.brand_site}
                onChange={(event) => setField('brand_site', event.target.value)}
                placeholder="HQ Semarang"
                required
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Location</h3>
              <p className="text-xs text-muted-foreground">Editable operational address and regional context for map and incident routing.</p>
            </div>

            <Textarea
              label="Address"
              value={form.address}
              onChange={(event) => setField('address', event.target.value)}
              placeholder="Province, city, district, and street details"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="City"
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
                placeholder="Semarang"
              />
              <Input
                label="Province"
                value={form.province}
                onChange={(event) => setField('province', event.target.value)}
                placeholder="Jawa Tengah"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Service Profile</h3>
              <p className="text-xs text-muted-foreground">Customer tiering and monitoring linkage used for support priority.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Service Type"
                value={form.service_type}
                onChange={(event) => setField('service_type', event.target.value)}
              >
                {serviceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Select
                label="Grade"
                value={form.grade}
                onChange={(event) => setField('grade', event.target.value)}
              >
                {gradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Select
                label="Support Level"
                value={form.support_level}
                onChange={(event) => setField('support_level', event.target.value)}
              >
                {supportOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Monitoring Link"
              type="url"
              value={form.link_coverage}
              onChange={(event) => setField('link_coverage', event.target.value)}
              placeholder="https://nms.internal/customer-id"
            />
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Topology References</h3>
              <p className="text-xs text-muted-foreground">
                Canonical OSC, ODC, and ODP references used to connect this customer to the active topology tree.
              </p>
            </div>

            <div className="grid gap-4">
              <Input
                label="OSC Reference"
                value={form.osc_reference}
                onChange={(event) => setField('osc_reference', event.target.value.toUpperCase())}
                placeholder="OSC KIC"
              />
              <Input
                label="ODC Reference"
                value={form.odc_reference}
                onChange={(event) => setField('odc_reference', event.target.value.toUpperCase())}
                placeholder="ODC KIC"
              />
              <Input
                label="ODP Reference"
                value={form.odp_reference}
                onChange={(event) => setField('odp_reference', event.target.value.toUpperCase())}
                placeholder="ODP KIC-B27"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Live Coordinates</h3>
              <p className="text-xs text-muted-foreground">These are the coordinates actively used by maps and operational views.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(event) => setField('latitude', event.target.value)}
                placeholder="-6.123456"
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(event) => setField('longitude', event.target.value)}
                placeholder="110.123456"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Select
                label="Coordinate Source"
                value={form.coord_source || ''}
                onChange={(event) => setField('coord_source', event.target.value)}
              >
                {COORD_SOURCE_OPTIONS.map((option) => (
                  <option key={option || 'blank'} value={option}>
                    {option || 'Unspecified'}
                  </option>
                ))}
              </Select>
              <Input
                label="Survey Source"
                value={form.survey_source}
                onChange={(event) => setField('survey_source', event.target.value)}
                placeholder="UPDATE.xlsx:CUSTOMER"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">Survey Snapshot</h3>
              <p className="text-xs text-muted-foreground">
                Preserve imported workbook evidence here while keeping the live coordinates above editable and authoritative.
              </p>
            </div>

            <Input
              label="Survey Name Raw"
              value={form.survey_name_raw}
              onChange={(event) => setField('survey_name_raw', event.target.value)}
              placeholder="Raw NAME from external workbook"
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Input
                label="Survey Latitude"
                type="number"
                step="any"
                value={form.survey_latitude}
                onChange={(event) => setField('survey_latitude', event.target.value)}
                placeholder="-6.123456"
              />
              <Input
                label="Survey Longitude"
                type="number"
                step="any"
                value={form.survey_longitude}
                onChange={(event) => setField('survey_longitude', event.target.value)}
                placeholder="110.123456"
              />
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
