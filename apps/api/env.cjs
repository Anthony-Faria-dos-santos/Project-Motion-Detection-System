// Preload: loads .env from monorepo root BEFORE any module imports
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
