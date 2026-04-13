export const incidentService = {
  getCombinedOptions: (ncal, distribusi) => {
    if (!distribusi) return [];
    
    if (ncal === 'ORANGE') {
      const odps = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_4))].filter(Boolean);
      const radios = [...new Set(distribusi.filter(d => d.type === 'Wireless').map(d => d.level_2))].filter(Boolean);
      return [
        ...odps.map(o => ({ label: o, searchKey: `ODP ${o}`, value: o })),
        ...radios.map(r => ({ label: r, searchKey: `RADIO ${r}`, value: r }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    if (ncal === 'RED') {
      const odcs = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_3))].filter(Boolean);
      const bts = [...new Set(distribusi.filter(d => d.type === 'Wireless').map(d => d.level_1))].filter(Boolean);
      return [
        ...odcs.map(o => ({ label: o, searchKey: `ODC ${o}`, value: o })),
        ...bts.map(b => ({ label: b, searchKey: `BTS ${b}`, value: b }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    if (ncal === 'BLACK') {
      const pops = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_1))].filter(Boolean);
      const oscs = [...new Set(distribusi.filter(d => d.type === 'Fiber Optic').map(d => d.level_2))].filter(Boolean);
      return [
        ...pops.map(p => ({ label: p, searchKey: `POP ${p}`, value: p })),
        ...oscs.map(o => ({ label: o, searchKey: `OSC ${o}`, value: o }))
      ].sort((a,b) => a.label.localeCompare(b.label));
    }
    return [];
  }
};
