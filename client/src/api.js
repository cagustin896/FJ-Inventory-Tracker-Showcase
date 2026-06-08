import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getBranches = () => api.get('/branches').then(r => r.data);
export const addBranch = (name) => api.post('/branches', { name }).then(r => r.data);
export const renameBranch = (id, name) => api.put(`/branches/${id}`, { name }).then(r => r.data);
export const deleteBranch = (id) => api.delete(`/branches/${id}`).then(r => r.data);

export const getInventory = (branchId, date, session) =>
  api.get(`/inventory/${branchId}/${date}/${session}`).then(r => r.data);

export const getModelSuggestions = (unitType) =>
  api.get('/inventory/suggestions/models', { params: { unitType } }).then(r => r.data);

export const saveInventory = (data) =>
  api.post('/inventory', data).then(r => r.data);

export const generateMorningForBranch = (branchId, date) =>
  api.post('/inventory/generate-morning', { branch_id: branchId, date }).then(r => r.data);

export const getSoldUnits = (branchId, date) =>
  api.get(`/sold/${branchId}/${date}`).then(r => r.data);

export const saveSoldUnits = (data) =>
  api.post('/sold', data).then(r => r.data);

export const deleteSoldUnit = (id) =>
  api.delete(`/sold/${id}`).then(r => r.data);

export const getTransfers = (branchId, date) =>
  api.get(`/transfers/${branchId}/${date}`).then(r => r.data);

export const saveTransfers = (data) =>
  api.post('/transfers', data).then(r => r.data);

export const deleteTransfer = (id) =>
  api.delete(`/transfers/${id}`).then(r => r.data);

export const getAccessories = (branchId, date, session) =>
  api.get(`/accessories/${branchId}/${date}/${session}`).then(r => r.data);

export const saveAccessories = (data) =>
  api.post('/accessories', data).then(r => r.data);

export const getAdjustments = (branchId, date) =>
  api.get(`/adjustments/${branchId}/${date}`).then(r => r.data);

export const saveAdjustments = (data) =>
  api.post('/adjustments', data).then(r => r.data);

export const getDashboard = (date) =>
  api.get(`/dashboard/${date}`).then(r => r.data);

export const getDashboardBreakdown = (branchId, date, session, category) =>
  api.get(`/dashboard/breakdown/${branchId}/${date}/${session}/${category}`).then(r => r.data);

export const getSettingsSummary = () =>
  api.get('/settings/summary').then(r => r.data);

export const refreshSampleData = (date) =>
  api.post('/settings/seed-demo', { date }).then(r => r.data);

export const getReportsSummary = (year, month) =>
  api.get(`/reports/summary/${year}/${month}`).then(r => r.data);

export const downloadReport = (url) => {
  window.open(url, '_blank');
};
