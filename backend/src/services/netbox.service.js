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
  sites: { data: null, timestamp: 0 }
};

const CACHE_TTL = 5 * 60 * 1000; // เก็บแคชไว้ 5 นาที เพื่อประสิทธิภาพสูงสุดและความเร็วสูงสุดในการเปิดหน้าเว็บ

// ฟังก์ชันดึงข้อมูลแบบวนลูปทีละหน้าจนกว่าจะหมด เพื่อ bypass ขีดจำกัด MAX_PAGE_SIZE (1000) ของ NetBox
async function fetchAllPages(endpointPath) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  let results = [];
  let nextUrl = `${baseUrl}${endpointPath}?limit=1000`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        'Authorization': `Token ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    results = results.concat(data.results || []);
    nextUrl = data.next;
  }

  return results;
}

async function getDevices() {
  const now = Date.now();
  // ถ้ามีข้อมูลแคชอยู่และไม่หมดอายุ ให้ดึงจากแคชทันที
  if (memoryCache.devices.data && (now - memoryCache.devices.timestamp < CACHE_TTL)) {
    console.log('⚡ [Cache] Returning cached NetBox devices');
    return memoryCache.devices.data;
  }

  const rawDevices = await fetchAllPages('/dcim/devices/');
  
  const mapped = rawDevices.map(device => ({
    id: device.id,
    nodeid: device.custom_fields?.node_id || device.id,
    name: device.name || 'Unnamed Device',
    status: device.status?.label || device.status?.value || 'Active',
    tenant: device.tenant?.name || 'N/A',
    site: device.site?.name || 'N/A',
    location: device.location?.name || 'N/A',
    rack: device.rack?.name || 'N/A',
    role: (() => {
      const r = device.role?.name || device.device_role?.name || 'N/A';
      if (r === 'Aggregation Switch') return 'Aggregation';
      if (r === 'LSW') return 'Network';
      return r; // Returns 'Provider Edge', 'Provider' as is
    })(),
    manufacturer: device.device_type?.manufacturer?.name || 'N/A',
    type: device.device_type?.model || device.device_type?.name || 'N/A',
    ip: device.primary_ip?.address || 'N/A',
    description: device.description || 'N/A',
    last_updated: device.last_updated ? new Date(device.last_updated).toLocaleString('th-TH') : 'N/A'
  }));

  memoryCache.devices.data = mapped;
  memoryCache.devices.timestamp = now;
  return mapped;
}

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
    is_pool: prefix.is_pool || false,
    vrf: prefix.vrf?.name || 'Global',
    tenant: prefix.tenant?.name || 'N/A',
    site: {
      name: prefix.site?.name || 'N/A'
    },
    role: prefix.role?.name || 'N/A',
    vlan: prefix.vlan ? {
      id: prefix.vlan.id,
      name: prefix.vlan.name,
      vid: prefix.vlan.vid,
      display: prefix.vlan.display
    } : null,
    custom_fields: prefix.custom_fields || {},
    description: prefix.description || 'N/A',
    last_updated: prefix.last_updated ? new Date(prefix.last_updated).toLocaleString('th-TH') : 'N/A'
  }));

  memoryCache.prefixes.data = mapped;
  memoryCache.prefixes.timestamp = now;
  return mapped;
}

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

async function getRegions() {
  const now = Date.now();
  if (!memoryCache.regions) {
    memoryCache.regions = { data: null, timestamp: 0 };
  }
  if (memoryCache.regions.data && (now - memoryCache.regions.timestamp < CACHE_TTL)) {
    return memoryCache.regions.data;
  }
  const raw = await fetchAllPages('/dcim/regions/');
  const mapped = raw.map(r => ({ id: r.id, name: r.name, slug: r.slug }));
  memoryCache.regions.data = mapped;
  memoryCache.regions.timestamp = now;
  return mapped;
}

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
    address: ip.address ? ip.address.split('/')[0] : ''
  }));

  memoryCache.ipAddresses.data = mapped;
  memoryCache.ipAddresses.timestamp = now;
  return mapped;
}

async function updatePrefix(id, data) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${baseUrl}/ipam/prefixes/${id}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
  }

  const result = await res.json();
  memoryCache.prefixes.data = null;
  return result;
}

async function updateSite(id, data) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${baseUrl}/dcim/sites/${id}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
  }

  const result = await res.json();
  memoryCache.sites.data = null;
  return result;
}

async function createSite(data) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${baseUrl}/dcim/sites/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
  }

  const result = await res.json();
  memoryCache.sites.data = null;
  return result;
}

async function deleteSite(id) {
  const baseUrl = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${baseUrl}/dcim/sites/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${errText}`);
  }

  memoryCache.sites.data = null;
  return true;
}

module.exports = { getDevices, getPrefixes, getSites, getVrfs, getIpAddresses, updatePrefix, updateSite, createSite, getRegions, deleteSite };
