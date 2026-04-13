import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('technician'),
  name: text('name').notNull(),
  email: text('email'),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  employee_id: text('employee_id')
});

export const master_customer = sqliteTable('master_customer', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customer_id: text('customer_id').notNull().unique(),
  service_id: text('service_id').notNull().unique(),
  company_name: text('company_name').notNull(),
  brand_site: text('brand_site').notNull(),
  address: text('address'),
  service_type: text('service_type'),
  grade: text('grade'),
  support_level: text('support_level'),
  link_coverage: text('link_coverage'),
  sla: text('sla'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  city: text('city'),
  province: text('province'),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const master_classifications = sqliteTable('master_classifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  klasifikasi: text('klasifikasi').notNull(),
  sub_klasifikasi: text('sub_klasifikasi').notNull(),
  is_active: integer('is_active').notNull().default(1)
});

export const master_technical_support = sqliteTable('master_technical_support', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  no: text('no'),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const master_actions = sqliteTable('master_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const master_distribusi = sqliteTable('master_distribusi', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  level_1: text('level_1').notNull(),
  level_2: text('level_2'),
  level_3: text('level_3'),
  level_4: text('level_4'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  is_active: integer('is_active').notNull().default(1),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const incidents = sqliteTable('incidents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  case_no: text('case_no').notNull().unique(),
  customer_id: integer('customer_id').references(() => master_customer.id),
  ncal: text('ncal').notNull().default('YELLOW'),
  odp_bts: text('odp_bts'),
  level_support: text('level_support'),
  initial_problem: text('initial_problem'),
  status: text('status').notNull().default('open'),
  technician_id: integer('technician_id').references(() => users.id),
  root_cause: text('root_cause'),
  last_action: text('last_action'),
  power_before: text('power_before'),
  power_after: text('power_after'),
  kabel: text('kabel'),
  panjang_kabel: text('panjang_kabel'),
  pic: text('pic'),
  indikasi: text('indikasi'),
  sla: text('sla'),
  classification_id: integer('classification_id').references(() => master_classifications.id),
  start_time: text('start_time').notNull(),
  start_action_time: text('start_action_time'),
  end_time: text('end_time'),
  total_pause_duration_seconds: integer('total_pause_duration_seconds').notNull().default(0),
  duration_gross_seconds: integer('duration_gross_seconds'),
  duration_nett_seconds: integer('duration_nett_seconds'),
  created_by: integer('created_by').references(() => users.id),
  customer_terdampak: text('customer_terdampak'),
  koordinat: text('koordinat'),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
});

export const pause_logs = sqliteTable('pause_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  incident_id: integer('incident_id').notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  pause_start: text('pause_start').notNull(),
  pause_end: text('pause_end'),
  reason: text('reason'),
  duration_seconds: integer('duration_seconds'),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const audit_logs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  incident_id: integer('incident_id').references(() => incidents.id),
  user_id: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  details: text('details'),
  timestamp: text('timestamp').notNull().default('CURRENT_TIMESTAMP')
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').references(() => users.id),
  target_role: text('target_role'),
  incident_id: integer('incident_id').references(() => incidents.id),
  type: text('type').notNull(),
  message: text('message').notNull(),
  is_read: integer('is_read').notNull().default(0),
  created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP')
});

export const escalation_config = sqliteTable('escalation_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull().default('telegram'),
  webhook_url: text('webhook_url'),
  webhook_url_vendor: text('webhook_url_vendor'),
  is_active: integer('is_active').notNull().default(0),
  template_open: text('template_open'),
  template_open_vendor: text('template_open_vendor'),
  template_close: text('template_close'),
  template_close_vendor: text('template_close_vendor'),
  template_open_internal_blue: text('template_open_internal_blue'),
  template_open_vendor_blue: text('template_open_vendor_blue'),
  template_close_internal_blue: text('template_close_internal_blue'),
  template_close_vendor_blue: text('template_close_vendor_blue'),
  template_open_internal_yellow: text('template_open_internal_yellow'),
  template_open_vendor_yellow: text('template_open_vendor_yellow'),
  template_close_internal_yellow: text('template_close_internal_yellow'),
  template_close_vendor_yellow: text('template_close_vendor_yellow'),
  template_open_internal_orange: text('template_open_internal_orange'),
  template_open_vendor_orange: text('template_open_vendor_orange'),
  template_close_internal_orange: text('template_close_internal_orange'),
  template_close_vendor_orange: text('template_close_vendor_orange'),
  template_open_internal_red: text('template_open_internal_red'),
  template_open_vendor_red: text('template_open_vendor_red'),
  template_close_internal_red: text('template_close_internal_red'),
  template_close_vendor_red: text('template_close_vendor_red'),
  template_open_internal_black: text('template_open_internal_black'),
  template_open_vendor_black: text('template_open_vendor_black'),
  template_close_internal_black: text('template_close_internal_black'),
  template_close_vendor_black: text('template_close_vendor_black'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
});

export const metadata = sqliteTable('metadata', {
  key: text('key').primaryKey(),
  value: text('value'),
  updated_at: text('updated_at').notNull().default('CURRENT_TIMESTAMP')
});
