# UI/UX Audit: shadcn/ui + Tailwind Refactor

Dokumen ini fokus pada audit fondasi UI utama dan halaman-halaman menu/submenu yang paling menentukan kualitas visual aplikasi.

Prinsip audit:

- Target design system: `shadcn/ui` + Tailwind utility classes.
- Hindari styling manual dan primitive native yang dibungkus setengah jadi.
- Semua layout harus kembali ke token shadcn seperti `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-card`, `text-card-foreground`.
- Typography harus mengikuti utility classes yang umum di dokumentasi shadcn, bukan skala tekstual buatan sendiri yang terlalu agresif.

---

## Temuan 1

**Lokasi Masalah:** [src/index.css](/Users/macbookair/Documents/IMMS/src/index.css:3)

**Masalah UI/UX:**

- Fondasi tema tidak benar-benar mengikuti design token shadcn.
- File ini membuat token campuran seperti `--color-success`, `--color-error`, `--color-info`, lalu global override untuk `table`, `th`, `td`, `h1`, `h2`, scrollbar, dan micro-typography.
- Hasilnya semua halaman terlihat seperti memiliki “mini design system” sendiri, bukan satu sistem konsisten. Ini penyebab utama UI terasa amatir: komponen punya perilaku global tak terduga dan sulit dikendalikan per halaman.

**Solusi shadcn/ui:**

- Simpan token inti saja di `:root` dan `:root[data-theme='dark']`.
- Hapus global override pada `table`, `th`, `td`, `h1`, `h2`.
- Biarkan typography dan table distyling oleh komponen (`Table`, `Card`, `Button`, `Input`, `Dialog`, dll), bukan oleh CSS global.
- Gunakan token standar seperti `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--destructive`.

**Kode Perbaikan:**

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Temuan 2

**Lokasi Masalah:** [src/components/ui/forms/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/forms/index.jsx:5)

**Masalah UI/UX:**

- `Button`, `Input`, `Textarea`, dan `Select` adalah komponen custom yang hanya “mirip” shadcn, tapi bukan primitive shadcn.
- Class seperti `text-[9px]`, `text-[10px]`, `uppercase`, `tracking-wider`, `font-black` dipaksakan ke semua state.
- Ini membuat semua tombol dan field terlihat terlalu sempit, terlalu keras, dan tidak punya hierarki visual yang natural untuk aplikasi enterprise.

**Solusi shadcn/ui:**

- Ganti dengan struktur standar shadcn: `button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `select.tsx`.
- Variant tombol harus memakai `variant="default" | "outline" | "secondary" | "ghost" | "destructive"`.
- Gunakan `text-sm`, `h-9`, `h-10`, `rounded-md`, `px-3`, `px-4`.

**Kode Perbaikan:**

```tsx
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

---

## Temuan 3

**Lokasi Masalah:** [src/components/ui/layout/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/layout/index.jsx:4)

**Masalah UI/UX:**

- `SectionCard` dan `PageHeader` memaksa gaya judul dan subtitle sendiri dengan `text-[10px]`, `tracking-[0.18em]`, `font-black`, `uppercase`.
- Ini membuat hampir semua card dan header punya tone yang sama, padahal informasi level-1, level-2, dan meta text harus dibedakan dengan jelas.
- Komponen juga memakai `style` manual, yang berlawanan dengan target “no manual styling”.

**Solusi shadcn/ui:**

- Ganti `SectionCard` dengan kombinasi `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- Ganti `PageHeader` dengan pola typography sederhana: `text-2xl font-semibold tracking-tight` untuk title dan `text-sm text-muted-foreground` untuk subtitle.

**Kode Perbaikan:**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export function AppSection({
  title,
  description,
  action,
  children,
  footer,
  className,
}) {
  return (
    <Card className={className}>
      {(title || action) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  )
}
```

---

## Temuan 4

**Lokasi Masalah:** [src/components/layout/Sidebar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Sidebar.jsx:81)

**Masalah UI/UX:**

- Sidebar dibangun manual dari `aside`, `div`, `NavLink`, dan `button`.
- Spacing, active state, icon sizing, footer profile, dan group label semuanya diatur manual.
- Pola ini sulit diskalakan saat menu bertambah, tidak punya standar collapsible behavior, dan aksesibilitasnya tidak sekuat primitive sidebar shadcn.

**Solusi shadcn/ui:**

- Adopsi komponen `Sidebar`, `SidebarHeader`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`.
- Gunakan `Badge` atau `Avatar` untuk role/profile, bukan blok custom.

**Kode Perbaikan:**

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ groups, user, onLogout }) {
  return (
    <Sidebar>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={item.active}>
                    <NavLink to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="justify-start" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
```

---

## Temuan 5

**Lokasi Masalah:** [src/components/layout/Topbar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Topbar.jsx:70)

**Masalah UI/UX:**

- Topbar mencampur breadcrumb, clock, theme switch, notification bell, dan role badge dalam satu bar yang seluruh spacing dan styling-nya manual.
- Typography terlalu kecil (`text-[10px]`, `text-[11px]`) untuk informasi navigasi utama.
- Role badge memakai warna custom, bukan token badge shadcn.

**Solusi shadcn/ui:**

- Gunakan `Breadcrumb`, `Separator`, `Button`, `Badge`, dan `DropdownMenu`.
- Clock sebaiknya menjadi secondary metadata, bukan elemen visual dominan.

**Kode Perbaikan:**

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"

<header className="flex h-14 items-center justify-between border-b bg-background px-6">
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink href="/">Nexaris</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>

  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon">
      <Bell className="h-4 w-4" />
    </Button>
    <Badge variant="secondary">{user?.role}</Badge>
  </div>
</header>
```

---

## Temuan 6

**Lokasi Masalah:** [src/components/tables/DataTable.jsx](/Users/macbookair/Documents/IMMS/src/components/tables/DataTable.jsx:45)

**Masalah UI/UX:**

- `DataTable` saat ini adalah tabel custom penuh.
- Header, body, empty state, pagination, dan action button semua di-style manual.
- Komponen ini juga masih bergantung pada global `table/th/td` override di `index.css`, yang membuat perilaku visual tabel antar halaman tidak bisa diprediksi.

**Solusi shadcn/ui:**

- Gunakan stack resmi shadcn data table: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `Input`, `Button`, `DropdownMenu`, `Pagination`.
- Empty state harus dipisah dengan `EmptyState`/`Card` yang konsisten.

**Kode Perbaikan:**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<div className="rounded-md border">
  <Table>
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead key={header.id}>
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
    <TableBody>
      {table.getRowModel().rows.length ? (
        table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</div>
```

---

## Temuan 7

**Lokasi Masalah:** [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx:66)

**Masalah UI/UX:**

- Dashboard mencampur KPI card custom, chart custom, HTML table mentah, dan button native dalam satu halaman.
- Ada hardcoded color classes seperti `bg-yellow-500`, `bg-blue-500` yang keluar dari token tema.
- CTA footer “Audit All History” masih `<button>` native, bukan `Button`.
- Typography dashboard terlalu agresif: hampir semua label uppercase + tracking besar + `font-black`.

**Solusi shadcn/ui:**

- Pecah ke 3 primitive utama: `PageHeader`, `Card`, `Table`.
- Semua CTA gunakan `Button`.
- Gunakan `Badge` untuk status/NCAL.
- Ganti warna hardcoded dengan token tema atau varian badge.

**Kode Perbaikan:**

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardDescription>Active queue</CardDescription>
    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-semibold tracking-tight">{data?.totalActive ?? 0}</div>
  </CardContent>
</Card>

<Button variant="outline" onClick={() => navigate("/history")}>
  View all history
</Button>
```

---

## Temuan 8

**Lokasi Masalah:** [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx:14)

**Masalah UI/UX:**

- Modal `PauseModal`, `UpdateModal`, dan `CloseModal` masih berisi `label`, `input`, `textarea`, `select` native dengan class manual yang diulang terus.
- Ada banyak block container seperti `bg-foreground/[0.03] border border-foreground/5 rounded-2xl` yang seharusnya menjadi `Card`.
- Ini membuat form experience tidak konsisten, sulit dijaga, dan tidak mengikuti standar form shadcn.

**Solusi shadcn/ui:**

- Gunakan `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`.
- Gunakan `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.
- Gunakan `Textarea`, `Input`, `SelectTrigger`, `SelectContent`, `SelectItem`.

**Kode Perbaikan:**

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Update Incident</DialogTitle>
      <DialogDescription>
        Document the latest technical progress and root cause findings.
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="root-cause">Root cause</Label>
        <Input id="root-cause" value={form.root_cause} onChange={...} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="last-action">Handling notes</Label>
        <Textarea id="last-action" rows={5} value={form.last_action} onChange={...} />
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSave}>Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Temuan 9

**Lokasi Masalah:** [src/pages/master/CustomersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx:255)

**Masalah UI/UX:**

- Halaman customer memakai banyak elemen dekoratif manual: toggle view custom, stats custom, search custom, icon button custom, action row custom.
- Page-level visual language tidak sama dengan dashboard maupun halaman settings.
- Ada campuran list/map switch yang seharusnya menjadi `Tabs`.

**Solusi shadcn/ui:**

- Gunakan `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` untuk list vs map.
- Search gunakan `Input` dengan icon wrapper sederhana.
- Toolbar aksi gunakan `Button` dan `DropdownMenu`.
- KPI card gunakan `Card`.

**Kode Perbaikan:**

```tsx
<Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
  <div className="flex items-center justify-between gap-4">
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search customers..."
      className="max-w-sm"
    />
    <TabsList>
      <TabsTrigger value="list">List</TabsTrigger>
      <TabsTrigger value="map">Map</TabsTrigger>
    </TabsList>
  </div>

  <TabsContent value="list">
    <Card>
      <CardContent className="p-0">
        <DataTable ... />
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="map">
    <Card>
      <CardContent className="p-0">
        <CustomerMap ... />
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## Temuan 10

**Lokasi Masalah:** [src/pages/EscalationSettingsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx:150)

**Masalah UI/UX:**

- Halaman settings ini paling jauh dari shadcn.
- Ada switch custom buatan tangan, tabs custom buatan tangan, textarea native, serta prop `icon` yang dikirim ke `SectionCard` padahal komponen itu tidak menerima prop tersebut.
- Ini bukan cuma tidak konsisten, tapi juga membuat code misleading: desainer/developer lain akan mengira ada dukungan API komponen yang sebenarnya tidak ada.

**Solusi shadcn/ui:**

- Ganti seluruh shell settings ke `Card`, `Tabs`, `Switch`, `Textarea`, `Badge`, `Separator`.
- Hilangkan prop yang tidak digunakan.
- Untuk preview gunakan `Card` terpisah dengan `CardHeader` dan `CardContent`.

**Kode Perbaikan:**

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Core Integration</CardTitle>
      <CardDescription>Notification endpoints and activation state.</CardDescription>
    </div>
    <div className="flex items-center gap-2">
      <Label htmlFor="is-active">Active</Label>
      <Switch
        id="is-active"
        checked={cfg.is_active}
        onCheckedChange={(checked) => setF("is_active", checked)}
      />
    </div>
  </CardHeader>
  <CardContent className="grid gap-6 md:grid-cols-2">
    <Input
      label="Internal webhook"
      value={cfg.webhook_url}
      onChange={(e) => setF("webhook_url", e.target.value)}
    />
    <Input
      label="Vendor webhook"
      value={cfg.webhook_url_vendor}
      onChange={(e) => setF("webhook_url_vendor", e.target.value)}
    />
  </CardContent>
</Card>

<Tabs value={previewNcal} onValueChange={setPreviewNcal}>
  <TabsList>
    <TabsTrigger value="BLUE">Blue</TabsTrigger>
    <TabsTrigger value="YELLOW">Yellow</TabsTrigger>
    <TabsTrigger value="ORANGE">Orange</TabsTrigger>
    <TabsTrigger value="RED">Red</TabsTrigger>
    <TabsTrigger value="BLACK">Black</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## Temuan 11

**Lokasi Masalah:** [src/components/ui/chart.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/chart.jsx:9)

**Masalah UI/UX:**

- `ChartContainer`, `ChartTooltipContent`, dan `ChartLegendContent` masih mengandalkan inline style untuk CSS variables dan warna dot.
- Secara prinsip ini masih “manual styling”.
- Selain itu, tooltip/legend typography terlalu ekstrem dan tidak menyatu dengan komponen card/form lain.

**Solusi shadcn/ui:**

- Pertahankan chart wrapper, tetapi normalisasikan visual tooltip ke `rounded-lg border bg-background p-2 shadow-md`.
- Hindari `style` kecuali benar-benar untuk color binding dari chart series.
- Untuk container tinggi, gunakan class layout (`h-[350px]`, `min-h-[300px]`) dari parent, bukan `style`.

**Kode Perbaikan:**

```tsx
export function ChartTooltipContent({ active, payload, label, config = {} }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => {
          const cfg = config[item.dataKey] || {}
          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color || item.color }} />
                <span className="text-muted-foreground">{cfg.label || item.name}</span>
              </div>
              <span className="font-medium tabular-nums">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Temuan 12

**Lokasi Masalah:** [src/components/ui/data/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/data/index.jsx:5)

**Masalah UI/UX:**

- Badge/pill seluruh aplikasi dibangun manual dan punya beberapa skala teks sendiri.
- Banyak badge memakai `text-[10px]`, `tracking-widest`, `font-bold`, `rounded`, yang secara visual terlalu banyak variasi.
- Ini menurunkan konsistensi dan membuat komponen state/status tidak terasa sebagai satu keluarga.

**Solusi shadcn/ui:**

- Ganti semua badge ke komponen `Badge`.
- Tambahkan wrapper ringan untuk NCAL/status bila perlu, tapi basis visualnya tetap `Badge`.

**Kode Perbaikan:**

```tsx
import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }) {
  const variant =
    status === "done"
      ? "secondary"
      : status === "pending"
      ? "outline"
      : status === "progress"
      ? "default"
      : "secondary"

  return <Badge variant={variant}>{status}</Badge>
}
```

---

## Prioritas Refactor

1. Ganti fondasi token dan hapus global CSS override di `src/index.css`.
2. Ganti primitive custom (`Button`, `Input`, `Textarea`, `Select`, `Modal`, `SectionCard`) ke implementasi shadcn asli.
3. Refactor shell layout: `Sidebar`, `Topbar`, `Breadcrumb`, `Badge`, `Dialog`, `Card`.
4. Refactor `DataTable` agar mengikuti stack `Table` + `Pagination` + `Input`.
5. Refactor halaman dengan deviasi terbesar: `EscalationSettingsPage`, `CustomersPage`, `CurrentTroublePage`, `DashboardPage`.

---

## Referensi Resmi

- shadcn/ui Theming: https://ui.shadcn.com/docs/theming
- shadcn/ui Button: https://ui.shadcn.com/docs/components/button
- shadcn/ui Card: https://ui.shadcn.com/docs/components/card
- shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog
- shadcn/ui Data Table: https://ui.shadcn.com/docs/components/radix/data-table
- shadcn/ui Sidebar: https://ui.shadcn.com/docs/components/sidebar
- shadcn/ui Typography: https://ui.shadcn.com/docs/components/radix/typography
