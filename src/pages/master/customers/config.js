export const EMPTY_FORM = {
  customer_id: '',
  service_id: '',
  company_name: '',
  brand_site: '',
  address: '',
  city: '',
  province: '',
  service_type: 'Internet Dedicated',
  grade: 'Bronze',
  support_level: 'L1',
  link_coverage: '',
  osc_reference: '',
  odc_reference: '',
  odp_reference: '',
  latitude: '',
  longitude: '',
  coord_source: '',
  survey_name_raw: '',
  survey_latitude: '',
  survey_longitude: '',
  survey_source: '',
};

export const DEFAULT_SERVICE_TYPES = [
  'Internet Dedicated',
  'Broadband',
  'VPN IP',
  'MPLS',
  'Astinet',
  'VSAT',
  'Clear Channel',
];

export const DEFAULT_GRADE_OPTIONS = ['VIP', 'Gold', 'Silver', 'Bronze', 'A', 'B', 'C', 'High', 'Medium', 'Low'];
export const DEFAULT_SUPPORT_OPTIONS = ['L1', 'L2', 'L3', '1', '2', '3'];

export const COORD_SOURCE_OPTIONS = [
  '',
  'manual',
  'geocoder',
  'anchor',
  'update-workbook-customer',
  'update-workbook-odp',
];
