import fs from 'fs';
import path from 'path';

const REPLACEMENTS = [
    { search: "style={{ color: 'var(--text-muted)' }}", replace: 'className="text-[color:var(--text-muted)]"' },
    { search: "style={{ color: 'var(--text-primary)' }}", replace: 'className="text-[color:var(--text-primary)]"' },
    { search: "style={{ color: 'var(--text-secondary)' }}", replace: 'className="text-[color:var(--text-secondary)]"' },
    { search: "style={{ color: 'var(--accent)' }}", replace: 'className="text-[color:var(--accent)]"' },
    { search: "style={{ color: 'var(--accent-light)' }}", replace: 'className="text-[color:var(--accent-light)]"' },
    { search: "style={{ fontWeight: 600 }}", replace: 'className="font-semibold"' },
    { search: "style={{ fontWeight: 500 }}", replace: 'className="font-medium"' },
    { search: "style={{ textAlign: 'center' }}", replace: 'className="text-center"' },
    { search: "style={{ textAlign: 'left' }}", replace: 'className="text-left"' },
    { search: "style={{ textAlign: 'right' }}", replace: 'className="text-right"' },
    { search: "style={{ padding: 0 }}", replace: 'className="p-0"' },
    { search: "style={{ padding: '1rem' }}", replace: 'className="p-4"' },
    { search: "style={{ padding: '1.5rem' }}", replace: 'className="p-6"' },
    { search: "style={{ padding: '0.75rem' }}", replace: 'className="p-3"' },
    { search: "style={{ padding: '0.5rem' }}", replace: 'className="p-2"' },
    { search: "style={{ margin: 0 }}", replace: 'className="m-0"' },
    { search: "style={{ display: 'flex', alignItems: 'center', gap: 8 }}", replace: 'className="flex items-center gap-2"' },
    { search: "style={{ display: 'flex', alignItems: 'center', gap: '8px' }}", replace: 'className="flex items-center gap-2"' },
    { search: "style={{ display: 'flex', alignItems: 'center', gap: 12 }}", replace: 'className="flex items-center gap-3"' },
    { search: "style={{ display: 'flex', justifyContent: 'space-between' }}", replace: 'className="flex justify-between"' },
    { search: "style={{ display: 'flex', justifyContent: 'center' }}", replace: 'className="flex justify-center"' },
    { search: "style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}", replace: 'className="flex justify-center p-12"' },
    { search: "style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}", replace: 'className="flex flex-col gap-4"' },
    { search: "style={{ position: 'relative' }}", replace: 'className="relative"' },
    { search: "style={{ cursor: 'pointer' }}", replace: 'className="cursor-pointer"' },
    { search: "style={{ opacity: 0.4 }}", replace: 'className="opacity-40"' },
    { search: "style={{ opacity: 0.7 }}", replace: 'className="opacity-70"' },
    { search: "style={{ display: 'none' }}", replace: 'className="hidden"' },
    { search: "style={{ marginTop: 4 }}", replace: 'className="mt-1"' },
    { search: "style={{ marginTop: 8 }}", replace: 'className="mt-2"' },
    { search: "style={{ marginTop: 12 }}", replace: 'className="mt-3"' },
    { search: "style={{ marginTop: 16 }}", replace: 'className="mt-4"' },
    { search: "style={{ marginBottom: '1rem' }}", replace: 'className="mb-4"' },
    { search: "style={{ width: 100 }}", replace: 'className="w-[100px]"' },
    { search: "style={{ width: 140 }}", replace: 'className="w-[140px]"' },
    { search: "style={{ fontSize: '0.75rem', fontWeight: 500 }}", replace: 'className="text-xs font-medium"' },
    { search: "style={{ fontSize: '0.85rem' }}", replace: 'className="text-[0.85rem]"' },
    { search: "style={{ fontSize: '0.75rem' }}", replace: 'className="text-xs"' },
    { search: "style={{ fontSize: '0.875rem' }}", replace: 'className="text-sm"' },
];

function walk(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(walk(fullPath));
        } else if (fullPath.endsWith('.jsx')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = walk('./src');
let totalChanges = 0;

files.forEach(file => {
    if (file.includes('DistributionMap.jsx') || file.includes('CustomerMap.jsx')) return;

    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    REPLACEMENTS.forEach(({ search, replace }) => {
        const newClasses = replace.match(/className="([^"]+)"/)[1];
        
        // 1. Merge into existing className="..." if style follows className
        // Pattern: className="foo" style={{...}}
        const regex1 = new RegExp('className="([^"]+)"\\s+' + search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex1, (match, p1) => `className="${p1} ${newClasses}"`);

        // 2. Merge into existing className="..." if style precedes className
        // Pattern: style={{...}} className="foo"
        const regex2 = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+className="([^"]+)"', 'g');
        content = content.replace(regex2, (match, p1) => `className="${p1} ${newClasses}"`);

        // 3. Standalone replacement
        content = content.split(search).join(replace);
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        totalChanges++;
        console.log(`Updated: ${file}`);
    }
});

console.log(`\nTotal files modified: ${totalChanges}`);
