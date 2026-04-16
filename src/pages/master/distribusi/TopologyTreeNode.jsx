import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils.js';
import { getNodeIcon, getNodeTone } from './topologyTree.jsx';

export function TopologyTreeNode({ node, level = 0, onSelect, selectedId, forceOpen = false }) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isSelected = selectedId === node.raw?.id;
  const icon = getNodeIcon(node.type);

  useEffect(() => {
    if (forceOpen && hasChildren) {
      setIsOpen(true);
    }
  }, [forceOpen, hasChildren]);

  const handleClick = () => {
    onSelect(node.raw);
    if (hasChildren) {
      setIsOpen((previous) => !previous);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
          isSelected ? 'border-primary/20 bg-primary/5' : 'border-transparent hover:bg-muted/30'
        )}
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', getNodeTone(node.type))}>
          {icon}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={cn('truncate text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
            {node.name}
          </p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {node.type}
          </p>
        </div>

        {hasChildren ? (
          isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen && hasChildren ? (
          <div className="ml-5 border-l border-border pl-4">
            <div className="space-y-2">
              {Object.values(node.children).map((child) => (
                <TopologyTreeNode
                  key={`${child.type}-${child.name}`}
                  node={child}
                  level={level + 1}
                  onSelect={onSelect}
                  selectedId={selectedId}
                  forceOpen={forceOpen}
                />
              ))}
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
