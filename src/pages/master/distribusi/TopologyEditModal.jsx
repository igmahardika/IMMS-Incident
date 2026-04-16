import React from 'react';
import { Button, Input, Modal, Select } from '../../../components/ui/index.jsx';
import { COORD_SOURCE_OPTIONS } from './config.js';

export function TopologyEditModal({ modal, form, setField, handleSave, onClose }) {
  return (
    <Modal
      open={!!modal}
      onClose={onClose}
      title={modal === 'create' ? 'Add Topology Node' : 'Edit Topology Node'}
      size="md"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {modal === 'create' ? 'Create Node' : 'Save Changes'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <Select
          label="Topology Type"
          value={form.type}
          onChange={(event) => setField('type', event.target.value)}
        >
          <option value="Fiber Optic">Fiber Optic</option>
          <option value="Wireless">Wireless</option>
        </Select>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={form.type === 'Fiber Optic' ? 'POP' : 'BTS'}
            value={form.level_1}
            onChange={(event) => setField('level_1', event.target.value)}
            placeholder={form.type === 'Fiber Optic' ? 'POP-A' : 'BTS-A'}
            required
          />
          <Input
            label={form.type === 'Fiber Optic' ? 'OSC' : 'Radio'}
            value={form.level_2}
            onChange={(event) => setField('level_2', event.target.value)}
            placeholder={form.type === 'Fiber Optic' ? 'OSC-01' : 'RADIO-01'}
            required
          />
        </div>

        {form.type === 'Fiber Optic' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="ODC"
              value={form.level_3}
              onChange={(event) => setField('level_3', event.target.value)}
              placeholder="Optional"
            />
            <Input
              label="ODP"
              value={form.level_4}
              onChange={(event) => setField('level_4', event.target.value)}
              placeholder="Optional"
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
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

        <div className="grid gap-4 md:grid-cols-2">
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
            placeholder="UPDATE.xlsx:ODP"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </Modal>
  );
}
