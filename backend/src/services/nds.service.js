const ndsModel = require('../models/nds.model');
const netboxService = require('./netbox.service');

async function getAllProjects() {
  return ndsModel.findAll();
}

async function getProjectById(id) {
  return ndsModel.findById(id);
}

async function createProject(payload) {
  if (!payload?.name) {
    const err = new Error('กรุณาระบุชื่อโปรเจกต์ (name)');
    err.status = 400;
    throw err;
  }
  return ndsModel.create(payload);
}

// Sites (ดึงตรงจาก NetBox)
const getAllSites = async () => {
  try {
    const netboxSites = await netboxService.getSites();
    if (netboxSites.length > 0) {
      return netboxSites;
    }
  } catch (err) {
    console.log('⚠️ Failed to load Sites from NetBox, using local database');
  }
  return ndsModel.findSites();
};
const createSite = (payload) => ndsModel.createSite(payload);
const updateSite = (id, payload) => ndsModel.updateSite(id, payload);
const deleteSite = (id) => ndsModel.deleteSite(id);

// PEs (ดึงตรงจาก NetBox)
const getAllPEs = async () => {
  try {
    const netboxDevices = await netboxService.getDevices();
    const filtered = netboxDevices.filter(d => 
      d.device_role?.name?.toLowerCase().includes('pe') || 
      d.device_role?.name?.toLowerCase().includes('core') ||
      d.device_role?.name?.toLowerCase().includes('router')
    );
    if (filtered.length > 0) {
      return filtered.map(d => ({
        id: d.id,
        name: d.name,
        manufacturer: d.device_type?.manufacturer || 'N/A',
        model: d.device_type?.model || 'N/A',
        ip: d.primary_ip?.address?.split('/')[0] || 'N/A',
        siteName: d.site?.name || 'N/A',
        location: d.location || 'N/A',
        rack: d.rack || 'N/A',
        serial: d.serial || 'N/A',
        asset_tag: d.asset_tag || 'N/A',
        status: d.status?.label || 'Active',
        last_updated: d.last_updated || 'N/A'
      }));
    }
  } catch (err) {
    console.log('⚠️ Failed to load PEs from NetBox, using local database');
  }
  return ndsModel.findPEs();
};
const createPE = (payload) => ndsModel.createPE(payload);
const updatePE = (id, payload) => ndsModel.updatePE(id, payload);
const deletePE = (id) => ndsModel.deletePE(id);

// LSW/NTs (ดึงตรงจาก NetBox)
const getAllLswNts = async () => {
  try {
    const netboxDevices = await netboxService.getDevices();
    const filtered = netboxDevices.filter(d => 
      d.device_role?.name?.toLowerCase().includes('switch') || 
      d.device_role?.name?.toLowerCase().includes('lsw') ||
      d.device_role?.name?.toLowerCase().includes('nt') ||
      d.device_role?.name?.toLowerCase().includes('access')
    );
    if (filtered.length > 0) {
      return filtered.map(d => ({
        id: d.id,
        name: d.name,
        type: d.device_role?.name?.toLowerCase().includes('nt') ? 'NT' : 'LSW',
        manufacturer: d.device_type?.manufacturer || 'N/A',
        model: d.device_type?.model || 'N/A',
        ip: d.primary_ip?.address?.split('/')[0] || 'N/A',
        siteName: d.site?.name || 'N/A',
        location: d.location || 'N/A',
        rack: d.rack || 'N/A',
        serial: d.serial || 'N/A',
        asset_tag: d.asset_tag || 'N/A',
        status: d.status?.label || 'Active',
        last_updated: d.last_updated || 'N/A'
      }));
    }
  } catch (err) {
    console.log('⚠️ Failed to load LSW/NTs from NetBox, using local database');
  }
  return ndsModel.findLswNts();
};
const createLswNt = (payload) => ndsModel.createLswNt(payload);
const updateLswNt = (id, payload) => ndsModel.updateLswNt(id, payload);
const deleteLswNt = (id) => ndsModel.deleteLswNt(id);

// IP Management / Prefixes (ดึงตรงจาก NetBox)
const getAllPrefixes = async () => {
  try {
    const netboxPrefixes = await netboxService.getPrefixes();
    if (netboxPrefixes.length > 0) {
      return netboxPrefixes.map(p => ({
        id: p.id,
        prefix: p.prefix,
        vlan: p.prefix.split('.')[2] || 100,
        vrf: p.vrf || 'Global',
        tenant: p.tenant || 'N/A',
        role: p.role || 'N/A',
        siteName: p.site?.name || 'N/A',
        description: p.description || 'N/A',
        last_updated: p.last_updated || 'N/A'
      }));
    }
  } catch (err) {
    console.log('⚠️ Failed to load Prefixes from NetBox, using local database');
  }
  return ndsModel.findPrefixes();
};
const createPrefix = (payload) => ndsModel.createPrefix(payload);
const updatePrefix = (id, payload) => ndsModel.updatePrefix(id, payload);
const deletePrefix = (id) => ndsModel.deletePrefix(id);

// AGGs (ดึงตรงจาก NetBox)
const getAllAGGs = async () => {
  try {
    const netboxDevices = await netboxService.getDevices();
    const filtered = netboxDevices.filter(d => 
      d.device_role?.name?.toLowerCase().includes('agg') ||
      d.device_role?.name?.toLowerCase().includes('distribution')
    );
    if (filtered.length > 0) {
      return filtered.map(d => ({
        id: d.id,
        name: d.name,
        manufacturer: d.device_type?.manufacturer || 'N/A',
        model: d.device_type?.model || 'N/A',
        ip: d.primary_ip?.address?.split('/')[0] || 'N/A',
        siteName: d.site?.name || 'N/A',
        location: d.location || 'N/A',
        rack: d.rack || 'N/A',
        serial: d.serial || 'N/A',
        asset_tag: d.asset_tag || 'N/A',
        status: d.status?.label || 'Active',
        last_updated: d.last_updated || 'N/A'
      }));
    }
  } catch (err) {
    console.log('⚠️ Failed to load AGGs from NetBox, using local database');
  }
  return ndsModel.findAGGs();
};
const createAGG = (payload) => ndsModel.createAGG(payload);
const updateAGG = (id, payload) => ndsModel.updateAGG(id, payload);
const deleteAGG = (id) => ndsModel.deleteAGG(id);

// Domains
const getAllDomains = () => ndsModel.findDomains();
const createDomain = (payload) => ndsModel.createDomain(payload);
const updateDomain = (id, payload) => ndsModel.updateDomain(id, payload);
const deleteDomain = (id) => ndsModel.deleteDomain(id);

// Rings
const getAllRings = () => ndsModel.findRings();
const createRing = (payload) => ndsModel.createRing(payload);
const updateRing = (id, payload) => ndsModel.updateRing(id, payload);
const deleteRing = (id) => ndsModel.deleteRing(id);

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  
  // Sites
  getAllSites, createSite, updateSite, deleteSite,
  
  // PEs
  getAllPEs, createPE, updatePE, deletePE,
  
  // LSW/NTs
  getAllLswNts, createLswNt, updateLswNt, deleteLswNt,
  
  // IP
  getAllPrefixes, createPrefix, updatePrefix, deletePrefix,
  
  // AGGs
  getAllAGGs, createAGG, updateAGG, deleteAGG,
  
  // Domains
  getAllDomains, createDomain, updateDomain, deleteDomain,
  
  // Rings
  getAllRings, createRing, updateRing, deleteRing,
};
