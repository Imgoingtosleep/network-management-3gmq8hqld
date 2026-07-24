function getSanitizedUrl() {
  let url = process.env.NETBOX_API_URL;
  if (!url) return null;
  
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

// ระบบ Cache ในหน่วยความจำเพื่อป้องกันการยิงดึงข้อมูลซ้ำ ๆ ในช่วงเวลาสั้น ๆ
const memoryCache = {
  devices: { data: null, timestamp: 0 },
  prefixes: { data: null, timestamp: 0 },
  sites: { data: null, timestamp: 0 },
  deviceTypes: { data: null, timestamp: 0 }
};

let cachedCustomFields = null;
async function getAvailableCustomFields() {
  if (cachedCustomFields) return cachedCustomFields;
  try {
    const fields = await fetchAllPages('/extras/custom-fields/');
    // Extract valid custom field names/keys
    cachedCustomFields = fields.map(f => f.name || f.key || '');
    return cachedCustomFields;
  } catch (err) {
    console.warn('⚠️ Failed to fetch custom fields from NetBox:', err.message);
    return [];
  }
}

const CACHE_TTL = 5 * 60 * 1000; // เก็บแคชไว้ 5 นาที เพื่อประสิทธิภาพสูงสุดและความเร็วสูงสุดในการเปิดหน้าเว็บ

/**
 * Shared helper for making NetBox API requests.
 * @param {string} endpoint - The API endpoint path (e.g., '/ipam/prefixes/').
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE).
 * @param {Object|null} [body=null] - Optional request payload.
 * @returns {Promise<Object|string|boolean>} Parsed JSON response, true (for 204), or error string.
 */
async function fetchNetboxApi(endpoint, method = 'GET', body = null) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const options = {
    method,
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, options);

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    // Use generic error format for most CRUD, but some methods might have specific errors in callers
    const error = new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
    error.status = res.status;
    error.text = errText;
    throw error;
  }

  if (res.status === 204) {
    return true;
  }

  return await res.json();
}

/**
 * Fetches a single page of results or object.
 * @param {string} endpointPath - The API endpoint.
 * @returns {Promise<Object>} The API response.
 */
async function getSingle(endpointPath) {
  try {
    return await fetchNetboxApi(endpointPath, 'GET');
  } catch (err) {
    throw new Error(`NetBox API GET single request failed with status ${err.status}: ${err.text || err.message}`);
  }
}

async function fetchAllPages(endpointPath) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  let results = [];
  const separator = endpointPath.includes('?') ? '&' : '?';
  let nextUrl = `${baseUrl}${endpointPath}${separator}limit=1000`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        'Authorization': `Token ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
    }

    const data = await res.json();
    results = results.concat(data.results || []);
    nextUrl = data.next;
  }

  return results;
}

// ==================== DEVICES ====================

/**
 * Retrieves all devices from NetBox, optionally from cache.
 * @returns {Promise<Array>} Array of mapped device objects.
 */
async function getDevices() {
  const now = Date.now();
  // ถ้ามีข้อมูลแคชอยู่และไม่หมดอายุ ให้ดึงจากแคชทันที
  if (memoryCache.devices.data && (now - memoryCache.devices.timestamp < CACHE_TTL)) {
    console.log('⚡ [Cache] Returning cached NetBox devices');
    return memoryCache.devices.data;
  }

  const rawDevices = await fetchAllPages('/dcim/devices/');
  const sitesList = await getSites();
  const sitesMap = new Map(sitesList.map(s => [s.id, s]));
  
  const mapped = rawDevices.map(device => {
    const siteObj = device.site?.id ? sitesMap.get(device.site.id) : null;
    return {
      id: device.id,
      nodeid: device.custom_fields?.nodeid || device.custom_fields?.node_id || '-',
      site_name: siteObj?.site_name && siteObj.site_name !== 'N/A' ? siteObj.site_name : (device.site?.name || 'N/A'),
      name_thai: siteObj?.name_thai || 'N/A',
      region: siteObj?.region || 'N/A',
    name: device.name || 'Unnamed Device',
    status: device.status?.label || device.status?.value || 'Active',
    status_value: device.status?.value || 'active',
    tenant: device.tenant?.name || 'N/A',
    tenant_id: device.tenant?.id || null,
    tenant_group: device.tenant?.group?.name || 'N/A',
    tenant_group_id: device.tenant?.group?.id || null,
    site: device.site?.name || 'N/A',
    site_id: device.site?.id || null,
    location: device.location?.name || 'N/A',
    location_id: device.location?.id || null,
    rack: device.rack?.name || 'N/A',
    rack_id: device.rack?.id || null,
    role: (() => {
      const r = device.role?.name || device.device_role?.name || 'N/A';
      if (r === 'Aggregation Switch') return 'Aggregation';
      if (r === 'LSW') return 'Network';
      return r; // Returns 'Provider Edge', 'Provider' as is
    })(),
    role_name: device.role?.name || device.device_role?.name || 'N/A',
    role_id: device.role?.id || device.device_role?.id || null,
    manufacturer: device.device_type?.manufacturer?.name || 'N/A',
    type: device.device_type?.model || device.device_type?.name || 'N/A',
    device_type_id: device.device_type?.id || null,
    ip: device.primary_ip4?.address || device.primary_ip?.address || 'N/A',
    primary_ip4: device.primary_ip4?.address || '',
    primary_ip6: device.primary_ip6?.address || '',
    oob_ip: device.oob_ip?.address || '',
    description: device.description || 'N/A',
    airflow: device.airflow?.value || device.airflow || '',
    serial: device.serial || '',
    asset_tag: device.asset_tag || '',
    face: device.face?.value || device.face || '',
    position: device.position || '',
    latitude: device.custom_fields?.latitude || '',
    longitude: device.custom_fields?.longitude || '',
    platform: device.platform?.name || 'N/A',
    platform_id: device.platform?.id || null,
    config_template: device.config_template?.name || 'N/A',
    config_template_id: device.config_template?.id || null,
    cluster: device.cluster?.name || 'N/A',
    cluster_id: device.cluster?.id || null,
    virtual_chassis: device.virtual_chassis?.name || device.virtual_chassis?.display || 'N/A',
    virtual_chassis_id: device.virtual_chassis?.id || null,
    vc_position: device.vc_position || '',
    vc_priority: device.vc_priority || '',
    owner_group: device.custom_fields?.owner_group || 'N/A',
    owner: device.custom_fields?.owner || 'N/A',
    tags: device.tags ? device.tags.map(t => typeof t === 'object' ? t.name : t).join(', ') : '',
    local_context_data: device.local_context_data ? JSON.stringify(device.local_context_data, null, 2) : '',
    };
  });

  memoryCache.devices.data = mapped;
  memoryCache.devices.timestamp = now;
  return mapped;
}

// ==================== IPAM & PREFIXES ====================

/**
 * Retrieves all prefixes from NetBox, optionally from cache.
 * @returns {Promise<Array>} Array of mapped prefix objects.
 */
async function getPrefixes() {
  const now = Date.now();
  if (memoryCache.prefixes.data && (now - memoryCache.prefixes.timestamp < CACHE_TTL)) {
    console.log('⚡ [Cache] Returning cached NetBox prefixes');
    return memoryCache.prefixes.data;
  }

  const rawPrefixes = await fetchAllPages('/ipam/prefixes/');
  
  const mapped = rawPrefixes.map(prefix => ({
    id: prefix.id,
    prefix: prefix.prefix,
    status: {
      value: prefix.status?.value || 'active',
      label: prefix.status?.label || 'Active'
    },
    status_value: prefix.status?.value || 'active',
    is_pool: prefix.is_pool || false,
    mark_utilized: prefix.mark_utilized || false,
    vrf: prefix.vrf?.name || 'Global',
    vrf_id: prefix.vrf?.id || null,
    tenant: prefix.tenant?.name || 'N/A',
    tenant_id: prefix.tenant?.id || null,
    tenant_group: prefix.tenant?.group?.name || 'N/A',
    tenant_group_id: prefix.tenant?.group?.id || null,
    site: {
      name: prefix.site?.name || 'N/A',
      id: prefix.site?.id || null
    },
    site_id: prefix.site?.id || null,
    role: prefix.role?.name || 'N/A',
    role_id: prefix.role?.id || null,
    vlan: prefix.vlan ? {
      id: prefix.vlan.id,
      name: prefix.vlan.name,
      vid: prefix.vlan.vid,
      display: prefix.vlan.display
    } : null,
    vlan_id: prefix.vlan?.id || null,
    scope_type: prefix.scope_type || '',
    scope_id: prefix.scope_id || null,
    ringname: prefix.custom_fields?.ringname || 'N/A',
    owner_group: prefix.custom_fields?.owner_group || 'N/A',
    owner: prefix.custom_fields?.owner || 'N/A',
    tags: prefix.tags ? prefix.tags.map(t => typeof t === 'object' ? t.name : t).join(', ') : '',
    custom_fields: prefix.custom_fields || {},
    description: prefix.description || 'N/A',
    last_updated: prefix.last_updated ? new Date(prefix.last_updated).toLocaleString('th-TH') : 'N/A'
  }));

  memoryCache.prefixes.data = mapped;
  memoryCache.prefixes.timestamp = now;
  return mapped;
}

// ==================== SITES & REGIONS ====================

/**
 * Retrieves all sites from NetBox, optionally from cache.
 * @returns {Promise<Array>} Array of mapped site objects.
 */
async function getSites() {
  const now = Date.now();
  if (memoryCache.sites.data && (now - memoryCache.sites.timestamp < CACHE_TTL)) {
    console.log('⚡ [Cache] Returning cached NetBox sites');
    return memoryCache.sites.data;
  }

  const rawSites = await fetchAllPages('/dcim/sites/');
  
  const mapped = rawSites.map(site => ({
    id: site.id,
    name: site.name || 'Unnamed Site',
    name_thai: site.custom_fields?.name_thai || 'N/A',
    site_name: site.custom_fields?.site_name || 'N/A',
    status: site.status?.value || 'active',
    region: site.region?.name || 'N/A',
    group: site.group?.name || 'N/A',
    tenant: site.tenant?.name || 'N/A',
    facility: site.facility || 'N/A',
    description: site.description || 'N/A',
    slug: site.slug || '',
    time_zone: site.time_zone || '',
    physical_address: site.physical_address || '',
    shipping_address: site.shipping_address || '',
    latitude: site.latitude || '',
    longitude: site.longitude || '',
    asns: site.asns?.map(a => a.asn || a).join(', ') || '',
    tags: site.tags?.map(t => typeof t === 'object' ? t.name : t).join(', ') || '',
    tenant_group: site.tenant?.group?.name || 'N/A',
    owner_group: site.custom_fields?.owner_group || 'N/A',
    owner: site.custom_fields?.owner || 'N/A',
    last_updated: site.last_updated ? new Date(site.last_updated).toLocaleString('th-TH') : 'N/A'
  }));

  memoryCache.sites.data = mapped;
  memoryCache.sites.timestamp = now;
  return mapped;
}

/**
 * Retrieves all regions from NetBox, optionally from cache.
 * @returns {Promise<Array>} Array of region objects.
 */
async function getRegions() {
  const now = Date.now();
  if (!memoryCache.regions) {
    memoryCache.regions = { data: null, timestamp: 0 };
  }
  if (memoryCache.regions.data && (now - memoryCache.regions.timestamp < CACHE_TTL)) {
    return memoryCache.regions.data;
  }
  const raw = await fetchAllPages('/dcim/regions/');
  const mapped = raw.map(r => ({ 
    id: r.id, 
    name: r.name, 
    slug: r.slug,
    parent: r.parent ? { id: r.parent.id, name: r.parent.name } : null
  }));
  memoryCache.regions.data = mapped;
  memoryCache.regions.timestamp = now;
  return mapped;
}

/**
 * Retrieves all VRFs from NetBox, optionally from cache.
 * @returns {Promise<Array>} Array of VRF objects.
 */
async function getVrfs() {
  const now = Date.now();
  if (!memoryCache.vrfs) {
    memoryCache.vrfs = { data: null, timestamp: 0 };
  }
  if (memoryCache.vrfs.data && (now - memoryCache.vrfs.timestamp < CACHE_TTL)) {
    console.log('⚡ [Cache] Returning cached NetBox vrfs');
    return memoryCache.vrfs.data;
  }

  const rawVrfs = await fetchAllPages('/ipam/vrfs/');
  
  const mapped = rawVrfs.map(vrf => ({
    id: vrf.id,
    name: vrf.name || 'Unnamed VRF',
    rd: vrf.rd || 'N/A',
    tenant: vrf.tenant?.name || 'N/A',
    description: vrf.description || 'N/A',
    last_updated: vrf.last_updated ? new Date(vrf.last_updated).toLocaleString('th-TH') : 'N/A'
  }));

  memoryCache.vrfs.data = mapped;
  memoryCache.vrfs.timestamp = now;
  return mapped;
}

/**
 * Retrieves all IP addresses from NetBox, optionally from cache.
 * @returns {Promise<Array>} Array of IP address objects.
 */
async function getIpAddresses() {
  const now = Date.now();
  if (!memoryCache.ipAddresses) {
    memoryCache.ipAddresses = { data: null, timestamp: 0 };
  }
  if (memoryCache.ipAddresses.data && (now - memoryCache.ipAddresses.timestamp < CACHE_TTL)) {
    console.log('⚡ [Cache] Returning cached NetBox IP addresses');
    return memoryCache.ipAddresses.data;
  }

  const rawIps = await fetchAllPages('/ipam/ip-addresses/');
  
  const mapped = rawIps.map(ip => ({
    id: ip.id,
    address: ip.address ? ip.address.split('/')[0] : '',
    full_address: ip.address || '',
    status: ip.status?.value || 'active',
    role: ip.role?.value || 'N/A',
    tenant: ip.tenant?.name || 'N/A',
    dns_name: ip.dns_name || '',
    description: ip.description || '',
    interface: ip.assigned_object?.name || 'N/A',
    device: ip.assigned_object?.device?.name || 'N/A',
    device_id: ip.assigned_object?.device?.id || null,
    vrf: ip.vrf?.name || 'Global',
    vrf_id: ip.vrf?.id || null
  }));

  memoryCache.ipAddresses.data = mapped;
  memoryCache.ipAddresses.timestamp = now;
  return mapped;
}

/**
 * Updates a prefix by ID.
 * @param {string|number} id - Prefix ID.
 * @param {Object} data - Update payload.
 * @returns {Promise<Object>} Updated prefix.
 */
async function updatePrefix(id, data) {
  const result = await fetchNetboxApi(`/ipam/prefixes/${id}/`, 'PATCH', data);
  memoryCache.prefixes.data = null;
  return result;
}

/**
 * Creates a new prefix.
 * @param {Object} data - Prefix data.
 * @returns {Promise<Object>} Created prefix.
 */
async function createPrefix(data) {
  const result = await fetchNetboxApi(`/ipam/prefixes/`, 'POST', data);
  memoryCache.prefixes.data = null;
  return result;
}

/**
 * Deletes a prefix by ID.
 * @param {string|number} id - Prefix ID.
 * @returns {Promise<boolean>} True if successful.
 */
async function deletePrefix(id) {
  await fetchNetboxApi(`/ipam/prefixes/${id}/`, 'DELETE');
  memoryCache.prefixes.data = null;
  return true;
}

/**
 * Updates a site by ID.
 * @param {string|number} id - Site ID.
 * @param {Object} data - Update payload.
 * @returns {Promise<Object>} Updated site.
 */
async function updateSite(id, data) {
  const result = await fetchNetboxApi(`/dcim/sites/${id}/`, 'PATCH', data);
  memoryCache.sites.data = null;
  return result;
}

/**
 * Creates a new site.
 * @param {Object} data - Site data.
 * @returns {Promise<Object>} Created site.
 */
async function createSite(data) {
  const result = await fetchNetboxApi(`/dcim/sites/`, 'POST', data);
  memoryCache.sites.data = null;
  return result;
}

/**
 * Deletes a site by ID.
 * @param {string|number} id - Site ID.
 * @returns {Promise<boolean>} True if successful.
 */
async function deleteSite(id) {
  await fetchNetboxApi(`/dcim/sites/${id}/`, 'DELETE');
  memoryCache.sites.data = null;
  return true;
}

async function sanitizeDeviceData(data) {
  if (data.serial === null) data.serial = '';
  if (data.description === null) data.description = '';

  if (data.custom_fields && typeof data.custom_fields === 'object') {
    try {
      const available = await getAvailableCustomFields();
      const cleanCF = {};
      for (const [key, val] of Object.entries(data.custom_fields)) {
        if (available.includes(key) && val !== null) {
          cleanCF[key] = val;
        }
      }
      data.custom_fields = cleanCF;
    } catch (cfErr) {
      data.custom_fields = {};
    }
  }
}

// ==================== INTERFACES ====================

/**
 * Retrieves or creates an interface on a device.
 * @param {string|number} deviceId - The device ID.
 * @param {string} name - The interface name.
 * @param {string} type - The interface type (default 'virtual').
 * @param {string} label - The interface label.
 * @returns {Promise<number>} The interface ID.
 */
async function getOrCreateInterface(deviceId, name, type = 'virtual', label = '') {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;
  
  const searchRes = await fetch(`${baseUrl}/dcim/interfaces/?device_id=${deviceId}&name=${name}`, {
    headers: { 'Authorization': `Token ${token}`, 'Accept': 'application/json' }
  });
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
  }
  
  let templateType = type;
  let templateLabel = label;
  try {
    const devRes = await fetch(`${baseUrl}/dcim/devices/${deviceId}/`, {
      headers: { 'Authorization': `Token ${token}`, 'Accept': 'application/json' }
    });
    if (devRes.ok) {
      const devData = await devRes.json();
      const deviceTypeId = devData.device_type?.id;
      if (deviceTypeId) {
        const templates = await getInterfaceTemplates(deviceTypeId);
        const cleanName = String(name).replace(/\s+/g, '').toLowerCase();
        const match = templates.find(t => String(t.name).replace(/\s+/g, '').toLowerCase() === cleanName);
        if (match) {
          templateType = match.type?.value || match.type || type;
          templateLabel = match.label || label;
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to resolve template for interface ${name}:`, err.message);
  }

  const createRes = await fetch(`${baseUrl}/dcim/interfaces/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      device: deviceId,
      name: name,
      type: templateType,
      ...(templateLabel ? { label: templateLabel } : {})
    })
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create interface ${name}: ${await createRes.text()}`);
  }
  const result = await createRes.json();
  return result.id;
}

/**
 * Retrieves or creates an IP address and assigns it to an interface.
 * @param {string} addressStr - The IP address string.
 * @param {string|number} interfaceId - The interface ID.
 * @returns {Promise<number>} The IP address ID.
 */
async function getOrCreateIPAddress(addressStr, interfaceId) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;
  
  let normalized = addressStr.trim();
  if (!normalized.includes('/')) {
    if (normalized.includes(':')) {
      normalized += '/128';
    } else {
      normalized += '/32';
    }
  }
  
  const searchRes = await fetch(`${baseUrl}/ipam/ip-addresses/?address=${encodeURIComponent(normalized)}`, {
    headers: { 'Authorization': `Token ${token}`, 'Accept': 'application/json' }
  });
  let ipId = null;
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.results && data.results.length > 0) {
      ipId = data.results[0].id;
      const ipObj = data.results[0];
      if (ipObj.assigned_object?.id !== interfaceId) {
        const updateRes = await fetch(`${baseUrl}/ipam/ip-addresses/${ipId}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            assigned_object_type: 'dcim.interface',
            assigned_object_id: interfaceId
          })
        });
        if (!updateRes.ok) {
          console.warn(`Failed to reassign IP ${normalized}:`, await updateRes.text());
        }
      }
      return ipId;
    }
  }
  
  const createRes = await fetch(`${baseUrl}/ipam/ip-addresses/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      address: normalized,
      assigned_object_type: 'dcim.interface',
      assigned_object_id: interfaceId
    })
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create IP Address ${normalized}: ${await createRes.text()}`);
  }
  const result = await createRes.json();
  return result.id;
}

async function handleDeviceIPAssignments(deviceId, primaryIp4, primaryIp6, oobIp) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;
  const patchData = {};
  
  if (primaryIp4 !== undefined) {
    if (primaryIp4 && primaryIp4.trim()) {
      const interfaceId = await getOrCreateInterface(deviceId, 'Loopback0', 'virtual');
      const ipId = await getOrCreateIPAddress(primaryIp4, interfaceId);
      patchData.primary_ip4 = ipId;
    } else {
      patchData.primary_ip4 = null;
    }
  }

  if (primaryIp6 !== undefined) {
    if (primaryIp6 && primaryIp6.trim()) {
      const interfaceId = await getOrCreateInterface(deviceId, 'Loopback0', 'virtual');
      const ipId = await getOrCreateIPAddress(primaryIp6, interfaceId);
      patchData.primary_ip6 = ipId;
    } else {
      patchData.primary_ip6 = null;
    }
  }

  if (oobIp !== undefined) {
    if (oobIp && oobIp.trim()) {
      const interfaceId = await getOrCreateInterface(deviceId, 'Management', 'virtual');
      const ipId = await getOrCreateIPAddress(oobIp, interfaceId);
      patchData.oob_ip = ipId;
    } else {
      patchData.oob_ip = null;
    }
  }

  if (Object.keys(patchData).length > 0) {
    const patchRes = await fetch(`${baseUrl}/dcim/devices/${deviceId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(patchData)
    });
    if (!patchRes.ok) {
      throw new Error(`Failed to assign IPs to device ${deviceId}: ${await patchRes.text()}`);
    }
  }
}

// ==================== DEVICE CRUD ====================

/**
 * Creates a new device in NetBox.
 * @param {Object} data - The device data.
 * @returns {Promise<Object>} The created device object.
 */
async function createDevice(data) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  // แยกฟิลด์สำหรับสร้าง Vlanif และ IP Address ออกจากข้อมูลดีไวซ์หลัก
  const { create_vlanif100, create_vlanif115, primary_ip4, primary_ip6, oob_ip, ...deviceData } = data;

  await sanitizeDeviceData(deviceData);

  const res = await fetch(`${baseUrl}/dcim/devices/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(deviceData)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
  }

  const result = await res.json();
  memoryCache.devices.data = null;

  // จัดการสร้าง/ผูก IP Address กับอุปกรณ์
  await handleDeviceIPAssignments(result.id, primary_ip4, primary_ip6, oob_ip);

  // สร้างอินเตอร์เฟสเสมือน Vlanif100 / Vlanif115 ด้วย type virtual หากมีการระบุ
  const virtualInterfaces = [];
  if (create_vlanif100) {
    virtualInterfaces.push({ device: result.id, name: 'Vlanif100', type: 'virtual' });
  }
  if (create_vlanif115) {
    virtualInterfaces.push({ device: result.id, name: 'Vlanif115', type: 'virtual' });
  }

  if (virtualInterfaces.length > 0) {
    try {
      const vifRes = await fetch(`${baseUrl}/dcim/interfaces/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(virtualInterfaces)
      });
      if (!vifRes.ok) {
        console.warn('⚠️ Failed to create virtual Vlanif interfaces:', await vifRes.text());
      }
    } catch (vifErr) {
      console.warn('⚠️ Error creating virtual Vlanif interfaces:', vifErr.message);
    }
  }

  return result;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

async function createDeviceType(data) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  // Resolve or create manufacturer
  let manufacturerId = data.manufacturer;
  if (typeof data.manufacturer === 'string') {
    const mfgName = data.manufacturer.trim();
    const mfgs = await fetchAllPages('/dcim/manufacturers/');
    const found = mfgs.find(m => m.name.toLowerCase() === mfgName.toLowerCase());
    if (found) {
      manufacturerId = found.id;
    } else {
      // Create new manufacturer
      const mfgSlug = slugify(mfgName) || 'generic';
      const mfgRes = await fetch(`${baseUrl}/dcim/manufacturers/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name: mfgName, slug: mfgSlug })
      });
      if (!mfgRes.ok) {
        const mfgErr = await mfgRes.text();
        throw new Error(`สร้างผู้ผลิต (Manufacturer) ไม่สำเร็จ: ${mfgErr}`);
      }
      const newMfg = await mfgRes.json();
      manufacturerId = newMfg.id;
    }
  }

  const payload = {
    manufacturer: manufacturerId,
    model: data.model,
    slug: data.slug || slugify(`${data.manufacturer}-${data.model}`),
    part_number: data.part_number || '',
    u_height: parseInt(data.u_height) || 1,
    is_full_depth: !!data.is_full_depth
  };

  const res = await fetch(`${baseUrl}/dcim/device-types/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
  }

  const result = await res.json();

  // Create interface templates if clone_device_type_id is specified OR interface_ranges are specified
  const interfaceTemplates = [];

  if (data.clone_device_type_id) {
    try {
      const templatesToClone = await fetchAllPages(`/dcim/interface-templates/?device_type_id=${data.clone_device_type_id}`);
      for (const t of templatesToClone) {
        interfaceTemplates.push({
          device_type: result.id,
          name: t.name,
          type: typeof t.type === 'object' ? t.type.value : t.type || '1000base-t',
          label: t.label || ''
        });
      }
    } catch (cloneErr) {
      console.warn('⚠️ Failed to fetch interface templates for cloning:', cloneErr.message);
    }
  } else if (data.interface_ranges && data.interface_ranges.length > 0) {
    for (const range of data.interface_ranges) {
      const prefix = range.prefix || 'GigabitEthernet';
      const start = parseInt(range.start) !== undefined && !isNaN(parseInt(range.start)) ? parseInt(range.start) : 1;
      const count = parseInt(range.count) || 0;
      const type = range.type || '1000base-t';
      const label = range.label || '';

      for (let i = 0; i < count; i++) {
        const portNum = start + i;
        interfaceTemplates.push({
          device_type: result.id,
          name: `${prefix}${portNum}`,
          type: type,
          label: label
        });
      }
    }
  } else {
    // Fallback to legacy single count
    const interfaceCount = parseInt(data.interface_count) || 0;
    if (interfaceCount > 0) {
      for (let i = 1; i <= interfaceCount; i++) {
        interfaceTemplates.push({
          device_type: result.id,
          name: `GigabitEthernet${i}`,
          type: '1000base-t',
          label: ''
        });
      }
    }
  }

  if (interfaceTemplates.length > 0) {
    try {
      const itRes = await fetch(`${baseUrl}/dcim/interface-templates/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(interfaceTemplates)
      });
      if (!itRes.ok) {
        console.warn('⚠️ Failed to create interface templates for device type:', await itRes.text());
      }
    } catch (itErr) {
      console.warn('⚠️ Error creating interface templates:', itErr.message);
    }
  }

  if (memoryCache.deviceTypes) {
    memoryCache.deviceTypes.data = null;
  }
  return result;
}

async function createInterfaceTemplates(deviceTypeId, data) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const interfaceTemplates = [];

  if (data.interfaces && Array.isArray(data.interfaces)) {
    for (const it of data.interfaces) {
      interfaceTemplates.push({
        device_type: parseInt(deviceTypeId),
        name: it.name,
        type: it.type || '1000base-t',
        label: it.label || ''
      });
    }
  } else {
    // Support both single group and multi ranges (ranges: [{prefix, start, count, type, label}])
    const ranges = data.ranges || [
      {
        prefix: data.prefix || 'GigabitEthernet',
        start: parseInt(data.start) !== undefined && !isNaN(parseInt(data.start)) ? parseInt(data.start) : 1,
        count: parseInt(data.count) || 0,
        type: data.type || '1000base-t',
        label: data.label || ''
      }
    ];

    for (const range of ranges) {
      const prefix = range.prefix || 'GigabitEthernet';
      const start = parseInt(range.start) !== undefined && !isNaN(parseInt(range.start)) ? parseInt(range.start) : 1;
      const count = parseInt(range.count) || 0;
      const type = range.type || '1000base-t';
      const label = range.label || '';

      for (let i = 0; i < count; i++) {
        const portNum = start + i;
        interfaceTemplates.push({
          device_type: parseInt(deviceTypeId),
          name: `${prefix}${portNum}`,
          type: type,
          label: label
        });
      }
    }
  }

  if (interfaceTemplates.length === 0) {
    throw new Error('กรุณาระบุกลุ่มพอร์ตที่ต้องการสร้างอย่างน้อย 1 รายการ');
  }

  const res = await fetch(`${baseUrl}/dcim/interface-templates/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(interfaceTemplates)
  });

  if (!res.ok) {
    const errText = await res.text();
    try {
      const errObj = JSON.parse(errText);
      if (Array.isArray(errObj)) {
        const dupError = errObj.find(e => e && e.__all__ && e.__all__.some(msg => msg.includes('already exists')));
        if (dupError) {
          throw new Error('ไม่สามารถสร้างพอร์ตได้เนื่องจากมีบางพอร์ตที่ระบุ ถูกสร้างขึ้นในรุ่นนี้ไปแล้ว (มีชื่อพอร์ตซ้ำ)');
        }
      }
    } catch (parseErr) {
      if (parseErr.message.includes('มีบางพอร์ตที่ระบุ')) {
        throw parseErr;
      }
    }
    throw new Error(`สร้าง Port Templates ล้มเหลว: ${errText}`);
  }

  const result = await res.json();
  if (memoryCache.deviceTypes) {
    memoryCache.deviceTypes.data = null;
  }
  return result;
}

/**
 * Updates a device by ID.
 * @param {string|number} id - Device ID.
 * @param {Object} data - Update payload.
 * @returns {Promise<Object>} Updated device.
 */
async function updateDevice(id, data) {
  // แยกฟิลด์สำหรับจัดการ IP Address ออกจากข้อมูลดีไวซ์หลัก
  const { primary_ip4, primary_ip6, oob_ip, ...deviceData } = data;

  await sanitizeDeviceData(deviceData);

  const result = await fetchNetboxApi(`/dcim/devices/${id}/`, 'PATCH', deviceData);
  memoryCache.devices.data = null;

  // จัดการสร้าง/ผูก IP Address กับอุปกรณ์
  await handleDeviceIPAssignments(id, primary_ip4, primary_ip6, oob_ip);

  return result;
}

/**
 * Deletes a device by ID.
 * @param {string|number} id - Device ID.
 * @returns {Promise<boolean>} True if successful.
 */
async function deleteDevice(id) {
  await fetchNetboxApi(`/dcim/devices/${id}/`, 'DELETE');
  memoryCache.devices.data = null;
  return true;
}

// Netbox Metadata helpers
async function getDeviceTypes() {
  const now = Date.now();
  if (!memoryCache.deviceTypes) {
    memoryCache.deviceTypes = { data: null, timestamp: 0 };
  }
  if (memoryCache.deviceTypes.data && (now - memoryCache.deviceTypes.timestamp < CACHE_TTL)) {
    return memoryCache.deviceTypes.data;
  }
  const raw = await fetchAllPages('/dcim/device-types/');
  const mapped = raw.map(dt => ({
    id: dt.id,
    manufacturer: dt.manufacturer?.name || 'N/A',
    model: dt.model || dt.name,
    display: `${dt.manufacturer?.name || ''} ${dt.model || dt.name}`.trim(),
    part_number: dt.part_number || 'N/A',
    u_height: dt.u_height || 0,
    is_full_depth: dt.is_full_depth ? 'Yes' : 'No',
    device_count: dt.device_count || 0,
    interface_count: dt.interface_template_count !== undefined 
      ? dt.interface_template_count 
      : (dt.interface_count !== undefined ? dt.interface_count : (dt.interfaces?.length || 0))
  }));
  memoryCache.deviceTypes.data = mapped;
  memoryCache.deviceTypes.timestamp = now;
  return mapped;
}

async function getDeviceRoles() {
  const now = Date.now();
  if (!memoryCache.deviceRoles) {
    memoryCache.deviceRoles = { data: null, timestamp: 0 };
  }
  if (memoryCache.deviceRoles.data && (now - memoryCache.deviceRoles.timestamp < CACHE_TTL)) {
    return memoryCache.deviceRoles.data;
  }
  // Modern Netbox uses /dcim/roles/, older uses /dcim/device-roles/
  let raw = [];
  try {
    raw = await fetchAllPages('/dcim/device-roles/');
  } catch (err) {
    try {
      raw = await fetchAllPages('/dcim/roles/');
    } catch (err2) {
      throw new Error('ไม่สามารถดึงข้อมูล Device Roles ได้จากทั้ง /dcim/device-roles/ และ /dcim/roles/');
    }
  }
  const mapped = raw.map(r => ({ id: r.id, name: r.name, slug: r.slug }));
  memoryCache.deviceRoles.data = mapped;
  memoryCache.deviceRoles.timestamp = now;
  return mapped;
}

async function getTenants() {
  const now = Date.now();
  if (!memoryCache.tenants) {
    memoryCache.tenants = { data: null, timestamp: 0 };
  }
  if (memoryCache.tenants.data && (now - memoryCache.tenants.timestamp < CACHE_TTL)) {
    return memoryCache.tenants.data;
  }
  const raw = await fetchAllPages('/tenancy/tenants/');
  const mapped = raw.map(t => ({ id: t.id, name: t.name, slug: t.slug }));
  memoryCache.tenants.data = mapped;
  memoryCache.tenants.timestamp = now;
  return mapped;
}

async function getLocations() {
  const now = Date.now();
  if (!memoryCache.locations) {
    memoryCache.locations = { data: null, timestamp: 0 };
  }
  if (memoryCache.locations.data && (now - memoryCache.locations.timestamp < CACHE_TTL)) {
    return memoryCache.locations.data;
  }
  const raw = await fetchAllPages('/dcim/locations/');
  const mapped = raw.map(l => ({ id: l.id, name: l.name, slug: l.slug, site: l.site?.id }));
  memoryCache.locations.data = mapped;
  memoryCache.locations.timestamp = now;
  return mapped;
}

async function getRacks() {
  const now = Date.now();
  if (!memoryCache.racks) {
    memoryCache.racks = { data: null, timestamp: 0 };
  }
  if (memoryCache.racks.data && (now - memoryCache.racks.timestamp < CACHE_TTL)) {
    return memoryCache.racks.data;
  }
  const raw = await fetchAllPages('/dcim/racks/');
  const mapped = raw.map(r => ({ id: r.id, name: r.name, site: r.site?.id }));
  memoryCache.racks.data = mapped;
  memoryCache.racks.timestamp = now;
  return mapped;
}

async function getPlatforms() {
  const now = Date.now();
  if (!memoryCache.platforms) {
    memoryCache.platforms = { data: null, timestamp: 0 };
  }
  if (memoryCache.platforms.data && (now - memoryCache.platforms.timestamp < CACHE_TTL)) {
    return memoryCache.platforms.data;
  }
  const raw = await fetchAllPages('/dcim/platforms/');
  const mapped = raw.map(p => ({ id: p.id, name: p.name, slug: p.slug }));
  memoryCache.platforms.data = mapped;
  memoryCache.platforms.timestamp = now;
  return mapped;
}

async function getConfigTemplates() {
  const now = Date.now();
  if (!memoryCache.configTemplates) {
    memoryCache.configTemplates = { data: null, timestamp: 0 };
  }
  if (memoryCache.configTemplates.data && (now - memoryCache.configTemplates.timestamp < CACHE_TTL)) {
    return memoryCache.configTemplates.data;
  }
  let raw = [];
  try {
    raw = await fetchAllPages('/extras/config-templates/');
  } catch (err) {
    try {
      raw = await fetchAllPages('/dcim/config-templates/');
    } catch (err2) {
      console.log('⚠️ Failed to load config templates from both routes, returning empty');
    }
  }
  const mapped = raw.map(ct => ({ id: ct.id, name: ct.name }));
  memoryCache.configTemplates.data = mapped;
  memoryCache.configTemplates.timestamp = now;
  return mapped;
}

async function getClusters() {
  const now = Date.now();
  if (!memoryCache.clusters) {
    memoryCache.clusters = { data: null, timestamp: 0 };
  }
  if (memoryCache.clusters.data && (now - memoryCache.clusters.timestamp < CACHE_TTL)) {
    return memoryCache.clusters.data;
  }
  const raw = await fetchAllPages('/virtualization/clusters/');
  const mapped = raw.map(c => ({ id: c.id, name: c.name }));
  memoryCache.clusters.data = mapped;
  memoryCache.clusters.timestamp = now;
  return mapped;
}

async function getTenantGroups() {
  const now = Date.now();
  if (!memoryCache.tenantGroups) {
    memoryCache.tenantGroups = { data: null, timestamp: 0 };
  }
  if (memoryCache.tenantGroups.data && (now - memoryCache.tenantGroups.timestamp < CACHE_TTL)) {
    return memoryCache.tenantGroups.data;
  }
  const raw = await fetchAllPages('/tenancy/tenant-groups/');
  const mapped = raw.map(tg => ({ id: tg.id, name: tg.name, slug: tg.slug }));
  memoryCache.tenantGroups.data = mapped;
  memoryCache.tenantGroups.timestamp = now;
  return mapped;
}

async function getVirtualChassises() {
  const now = Date.now();
  if (!memoryCache.virtualChassises) {
    memoryCache.virtualChassises = { data: null, timestamp: 0 };
  }
  if (memoryCache.virtualChassises.data && (now - memoryCache.virtualChassises.timestamp < CACHE_TTL)) {
    return memoryCache.virtualChassises.data;
  }
  const raw = await fetchAllPages('/dcim/virtual-chassis/');
  const mapped = raw.map(vc => ({ id: vc.id, name: vc.name || vc.display }));
  memoryCache.virtualChassises.data = mapped;
  memoryCache.virtualChassises.timestamp = now;
  return mapped;
}

async function getTags() {
  const now = Date.now();
  if (!memoryCache.tags) {
    memoryCache.tags = { data: null, timestamp: 0 };
  }
  if (memoryCache.tags.data && (now - memoryCache.tags.timestamp < CACHE_TTL)) {
    return memoryCache.tags.data;
  }
  const raw = await fetchAllPages('/extras/tags/');
  const mapped = raw.map(t => ({ id: t.id, name: t.name, slug: t.slug }));
  memoryCache.tags.data = mapped;
  memoryCache.tags.timestamp = now;
  return mapped;
}

async function getVlans() {
  const now = Date.now();
  if (!memoryCache.vlans) {
    memoryCache.vlans = { data: null, timestamp: 0 };
  }
  if (memoryCache.vlans.data && (now - memoryCache.vlans.timestamp < CACHE_TTL)) {
    return memoryCache.vlans.data;
  }
  const raw = await fetchAllPages('/ipam/vlans/');
  const mapped = raw.map(v => ({
    id: v.id,
    name: v.name,
    vid: v.vid,
    display: `${v.name} (${v.vid})`,
    site: v.site ? v.site.name : '-',
    group: v.group ? v.group.name : '-',
    prefixes: v.prefixes ? v.prefixes.map(p => p.prefix).join(', ') : '-',
    tenant: v.tenant ? v.tenant.name : '-',
    status: v.status ? (typeof v.status === 'object' ? v.status.label : v.status) : '-',
    role: v.role ? v.role.name : '-',
    description: v.description || '-'
  }));
  memoryCache.vlans.data = mapped;
  memoryCache.vlans.timestamp = now;
  return mapped;
}

async function getInterfaceTemplates(deviceTypeId) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const results = await fetchAllPages(`/dcim/interface-templates/?device_type_id=${deviceTypeId}`);
  return results;
}

async function getDeviceInterfaces(deviceId) {
  const results = await fetchAllPages(`/dcim/interfaces/?device_id=${deviceId}`);
  return results;
}

/**
 * Updates an interface by ID.
 * @param {string|number} interfaceId - Interface ID.
 * @param {Object} payload - Update payload.
 * @returns {Promise<Object>} Updated interface.
 */
async function updateInterface(interfaceId, payload) {
  try {
    return await fetchNetboxApi(`/dcim/interfaces/${interfaceId}/`, 'PATCH', payload);
  } catch (err) {
    throw new Error(`NetBox API PATCH request failed with status ${err.status}: ${err.text || err.message}`);
  }
}

async function getInterfaceTypeChoices() {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${baseUrl}/dcim/interfaces/`, {
    method: 'OPTIONS',
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`NetBox API OPTIONS request failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.actions?.POST?.type?.choices || [];
}

// ==================== CABLES ====================

/**
 * Creates a cable connection between two interfaces.
 * @param {string|number} aInterfaceId - The first interface ID.
 * @param {string|number} bInterfaceId - The second interface ID.
 * @returns {Promise<Object|null>} The created cable object, or null if already cabled.
 */
async function createCable(aInterfaceId, bInterfaceId) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${baseUrl}/dcim/cables/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      a_terminations: [{ object_type: 'dcim.interface', object_id: aInterfaceId }],
      b_terminations: [{ object_type: 'dcim.interface', object_id: bInterfaceId }],
      status: 'connected'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('already cabled') || errText.includes('exists') || errText.includes('occupied')) {
      console.log(`Cable already exists or interface occupied between ${aInterfaceId} and ${bInterfaceId}`);
      return null;
    }
    throw new Error(`NetBox API POST cable failed with status ${res.status}: ${errText}`);
  }

  return await res.json();
}

// ==================== VLANS ====================

/**
 * Creates a new VLAN in NetBox.
 * @param {Object} payload - VLAN payload (vid, name, status, role, group, site, description)
 * @returns {Promise<Object>} Created VLAN object.
 */
async function createVlan(payload) {
  try {
    const result = await fetchNetboxApi('/ipam/vlans/', 'POST', payload);
    // เคลียร์ memory cache ของ vlans เพื่อดึงข้อมูลอัปเดตครั้งถัดไป
    if (memoryCache.vlans) {
      memoryCache.vlans.data = null;
    }
    return result;
  } catch (err) {
    throw new Error(`NetBox API POST vlan failed with status ${err.status}: ${err.text || err.message}`);
  }
}

/**
 * Gets a VLAN ID by its VID.
 * @param {string|number} vid - The VLAN ID (VID).
 * @returns {Promise<number|null>} The internal VLAN ID or null.
 */
async function getVlanByVid(vid) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;
  
  const res = await fetch(`${baseUrl}/ipam/vlans/?vid=${vid}&limit=1`, {
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  });
  if (res.ok) {
    const data = await res.json();
    return data.results && data.results.length > 0 ? data.results[0].id : null;
  }
  return null;
}

/**
 * Gets all VLAN roles from NetBox.
 * @returns {Promise<Array>} Array of VLAN role objects.
 */
async function getVlanRoles() {
  const now = Date.now();
  if (!memoryCache.vlanRoles) {
    memoryCache.vlanRoles = { data: null, timestamp: 0 };
  }
  if (memoryCache.vlanRoles.data && (now - memoryCache.vlanRoles.timestamp < CACHE_TTL)) {
    return memoryCache.vlanRoles.data;
  }
  let raw = [];
  try {
    raw = await fetchAllPages('/ipam/roles/');
  } catch (err) {
    try {
      raw = await fetchAllPages('/dcim/roles/');
    } catch (err2) {
      try {
        raw = await fetchAllPages('/dcim/device-roles/');
      } catch (err3) {
        console.warn('⚠️ Failed to fetch VLAN roles from NetBox endpoints:', err3.message);
      }
    }
  }

  let mapped = raw.map(r => ({ id: r.id, name: r.name, slug: r.slug }));

  // ถ้ายังไม่พบข้อมูลจาก Roles API ให้สกัดรายชื่อ Role จากรายการ VLAN ที่มีอยู่จริงใน NetBox สดๆ
  if (mapped.length === 0) {
    try {
      const allVlans = await getVlans();
      const roleMap = new Map();
      allVlans.forEach(v => {
        if (v.role && v.role !== '-') {
          roleMap.set(v.role, { id: v.role, name: v.role, slug: v.role.toLowerCase() });
        }
      });
      mapped = Array.from(roleMap.values());
    } catch (e) {
      console.warn('⚠️ Failed to extract roles from VLAN list:', e.message);
    }
  }

  memoryCache.vlanRoles.data = mapped;
  memoryCache.vlanRoles.timestamp = now;
  return mapped;
}

/**
 * Gets all VLAN groups from NetBox.
 * @returns {Promise<Array>} Array of VLAN group objects.
 */
async function getVlanGroups() {
  const now = Date.now();
  if (!memoryCache.vlanGroups) {
    memoryCache.vlanGroups = { data: null, timestamp: 0 };
  }
  if (memoryCache.vlanGroups.data && (now - memoryCache.vlanGroups.timestamp < CACHE_TTL)) {
    return memoryCache.vlanGroups.data;
  }
  let raw = [];
  try {
    raw = await fetchAllPages('/ipam/vlan-groups/');
  } catch (err) {
    console.warn('⚠️ Failed to fetch VLAN groups from /ipam/vlan-groups/:', err.message);
  }

  let mapped = raw.map(g => ({ id: g.id, name: g.name, slug: g.slug }));

  // ถ้ายังไม่พบข้อมูลจาก API ให้สกัดรายชื่อ Group จากรายการ VLAN ที่มีอยู่จริงใน NetBox สดๆ
  if (mapped.length === 0) {
    try {
      const allVlans = await getVlans();
      const groupMap = new Map();
      allVlans.forEach(v => {
        if (v.group && v.group !== '-') {
          groupMap.set(v.group, { id: v.group, name: v.group, slug: v.group.toLowerCase() });
        }
      });
      mapped = Array.from(groupMap.values());
    } catch (e) {
      console.warn('⚠️ Failed to extract groups from VLAN list:', e.message);
    }
  }

  memoryCache.vlanGroups.data = mapped;
  memoryCache.vlanGroups.timestamp = now;
  return mapped;
}

module.exports = {
  getDevices,
  getPrefixes,
  getSites,
  getVrfs,
  getIpAddresses,
  updatePrefix,
  updateSite,
  createSite,
  getRegions,
  deleteSite,
  createDevice,
  createDeviceType,
  createInterfaceTemplates,
  getInterfaceTemplates,
  updateDevice,
  deleteDevice,
  getDeviceTypes,
  getDeviceRoles,
  getTenants,
  getLocations,
  getRacks,
  // Additional new ones
  getPlatforms,
  getConfigTemplates,
  getClusters,
  getTenantGroups,
  getVirtualChassises,
  getTags,
  // Prefix new ones
  createPrefix,
  deletePrefix,
  getVlans,
  getInterfaceTypeChoices,
  getDeviceInterfaces,
  updateInterface,
  get: fetchAllPages,
  getSingle,
  createCable,
  getVlanByVid,
  getVlanRoles,
  getVlanGroups,
  getOrCreateInterface,
  getOrCreateIPAddress,
  getSanitizedUrl
};
