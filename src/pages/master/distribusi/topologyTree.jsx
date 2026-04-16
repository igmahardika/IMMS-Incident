import React from 'react';
import { Activity, Cpu, Network, Server } from 'lucide-react';

export function buildTopologyTree(data) {
  const tree = { fo: {}, wireless: {} };

  data.forEach((item) => {
    if (item.type === 'Fiber Optic') {
      const { level_1: pop, level_2: osc, level_3: odc, level_4: odp } = item;

      if (!tree.fo[pop]) {
        tree.fo[pop] = { name: pop, children: {}, type: 'pop', raw: item };
      }

      if (osc) {
        if (!tree.fo[pop].children[osc]) {
          tree.fo[pop].children[osc] = { name: osc, children: {}, type: 'osc', raw: item };
        }

        if (odc) {
          if (!tree.fo[pop].children[osc].children[odc]) {
            tree.fo[pop].children[osc].children[odc] = { name: odc, children: {}, type: 'odc', raw: item };
          }

          if (odp) {
            tree.fo[pop].children[osc].children[odc].children[odp] = {
              name: odp,
              children: null,
              type: 'odp',
              raw: item,
            };
          }
        }
      }
    } else {
      const { level_1: bts, level_2: radio } = item;

      if (!tree.wireless[bts]) {
        tree.wireless[bts] = { name: bts, children: {}, type: 'bts', raw: item };
      }

      if (radio) {
        tree.wireless[bts].children[radio] = {
          name: radio,
          children: null,
          type: 'radio',
          raw: item,
        };
      }
    }
  });

  return tree;
}

export function filterTree(nodes, term) {
  if (!term) return nodes;

  return Object.entries(nodes).reduce((accumulator, [key, node]) => {
    const isMatch = node.name.toLowerCase().includes(term);
    const filteredChildren = node.children ? filterTree(node.children, term) : null;

    if (isMatch || (filteredChildren && Object.keys(filteredChildren).length > 0)) {
      accumulator[key] = {
        ...node,
        children: filteredChildren,
      };
    }

    return accumulator;
  }, {});
}

export function getNodeIcon(type) {
  if (type === 'pop' || type === 'bts') return <Server className="h-4 w-4" />;
  if (type === 'osc' || type === 'radio') return <Activity className="h-4 w-4" />;
  if (type === 'odc') return <Cpu className="h-4 w-4" />;
  return <Network className="h-4 w-4" />;
}

export function getNodeTone(type) {
  if (type === 'pop' || type === 'osc' || type === 'odc' || type === 'odp') {
    return 'bg-primary/10 text-primary border-primary/20';
  }

  return 'bg-warning/10 text-warning border-warning/20';
}
