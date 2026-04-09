export default {
  schema: './server/config/schema.js',
  out: './server/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './imms.db',
  },
};
