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

async function getDevices() {
  const url = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!url || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${url}/dcim/devices/?limit=0`, {
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  
  return (data.results || []).map(device => ({
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
}

async function getPrefixes() {
  const url = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!url || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${url}/ipam/prefixes/?limit=0`, {
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  
  return (data.results || []).map(prefix => ({
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
}

async function getSites() {
  const url = getSanitizedUrl();
  const token = process.env.NETBOX_API_TOKEN;

  if (!url || !token) {
    throw new Error('กรุณาระบุ NETBOX_API_URL และ NETBOX_API_TOKEN ในไฟล์ .env');
  }

  const res = await fetch(`${url}/dcim/sites/?limit=0`, {
    headers: {
      'Authorization': `Token ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Netbox API ส่งคืนค่าผิดพลาดสถานะ ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  
  return (data.results || []).map(site => ({
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
}

module.exports = { getDevices, getPrefixes, getSites };
