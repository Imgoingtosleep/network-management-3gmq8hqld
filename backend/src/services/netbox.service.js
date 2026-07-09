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

const CACHE_TTL = 20 * 1000; // เก็บแคชไว้ 20 วินาที เพื่อให้เปลี่ยนหน้าดึงข้อมูลเร็วขึ้นแบบเรียลไทม์

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
    name: device.name || 'Unnamed Device',
    status: {
      value: device.status?.value || 'active',
      label: device.status?.label || 'Active'
    },
    device_role: {
      name: device.role?.name || device.device_role?.name || 'N/A'
    },
    device_type: {
      model: device.device_type?.model || device.device_type?.name || 'N/A',
      manufacturer: device.device_type?.manufacturer?.name || 'N/A'
    },
    primary_ip: {
      address: device.primary_ip?.address || 'N/A'
    },
    site: {
      name: device.site?.name || 'N/A'
    },
    location: device.location?.name || 'N/A',
    rack: device.rack?.name || 'N/A',
    serial: device.serial || 'N/A',
    asset_tag: device.asset_tag || 'N/A',
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
    vrf: prefix.vrf?.name || 'Global',
    tenant: prefix.tenant?.name || 'N/A',
    site: {
      name: prefix.site?.name || 'N/A'
    },
    role: prefix.role?.name || 'N/A',
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
    name: site.name || site.slug || 'Unnamed Site',
    slug: site.slug || 'N/A',
    status: {
      value: site.status?.value || 'active',
      label: site.status?.label || 'Active'
    },
    region: site.region?.name || 'N/A',
    tenant: site.tenant?.name || 'N/A',
    facility: site.facility || 'N/A',
    asn: site.asn || 'N/A',
    physical_address: site.physical_address || 'N/A',
    description: site.description || 'N/A',
    last_updated: site.last_updated ? new Date(site.last_updated).toLocaleString('th-TH') : 'N/A'
  }));

  memoryCache.sites.data = mapped;
  memoryCache.sites.timestamp = now;
  return mapped;
}

module.exports = { getDevices, getPrefixes, getSites };
