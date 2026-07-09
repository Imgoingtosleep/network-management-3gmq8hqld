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
      d.device_role?.name?.toLowerCase() === 'provider edge'
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
      d.device_role?.name?.toLowerCase() === 'lsw_network' ||
      d.device_role?.name?.toLowerCase() === 'network'
    );
    if (filtered.length > 0) {
      return filtered.map(d => ({
        id: d.id,
        name: d.name,
        role: d.device_role?.name || 'LSW_Network',
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

function ipToInt(ip) {
  if (!ip) return 0;
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((ipInt, octet) => (ipInt << 8) + parseInt(octet, 10), 0) >>> 0;
}

// IP Management / Prefixes (ดึงตรงจาก NetBox)
const getAllPrefixes = async () => {
  try {
    const [netboxPrefixes, netboxIps] = await Promise.all([
      netboxService.getPrefixes(),
      netboxService.getIpAddresses()
    ]);

    if (netboxPrefixes.length > 0) {
      // Parse IP ranges once
      const prefixRanges = netboxPrefixes.map(p => {
        const parts = p.prefix.split('/');
        const ip = parts[0];
        const mask = parseInt(parts[1], 10);
        if (isNaN(mask)) return { id: p.id, start: 0, end: 0, usableSize: 1 };
        const ipInt = ipToInt(ip);
        const maskInt = (0xffffffff << (32 - mask)) >>> 0;
        const start = (ipInt & maskInt) >>> 0;
        const end = (start | ~maskInt) >>> 0;
        const totalSize = (end - start + 1);
        const usableSize = mask >= 31 ? totalSize : (p.is_pool ? totalSize : totalSize - 2);
        return { id: p.id, start, end, usableSize };
      });

      // Group IP addresses into integers
      const ipInts = netboxIps.map(ip => ipToInt(ip.address)).filter(ipVal => ipVal > 0);

      // Count IPs in each range
      const counts = {};
      for (const ipVal of ipInts) {
        for (const range of prefixRanges) {
          if (ipVal >= range.start && ipVal <= range.end) {
            counts[range.id] = (counts[range.id] || 0) + 1;
          }
        }
      }

      return netboxPrefixes.map(p => {
        const range = prefixRanges.find(r => r.id === p.id);
        const ipCount = counts[p.id] || 0;
        const usable = range ? range.usableSize : 1;
        const utilization = usable > 0 ? Math.min(100, Math.round((ipCount / usable) * 100)) : 0;
        
        return {
          id: p.id,
          prefix: p.prefix,
          vlan: p.vlan?.vid || p.vlan?.name || p.prefix.split('.')[2] || 100,
          vrf: p.vrf || 'Global',
          tenant: p.tenant || 'N/A',
          role: p.role || 'N/A',
          siteName: p.site?.name || 'N/A',
          description: p.description || 'N/A',
          ringname: p.custom_fields?.ringname || 'N/A',
          utilization: `${utilization}%`,
          last_updated: p.last_updated || 'N/A'
        };
      });
    }
  } catch (err) {
    console.error('⚠️ Failed to load Prefixes from NetBox, using local database', err);
  }
  const local = await ndsModel.findPrefixes();
  return local.map(p => ({
    ...p,
    siteName: p.siteName || 'N/A',
    vrf: p.vrf || 'Global',
    tenant: p.tenant || 'N/A',
    role: p.role || 'N/A',
    ringname: p.ringname || 'N/A',
    utilization: '0%',
    last_updated: 'N/A'
  }));
};
const createPrefix = (payload) => ndsModel.createPrefix(payload);
const updatePrefix = async (id, payload) => {
  try {
    const patchData = {};
    if (payload.ringname !== undefined) {
      patchData.custom_fields = {
        ringname: payload.ringname || null
      };
    }
    if (payload.description !== undefined) {
      patchData.description = payload.description;
    }
    
    if (Object.keys(patchData).length > 0) {
      await netboxService.updatePrefix(id, patchData);
    }
  } catch (err) {
    console.error('⚠️ Failed to update Prefix in NetBox, updating local database', err);
  }
  return ndsModel.updatePrefix(id, payload);
};
const deletePrefix = (id) => ndsModel.deletePrefix(id);

// AGGs (ดึงตรงจาก NetBox)
const getAllAGGs = async () => {
  try {
    const netboxDevices = await netboxService.getDevices();
    const filtered = netboxDevices.filter(d => 
      d.device_role?.name?.toLowerCase() === 'aggregation'
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

// Domains (ดึงตรงจาก NetBox VRF)
const getAllDomains = async () => {
  try {
    const netboxVrfs = await netboxService.getVrfs();
    if (netboxVrfs.length > 0) {
      return netboxVrfs.map(v => ({
        id: v.id,
        name: v.name,
        rd: v.rd,
        tenant: v.tenant,
        description: v.description,
        last_updated: v.last_updated
      }));
    }
  } catch (err) {
    console.log('⚠️ Failed to load VRFs from NetBox, using local database');
  }
  const localDomains = await ndsModel.findDomains();
  return localDomains.map(d => ({
    id: d.id,
    name: d.name,
    rd: d.code,
    tenant: d.type,
    description: 'Local Mock VRF',
    last_updated: 'N/A'
  }));
};
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
