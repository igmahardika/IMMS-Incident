import React, { useEffect, useState } from 'react';

import { Button, Modal, Textarea } from '../../components/ui/index.jsx';

export default function PauseModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pause Incident"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Pause
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
        <Textarea
          id="pause-reason"
          label="Reason for Pause"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Describe why the incident handling must be paused."
          description="This note will be written to the incident timeline and used as the official pause reason."
        />

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          Pausing an incident stops the active handling timer until the team resumes work.
        </div>
      </div>
    </Modal>
  );
}

