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
const createSite = async (payload) => {
  try {
    return await netboxService.createSite(payload);
  } catch (err) {
    console.log('⚠️ Failed to create Site in NetBox, using local database:', err.message);
  }
  return ndsModel.createSite(payload);
};
const updateSite = async (id, payload) => {
  try {
    return await netboxService.updateSite(id, payload);
  } catch (err) {
    console.log('⚠️ Failed to update Site in NetBox, using local database:', err.message);
  }
  return ndsModel.updateSite(id, payload);
};
const deleteSite = async (id) => {
  try {
    return await netboxService.deleteSite(id);
  } catch (err) {
    console.log('⚠️ Failed to delete Site in NetBox, using local database:', err.message);
  }
  return ndsModel.deleteSite(id);
};

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
          vlan_id: p.vlan_id,
          vrf: p.vrf || 'Global',
          vrf_id: p.vrf_id,
          tenant: p.tenant || 'N/A',
          tenant_id: p.tenant_id,
          tenant_group: p.tenant_group || 'N/A',
          tenant_group_id: p.tenant_group_id,
          role: p.role || 'N/A',
          role_id: p.role_id,
          siteName: p.site?.name || 'N/A',
          site_id: p.site_id,
          status_value: p.status_value,
          is_pool: p.is_pool,
          mark_utilized: p.mark_utilized,
          scope_type: p.scope_type,
          scope_id: p.scope_id,
          ringname: p.ringname || 'N/A',
          owner_group: p.owner_group || 'N/A',
          owner: p.owner || 'N/A',
          tags: p.tags || '',
          description: p.description || 'N/A',
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
const createPrefix = async (payload) => {
  try {
    return await netboxService.createPrefix(payload);
  } catch (err) {
    console.error('⚠️ Failed to create Prefix in NetBox, creating in local database', err.message);
  }
  return ndsModel.createPrefix(payload);
};
const updatePrefix = async (id, payload) => {
  try {
    return await netboxService.updatePrefix(id, payload);
  } catch (err) {
    console.error('⚠️ Failed to update Prefix in NetBox, updating local database', err.message);
  }
  return ndsModel.updatePrefix(id, payload);
};
const deletePrefix = async (id) => {
  try {
    return await netboxService.deletePrefix(id);
  } catch (err) {
    console.error('⚠️ Failed to delete Prefix in NetBox, deleting from local database', err.message);
  }
  return ndsModel.deletePrefix(id);
};

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

// Regions (NetBox direct)
const getRegions = async () => {
  try {
    return await netboxService.getRegions();
  } catch (err) {
    console.log('⚠️ Failed to load Regions from NetBox:', err.message);
    return [];
  }
};

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

  // Regions
  getRegions,

  // Device CRUD
  createDevice: async (payload) => netboxService.createDevice(payload),
  createDeviceType: async (payload) => netboxService.createDeviceType(payload),
  createInterfaceTemplates: async (deviceTypeId, payload) => netboxService.createInterfaceTemplates(deviceTypeId, payload),
  getInterfaceTemplates: async (deviceTypeId) => netboxService.getInterfaceTemplates(deviceTypeId),
  updateDevice: async (id, payload) => netboxService.updateDevice(id, payload),
  deleteDevice: async (id) => netboxService.deleteDevice(id),

  // Device Metadata helpers
  getDeviceTypes: async () => {
    try {
      return await netboxService.getDeviceTypes();
    } catch (err) {
      console.log('⚠️ Failed to load Device Types from NetBox, using fallback mock data');
      return [
        { id: 1, manufacturer: "Cisco", model: "ASR 9010", display: "Cisco ASR 9010", part_number: "ASR-9010-AC", u_height: 21, is_full_depth: "Yes", device_count: 5, interface_count: 48 },
        { id: 2, manufacturer: "Huawei", model: "NE40E", display: "Huawei NE40E", part_number: "CR52-NE40E-X8", u_height: 14, is_full_depth: "Yes", device_count: 3, interface_count: 32 },
        { id: 3, manufacturer: "Cisco", model: "Catalyst 9300", display: "Cisco Catalyst 9300", part_number: "C9300-48T-A", u_height: 1, is_full_depth: "No", device_count: 12, interface_count: 50 },
        { id: 4, manufacturer: "Nokia", model: "7210", display: "Nokia 7210", part_number: "3HE08142AA", u_height: 1, is_full_depth: "No", device_count: 8, interface_count: 24 },
        { id: 5, manufacturer: "Cisco", model: "Nexus 9300", display: "Cisco Nexus 9300", part_number: "N9K-C93180YC-FX", u_height: 1, is_full_depth: "Yes", device_count: 6, interface_count: 54 }
      ];
    }
  },
  getDeviceRoles: async () => {
    try {
      return await netboxService.getDeviceRoles();
    } catch (err) {
      console.log('⚠️ Failed to load Device Roles from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Provider Edge", slug: "provider-edge" },
        { id: 2, name: "LSW_Network", slug: "lsw_network" },
        { id: 3, name: "Network", slug: "network" },
        { id: 4, name: "Aggregation", slug: "aggregation" }
      ];
    }
  },
  getTenants: async () => {
    try {
      return await netboxService.getTenants();
    } catch (err) {
      console.log('⚠️ Failed to load Tenants from NetBox, using fallback mock data');
      return [
        { id: 1, name: "NDS Team", slug: "nds-team" },
        { id: 2, name: "CDS Team", slug: "cds-team" }
      ];
    }
  },
  getLocations: async () => {
    try {
      return await netboxService.getLocations();
    } catch (err) {
      console.log('⚠️ Failed to load Locations from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Floor 1", slug: "floor-1", site: 1 },
        { id: 2, name: "Floor 2", slug: "floor-2", site: 2 }
      ];
    }
  },
  getRacks: async () => {
    try {
      return await netboxService.getRacks();
    } catch (err) {
      console.log('⚠️ Failed to load Racks from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Rack A-01", site: 1 },
        { id: 2, name: "Rack B-02", site: 2 }
      ];
    }
  },
  getPlatforms: async () => {
    try {
      return await netboxService.getPlatforms();
    } catch (err) {
      console.log('⚠️ Failed to load Platforms from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Cisco IOS-XR", slug: "cisco-ios-xr" },
        { id: 2, name: "Huawei VRP", slug: "huawei-vrp" },
        { id: 3, name: "Juniper Junos", slug: "juniper-junos" }
      ];
    }
  },
  getConfigTemplates: async () => {
    try {
      return await netboxService.getConfigTemplates();
    } catch (err) {
      console.log('⚠️ Failed to load Config Templates from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Standard PE Config Template" },
        { id: 2, name: "Standard LSW Config Template" }
      ];
    }
  },
  getClusters: async () => {
    try {
      return await netboxService.getClusters();
    } catch (err) {
      console.log('⚠️ Failed to load Clusters from NetBox, using fallback mock data');
      return [
        { id: 1, name: "BKK-Core-Cluster" },
        { id: 2, name: "CNX-Edge-Cluster" }
      ];
    }
  },
  getTenantGroups: async () => {
    try {
      return await netboxService.getTenantGroups();
    } catch (err) {
      console.log('⚠️ Failed to load Tenant Groups from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Internal Infrastructure", slug: "internal-infrastructure" },
        { id: 2, name: "External Clients", slug: "external-clients" }
      ];
    }
  },
  getVirtualChassises: async () => {
    try {
      return await netboxService.getVirtualChassises();
    } catch (err) {
      console.log('⚠️ Failed to load Virtual Chassis from NetBox, using fallback mock data');
      return [
        { id: 1, name: "BKK-VC-01" },
        { id: 2, name: "CNX-VC-02" }
      ];
    }
  },
  getTags: async () => {
    try {
      return await netboxService.getTags();
    } catch (err) {
      console.log('⚠️ Failed to load Tags from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Production", slug: "production" },
        { id: 2, name: "Staging", slug: "staging" },
        { id: 3, name: "Core", slug: "core" }
      ];
    }
  },
  getVlans: async () => {
    try {
      return await netboxService.getVlans();
    } catch (err) {
      console.log('⚠️ Failed to load VLANs from NetBox, using fallback mock data');
      return [
        { id: 1, name: "Management-VLAN", vid: 100, display: "Management-VLAN (100)" },
        { id: 2, name: "Data-VLAN", vid: 200, display: "Data-VLAN (200)" },
        { id: 3, name: "Voice-VLAN", vid: 300, display: "Voice-VLAN (300)" }
      ];
    }
  },
  
  // Port Presets (Templates)
  getPortPresets: async () => ndsModel.findPortPresets(),
  createPortPreset: async (payload) => ndsModel.createPortPreset(payload),
  getInterfaceTypeChoices: async () => netboxService.getInterfaceTypeChoices()
};
