const cdsModel = require('../models/cds.model');
const netboxService = require('./netbox.service');

/**
 * Direct 100% Port of NetOps Portal (backend/app/api/v1/endpoints/topology.py & switches.py)
 */

async function getAllProjects() {
  return cdsModel.findAll();
}

async function getProjectById(id) {
  return cdsModel.findById(id);
}

async function createProject(data) {
  return cdsModel.create(data);
}

async function getDashboardData() {
  return cdsModel.getDashboardData();
}

// ==================== RESOLVE HELPERS ====================

/**
 * ค้นหา ID แรกจาก NetBox API response
 * @returns {number|null} ID ที่พบ หรือ null
 */
async function resolveFirstId(endpoint) {
  const resp = await netboxService.get(endpoint);
  return resp && resp.length > 0 ? resp[0].id : null;
}

/**
 * ค้นหา Device Type ID จากชื่อ Model LSW
 * ลำดับค้นหา: ชื่อเต็ม → ตัดผู้ผลิตออก → ค้นแบบกว้าง (q) → fallback ตัวแรก
 */
async function resolveDeviceTypeId(modelName) {
  if (modelName) {
    // 1. ค้นหาตรงจากชื่อเต็ม
    let id = await resolveFirstId(`/dcim/device-types/?model=${encodeURIComponent(modelName)}&limit=1`);
    if (id) return id;

    // 2. ตัดคำแรก (ผู้ผลิต) ออก เช่น "Juniper EX2300-24T" → "EX2300-24T"
    if (modelName.includes(' ')) {
      const cleanModel = modelName.split(' ').slice(1).join(' ');
      id = await resolveFirstId(`/dcim/device-types/?model=${encodeURIComponent(cleanModel)}&limit=1`);
      if (id) return id;
    }

    // 3. ค้นแบบกว้าง
    id = await resolveFirstId(`/dcim/device-types/?q=${encodeURIComponent(modelName)}&limit=1`);
    if (id) return id;
  }

  // 4. Fallback: ใช้ Device Type ตัวแรกที่มี
  return resolveFirstId('/dcim/device-types/?limit=1');
}

/**
 * ค้นหา Device Role ID สำหรับ LSW_Access
 * ลำดับค้นหา: ชื่อตรง → ค้นกว้าง → keyword fallback → ตัวแรก
 */
async function resolveRoleId() {
  try {
    let id = await resolveFirstId('/dcim/device-roles/?name=LSW_Access&limit=1');
    if (id) return id;

    id = await resolveFirstId('/dcim/device-roles/?q=lsw_access&limit=1');
    if (id) return id;
  } catch (err) {
    console.warn('⚠️ Failed to resolve LSW_Access role in NetBox:', err.message);
  }

  // Fallback: ค้นจาก keyword
  for (const keyword of ['lsw', 'access', 'switch']) {
    const id = await resolveFirstId(`/dcim/device-roles/?q=${keyword}&limit=1`);
    if (id) return id;
  }

  return resolveFirstId('/dcim/device-roles/?limit=1');
}

/**
 * ค้นหา Site ID สำหรับ Customer
 * ลำดับค้นหา: ชื่อตรง → ค้นกว้าง → ตัวแรก
 */
async function resolveSiteId() {
  try {
    let id = await resolveFirstId('/dcim/sites/?name=Customer&limit=1');
    if (id) return id;

    id = await resolveFirstId('/dcim/sites/?q=customer&limit=1');
    if (id) return id;
  } catch (err) {
    console.warn('⚠️ Failed to resolve Customer site in NetBox:', err.message);
  }

  return resolveFirstId('/dcim/sites/?limit=1');
}

/**
 * ค้นหา Device จาก NetBox ด้วยชื่อหรือ NodeID
 */
async function findDeviceByNameOrNodeId(identifier) {
  const allDevs = await netboxService.getDevices();
  return allDevs.find(d =>
    String(d.name).toLowerCase() === String(identifier).toLowerCase() ||
    String(d.nodeid || d.custom_fields?.nodeid || '').toLowerCase() === String(identifier).toLowerCase()
  ) || null;
}

/**
 * สร้าง Device ใน NetBox หรือดึง ID ของ Device ที่มีอยู่แล้ว (กรณีชื่อซ้ำ)
 */
async function createOrGetDevice(payload, nodeName) {
  try {
    const result = await netboxService.createDevice(payload);
    console.log('NetBox Device Created Successfully:', result.id);
    return result;
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('400')) {
      console.warn('⚠️ LSW Access device already exists. Attempting to retrieve existing device ID...');
      const existing = await findDeviceByNameOrNodeId(nodeName);
      if (existing) {
        console.log(`Resolved existing LSW Access device ID: ${existing.id}`);
        return { id: existing.id };
      }
    }
    throw err;
  }
}

// ==================== RESERVE SUB-STEPS ====================

/**
 * ขั้นตอนที่ 1.5: สร้าง Vlanif interface + ผูก IP Address เป็น Primary IP ของ Device
 */
async function setupVlanifAndPrimaryIp(deviceId, item) {
  if (!deviceId || !item.agg_vlan) return;

  try {
    const vlanifName = `Vlanif${item.agg_vlan}`;
    const vlanifId = await netboxService.getOrCreateInterface(deviceId, vlanifName, 'virtual');
    console.log(`Created virtual interface ${vlanifName} (ID: ${vlanifId}) on LSW Access Device`);

    if (!item.access_lsw_ip || item.access_lsw_ip === '-' || item.access_lsw_ip === '') return;

    const baseUrl = netboxService.getSanitizedUrl();
    const token = process.env.NETBOX_API_TOKEN;

    // ตรวจหา Subnet mask จาก IP Network (เช่น 10.99.101.0/24 → /24)
    let prefixLength = '24';
    if (item.agg_ip_network && item.agg_ip_network.includes('/')) {
      prefixLength = item.agg_ip_network.split('/')[1].split(' ')[0];
    }

    const cleanIp = item.access_lsw_ip.split('/')[0];
    const ipWithMask = `${cleanIp}/${prefixLength}`;

    const ipId = await netboxService.getOrCreateIPAddress(ipWithMask, vlanifId);

    await fetch(`${baseUrl}/dcim/devices/${deviceId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ primary_ip4: ipId })
    });
    console.log(`Successfully assigned primary IP ${ipWithMask} to virtual interface ${vlanifName}`);
  } catch (err) {
    console.error('❌ Failed to create Vlanif interface or assign management IP:', err.message);
  }
}

/**
 * อัปเดตสถานะพอร์ตเป็น reserve พร้อม label และ description
 * @param {number} deviceId - ID ของ Device ใน NetBox
 * @param {string[]} portNames - ชื่อพอร์ตที่ต้องอัปเดต
 * @param {string} deviceLabel - ชื่อ Device สำหรับ log
 * @returns {Object} map ของ portName → interfaceId (สำหรับนำไปใช้ต่อ)
 */
async function reservePorts(deviceId, portNames, deviceLabel) {
  const ifaceMap = {};
  const ports = portNames.filter(Boolean);
  if (!deviceId || ports.length === 0) return ifaceMap;

  try {
    for (const portName of ports) {
      const ifaceId = await netboxService.getOrCreateInterface(deviceId, portName, 'other');
      await netboxService.updateInterface(ifaceId, {
        label: 'Fiber',
        description: 'In Reserve',
        custom_fields: { port_status: 'reserve' }
      });
      ifaceMap[portName] = ifaceId;
      console.log(`Updated ${deviceLabel} interface ${portName} → port_status='reserve', label='Fiber', description='In Reserve'`);
    }
  } catch (err) {
    console.error(`❌ Failed to update ${deviceLabel} interfaces status:`, err.message);
  }
  return ifaceMap;
}

/**
 * ขั้นตอนที่ 4: สร้าง Cable เชื่อมต่อ + ตั้งค่า VLAN
 * @param {Object} accessIfaceMap - map ของ portName → ifaceId ฝั่ง LSW Access
 * @param {Object} networkIfaceMap - map ของ portName → ifaceId ฝั่ง LSW Network
 */
async function setupCablingAndVlan(item, accessIfaceMap, networkIfaceMap) {
  const accessMainId = accessIfaceMap[item.access_lsw_port_uplink] || null;
  const accessBackupId = accessIfaceMap[item.access_lsw_port_uplink_backup] || null;
  const networkMainId = networkIfaceMap[item.nw_lsw_port] || null;
  const networkBackupId = networkIfaceMap[item.nw_lsw_port_backup] || null;

  if (!accessMainId && !accessBackupId && !networkMainId && !networkBackupId) return;

  try {
    // VLAN Config
    let vlanDbId = null;
    if (item.agg_vlan) {
      vlanDbId = await netboxService.getVlanByVid(item.agg_vlan);
    }

    if (vlanDbId) {
      const allIfaceIds = [accessMainId, accessBackupId, networkMainId, networkBackupId].filter(Boolean);
      for (const ifaceId of allIfaceIds) {
        await netboxService.updateInterface(ifaceId, { mode: 'access', untagged_vlan: vlanDbId });
        console.log(`Configured VLAN ${item.agg_vlan} on interface ID ${ifaceId}`);
      }
    }

    // Cable Links
    if (accessMainId && networkMainId) {
      await netboxService.createCable(accessMainId, networkMainId);
      console.log(`Established Main Cable Link: LSW Access (ID ${accessMainId}) <---> LSW Network (ID ${networkMainId})`);
    }
    if (accessBackupId && networkBackupId) {
      await netboxService.createCable(accessBackupId, networkBackupId);
      console.log(`Established Backup Cable Link: LSW Access (ID ${accessBackupId}) <---> LSW Network (ID ${networkBackupId})`);
    }
  } catch (err) {
    console.error('❌ Failed to establish cabling connections between LSW Access & LSW Network:', err.message);
  }
}

/**
 * ขั้นตอนที่ 5: อัปเดต PE Port → reserve
 */
async function reservePePort(item) {
  if (!item.pe_name || !item.pe_port_list || item.pe_port_list === 'Logical') return;

  try {
    const peDevice = await findDeviceByNameOrNodeId(item.pe_name);
    if (peDevice && peDevice.id) {
      const ifaceId = await netboxService.getOrCreateInterface(peDevice.id, item.pe_port_list, 'other');
      await netboxService.updateInterface(ifaceId, {
        custom_fields: { port_status: 'reserve' }
      });
      console.log(`Updated PE Device (${item.pe_name}) interface ${item.pe_port_list} port_status to 'reserve'`);
    } else {
      console.warn(`⚠️ PE device ${item.pe_name} not found in NetBox`);
    }
  } catch (err) {
    console.error('❌ Failed to update PE interfaces status:', err.message);
  }
}

// ==================== MAIN FUNCTION ====================

async function addDashboardData(item) {
  try {
    // Resolve NetBox IDs
    const deviceTypeId = await resolveDeviceTypeId(item.access_lsw_model);
    const roleId = await resolveRoleId();
    const siteId = await resolveSiteId();

    console.log('addDashboardData - NetBox resolution audit:', {
      access_lsw_model: item.access_lsw_model,
      deviceTypeId,
      type: item.type,
      roleId,
      siteCode: item.siteCode,
      siteId
    });

    if (!deviceTypeId || !roleId || !siteId) {
      console.warn('⚠️ Missing NetBox mapping parameters (DeviceType, Role or Site ID), skipping real NetBox creation.');
      return cdsModel.addDashboardItem(item);
    }

    // 1. สร้าง Device (LSW Access) ใน NetBox
    console.log(`Creating NetBox Device Name: ${item.nodeName}, Type ID: ${deviceTypeId}, Role ID: ${roleId}, Site ID: ${siteId}`);
    const netboxResult = await createOrGetDevice({
      name: item.nodeName,
      device_type: deviceTypeId,
      role: roleId,
      site: siteId,
      status: 'planned',
      custom_fields: { nodeid: item.nodeId || '' }
    }, item.nodeName);

    item.netbox_device_id = netboxResult.id;
    const accessDeviceId = netboxResult.id;

    // 1.5 สร้าง Vlanif + ผูก IP
    await setupVlanifAndPrimaryIp(accessDeviceId, item);

    // 2. อัปเดต Port Uplink บน LSW Access → reserve
    const accessIfaceMap = await reservePorts(
      accessDeviceId,
      [item.access_lsw_port_uplink, item.access_lsw_port_uplink_backup],
      'LSW Access'
    );

    // 3. ค้นหา LSW Network Device + อัปเดต Port Downlink → reserve
    let networkIfaceMap = {};
    let targetNwDevice = null;
    if (item.nw_lsw_id) {
      targetNwDevice = await findDeviceByNameOrNodeId(item.nw_lsw_id);
      if (targetNwDevice && targetNwDevice.id) {
        networkIfaceMap = await reservePorts(
          targetNwDevice.id,
          [item.nw_lsw_port, item.nw_lsw_port_backup],
          `LSW Network (${item.nw_lsw_id})`
        );
      } else {
        console.warn(`⚠️ LSW Network device ${item.nw_lsw_id} not found in NetBox`);
      }
    }

    // 4. Cabling + VLAN Config (ใช้ ifaceId ที่ cache ไว้จากขั้นตอน 2-3)
    if (accessDeviceId && targetNwDevice?.id) {
      await setupCablingAndVlan(item, accessIfaceMap, networkIfaceMap);
    }

    // 5. อัปเดต PE Port → reserve
    await reservePePort(item);

  } catch (nbErr) {
    console.error('❌ Failed to integrate and create LSW Access Device in NetBox:', nbErr.message);
  }

  return cdsModel.addDashboardItem(item);
}

// ==================== NETOPS HELPER FUNCTIONS ====================

/**
 * Gets active connections for a given device.
 * @param {string|number} deviceId - The device ID.
 * @returns {Promise<Array>} Array of connection objects.
 */
async function getActiveConnections(deviceId) {
  try {
    if (!deviceId) return [];
    const ifacesResp = await netboxService.get(`/dcim/interfaces/?device_id=${deviceId}&limit=200`);
    const ifaces = ifacesResp || [];
    const tempConns = [];
    const peerIds = new Set();

    ifaces.forEach((iface) => {
      (iface.link_peers || []).forEach((p) => {
        const pDev = p.device || {};
        if (pDev.id) {
          peerIds.add(pDev.id);
          tempConns.push({
            local_port: iface.name,
            local_description: iface.description || '',
            remote_id: pDev.id,
            remote_device: pDev.display || pDev.name || 'Unknown',
            remote_port: p.display || p.name || 'Unknown',
          });
        }
      });
    });

    const peerRoles = {};
    if (peerIds.size > 0) {
      const peerIdArr = Array.from(peerIds);
      for (const pid of peerIdArr) {
        try {
          const devDetail = await netboxService.getSingle(`/dcim/devices/${pid}/`);
          peerRoles[pid] = devDetail?.role?.name || devDetail?.device_role?.name || 'Unknown';
        } catch (e) {
          peerRoles[pid] = 'Unknown';
        }
      }
    }

    return tempConns.map((c) => ({
      local_port: c.local_port,
      local_description: c.local_description,
      remote_device: c.remote_device,
      remote_port: c.remote_port,
      remote_role: peerRoles[c.remote_id] || 'Unknown',
    }));
  } catch (err) {
    console.error(`Error in getActiveConnections for ${deviceId}:`, err.message);
    return [];
  }
}

/**
 * Finds the physical interface corresponding to a logical interface or VLAN.
 * @param {string|number} deviceId - The device ID.
 * @param {Object} logicalIfaceObj - The logical interface object.
 * @param {number|string} vlanId - The VLAN ID.
 * @param {Array} [allIfaces=null] - Pre-fetched array of interfaces (optional).
 * @returns {Promise<Object|null>} The physical interface object or null.
 */
async function findPhysicalInterface(deviceId, logicalIfaceObj, vlanId, allIfaces = null) {
  try {
    if (!deviceId) return null;
    if (!allIfaces) {
      allIfaces = await netboxService.get(`/dcim/interfaces/?device_id=${deviceId}&limit=200`);
    }

    const logicalName = logicalIfaceObj?.name || 'Unknown';

    // 1. Match by parent ID
    const parentId = typeof logicalIfaceObj?.parent === 'object' ? logicalIfaceObj.parent?.id : null;
    if (parentId) {
      const target = (allIfaces || []).find((i) => i.id === parentId);
      if (target) return target;
    }

    // 2. Fallback to name stripping (xe-0/0/0.115 -> xe-0/0/0)
    if (logicalName.includes('.')) {
      const pname = logicalName.split('.')[0];
      const pIface = (allIfaces || []).find((i) => i.name === pname);
      if (pIface) return pIface;
    }

    // 3. Match by VLAN and connection
    if (vlanId && vlanId !== '-') {
      const vidNum = parseInt(vlanId, 10);
      for (const iface of allIfaces || []) {
        const typeVal = iface.type?.value || '';
        if (typeVal === 'virtual' || typeVal === 'loopback') continue;

        const untaggedVid = iface.untagged_vlan?.vid;
        const taggedVids = (iface.tagged_vlans || []).map((v) => (typeof v === 'object' ? v.vid : null));
        const isOn = untaggedVid === vidNum || taggedVids.includes(vidNum);

        if (isOn && iface.link_peers && iface.link_peers.length > 0) {
          return iface;
        }
      }
    }

    // 3.5 Fallback to any physical interface with link peers
    for (const iface of allIfaces || []) {
      const typeVal = iface.type?.value || '';
      if (typeVal === 'virtual' || typeVal === 'loopback') continue;
      if (iface.link_peers && iface.link_peers.length > 0) {
        return iface;
      }
    }

    return null;
  } catch (err) {
    console.error(`Error in findPhysicalInterface for ${deviceId}:`, err.message);
    return null;
  }
}

const deviceRoleCache = {};

/**
 * Finds the gateway IP object from a list of IPs.
 * @param {Array} gatewayIps - Array of IP address objects.
 * @returns {Promise<Object|null>} The gateway IP object or null.
 */
async function findGatewayIp(gatewayIps) {
  for (const gwIpObj of gatewayIps) {
    const assigned = gwIpObj.assigned_object;
    if (assigned && gwIpObj.assigned_object_type === 'dcim.interface') {
      const devId = assigned.device?.id;
      if (devId) {
        let roleName = deviceRoleCache[devId];
        if (!roleName) {
          try {
            const devDetail = await netboxService.getSingle(`/dcim/devices/${devId}/`);
            roleName = (devDetail?.role?.name || devDetail?.device_role?.name || '').toLowerCase();
            deviceRoleCache[devId] = roleName;
          } catch (e) {
            roleName = '';
          }
        }
        if (['pe', 'edge', 'router'].some((r) => roleName.includes(r))) {
          return gwIpObj;
        }
      }
    }
  }

  for (const gwIpObj of gatewayIps) {
    const assigned = gwIpObj.assigned_object;
    if (assigned && gwIpObj.assigned_object_type === 'dcim.interface' && assigned.parent) {
      return gwIpObj;
    }
  }

  for (const gwIpObj of gatewayIps) {
    const assigned = gwIpObj.assigned_object;
    if (assigned && gwIpObj.assigned_object_type === 'dcim.interface' && assigned.type?.value === 'virtual') {
      return gwIpObj;
    }
  }

  for (const gwIpObj of gatewayIps) {
    if ((gwIpObj.tags || []).some((t) => t.slug === 'gateway')) {
      return gwIpObj;
    }
  }

  for (const gwIpObj of gatewayIps) {
    if (gwIpObj.assigned_object) {
      return gwIpObj;
    }
  }

  return null;
}

// ==================== NETOPS PATH TRACE (pe_agg_trace) ====================

/**
 * Traces the path from an IP address or Node ID up to the PE router.
 * @param {string} ip - The input IP address or Node ID.
 * @returns {Promise<Object>} The path trace result.
 */
async function getPathTrace(ip = '') {
  try {
    const queryStr = ip.trim();
    if (!queryStr) {
      return { success: false, message: 'กรุณาระบุ IP Address หรือ Node ID' };
    }

    let searchTarget = queryStr;
    let inputType = 'ip';

    if (/^\d+$/.test(queryStr)) {
      const nodeSearchResp = await netboxService.get(`/dcim/devices/?name__isw=${queryStr}&limit=1`);
      const nodeResults = nodeSearchResp || [];
      if (nodeResults.length > 0) {
        const targetDevice = nodeResults[0];
        const primaryIp = targetDevice.primary_ip?.address;
        if (primaryIp) {
          searchTarget = primaryIp;
          inputType = 'node_id';
        } else {
          return { success: false, message: `Device ${targetDevice.name} (Node ID ${queryStr}) found, but has no Primary IP configured.` };
        }
      } else {
        return { success: false, message: `Node ID ${queryStr} not found in NetBox` };
      }
    }

    const cleanIp = searchTarget.split('/')[0];
    let inputIpResp = await netboxService.get(`/ipam/ip-addresses/?address=${encodeURIComponent(searchTarget)}&limit=1`);
    if (!inputIpResp || inputIpResp.length === 0) {
      inputIpResp = await netboxService.get(`/ipam/ip-addresses/?address=${encodeURIComponent(cleanIp)}&limit=1`);
    }
    if (!inputIpResp || inputIpResp.length === 0) {
      inputIpResp = await netboxService.get(`/ipam/ip-addresses/?q=${encodeURIComponent(cleanIp)}&limit=5`);
    }

    let inputIpData = inputIpResp || [];
    if (inputIpData.length > 1) {
      inputIpData = inputIpData.filter((i) => i.address.split('/')[0] === cleanIp);
    }

    if (inputIpData.length === 0) {
      return { success: false, message: `IP Address ${queryStr} not found in NetBox` };
    }

    const targetIpObj = inputIpData[0];

    let subnet = '-';
    let vlanId = '-';
    let vlanName = '-';

    const prefixResp = await netboxService.get(`/ipam/prefixes/?contains=${encodeURIComponent(cleanIp)}&limit=1`);
    const prefixResults = prefixResp || [];

    if (prefixResults.length > 0) {
      const prefixObj = prefixResults[0];
      subnet = prefixObj.prefix;
      if (prefixObj.vlan) {
        vlanId = prefixObj.vlan.vid || '-';
        vlanName = prefixObj.vlan.name || '-';
      }
    } else {
      subnet = targetIpObj.address;
    }

    let sourceDeviceInfo = null;
    const assignedSrc = targetIpObj.assigned_object;

    if (assignedSrc && targetIpObj.assigned_object_type === 'dcim.interface' && assignedSrc.device?.id) {
      const ifaceName = (assignedSrc.name || '').toLowerCase();
      if (ifaceName.includes('vlanif115')) {
        vlanId = 115;
        vlanName = 'Vlanif115';
      } else if (ifaceName.includes('vlanif100')) {
        vlanId = 100;
        vlanName = 'Vlanif100';
      }

      const srcFull = await netboxService.getSingle(`/dcim/devices/${assignedSrc.device.id}/`);
      const srcPhys = await findPhysicalInterface(srcFull.id, assignedSrc, vlanId);

      sourceDeviceInfo = {
        name: srcFull.name || srcFull.display,
        role: srcFull.role?.name || srcFull.device_role?.name || 'Unknown',
        status: srcFull.status?.label || srcFull.status || '-',
        site: srcFull.site?.name || '-',
        model: srcFull.device_type?.model || '-',
        manufacturer: srcFull.device_type?.manufacturer?.name || '-',
        platform: srcFull.platform?.name || '-',
        serial: srcFull.serial || '-',
        asset_tag: srcFull.asset_tag || '-',
        rack: srcFull.rack?.display || '-',
        position: srcFull.position || '-',
        tenant: srcFull.tenant?.name || '-',
        description: srcFull.description || '-',
        primary_ip: srcFull.primary_ip?.address ? srcFull.primary_ip.address.split('/')[0] : '-',
        logical_interface: assignedSrc.name || 'Unknown',
        physical_interface: srcPhys ? srcPhys.name : '-',
        connections: await getActiveConnections(srcFull.id),
      };

      const srcRoleLower = (sourceDeviceInfo.role || '').toLowerCase();
      if (srcRoleLower.includes('edge') || srcRoleLower.includes('router') || srcRoleLower.includes('pe')) {
        return { success: false, message: `Search by PE IP (${queryStr}) is restricted. Please search using a Source Device (LSW) IP instead.` };
      }
    }

    if (subnet === '-') {
      return { success: false, message: `Could not determine subnet for ${cleanIp}` };
    }

    const gatewayIpsResp = await netboxService.get(`/ipam/ip-addresses/?parent=${encodeURIComponent(subnet)}&limit=50`);
    const gatewayIps = gatewayIpsResp || [];
    const gwObj = await findGatewayIp(gatewayIps);

    if (!gwObj) {
      return { success: false, message: `No gateway IP assigned to any device in subnet ${subnet}` };
    }

    const assignedGw = gwObj.assigned_object;
    if (!assignedGw || gwObj.assigned_object_type !== 'dcim.interface' || !assignedGw.device?.id) {
      return { success: false, message: 'Gateway IP is not assigned to a device interface' };
    }

    const peDevice = await netboxService.getSingle(`/dcim/devices/${assignedGw.device.id}/`);
    const pePhys = await findPhysicalInterface(peDevice.id, assignedGw, vlanId);

    let aggDeviceInfo = null;
    if (pePhys) {
      const peers = pePhys.link_peers || [];
      let selectedPeer = null;
      for (const p of peers) {
        if (p.device?.id) {
          try {
            const pDev = await netboxService.getSingle(`/dcim/devices/${p.device.id}/`);
            const pRole = (pDev.role?.name || pDev.device_role?.name || '').toLowerCase();
            if (pRole.includes('agg') || pRole.includes('dist')) {
              selectedPeer = p;
              break;
            }
          } catch (e) {}
        }
      }

      if (!selectedPeer && peers.length > 0) {
        selectedPeer = peers[0];
      }

      if (selectedPeer && selectedPeer.device?.id) {
        const aggDevice = await netboxService.getSingle(`/dcim/devices/${selectedPeer.device.id}/`);
        const aggRole = (aggDevice.role?.name || aggDevice.device_role?.name || '').toLowerCase();

        if (aggRole.includes('agg') || aggRole.includes('dist')) {
          const aggIpsResp = await netboxService.get(`/ipam/ip-addresses/?device_id=${aggDevice.id}&limit=100`);
          const aggIps = aggIpsResp || [];
          const aggSubIps = aggIps.filter((ipObj) => ipObj.address.startsWith(subnet.split('.')[0]));

          aggDeviceInfo = {
            name: aggDevice.name || aggDevice.display,
            port: selectedPeer.display || selectedPeer.name,
            port_ip: aggSubIps.length > 0 ? aggSubIps[0].address : (aggDevice.primary_ip?.address || '-'),
            subnet_members: aggSubIps.map((i) => ({ interface: i.assigned_object?.name || '-', ip: i.address, description: i.description || '-' })),
            status: aggDevice.status?.label || aggDevice.status || '-',
            site: aggDevice.site?.name || '-',
            model: aggDevice.device_type?.model || '-',
            manufacturer: aggDevice.device_type?.manufacturer?.name || '-',
            serial: aggDevice.serial || '-',
            primary_ip: aggDevice.primary_ip?.address ? aggDevice.primary_ip.address.split('/')[0] : '-',
            tenant: aggDevice.tenant?.name || '-',
            connections: await getActiveConnections(aggDevice.id),
          };
        }
      }
    }

    // Fetch port-status for source device if exists
    let portStatusData = null;
    if (sourceDeviceInfo && cleanIp) {
      try {
        const ifacesResp = await netboxService.get(`/dcim/interfaces/?device_id=${assignedSrc.device.id}&limit=1000`);
        const ifacesList = ifacesResp || [];
        const brokenPorts = [];
        const vacantPorts = [];
        const occupiedPorts = [];

        for (const iface of ifacesList) {
          const ifaceType = (iface.type?.value || iface.type || '').toLowerCase();
          if (['virtual', 'loopback', 'bridge', 'lag'].some((x) => ifaceType.includes(x))) continue;

          const descRaw = (iface.description || '').trim();
          const descLower = descRaw.toLowerCase();

          if (!descRaw || descRaw === '-') {
            vacantPorts.push({ id: iface.id, name: iface.name, description: '-', status: 'Vacant' });
          } else if (descLower.includes('fail')) {
            brokenPorts.push({ id: iface.id, name: iface.name, description: iface.description, status: 'Broken' });
          } else {
            occupiedPorts.push({ id: iface.id, name: iface.name, description: iface.description, status: 'Occupied' });
          }
        }

        portStatusData = {
          device_name: sourceDeviceInfo.name,
          device_id: assignedSrc.device.id,
          summary: {
            total_analyzed: vacantPorts.length + brokenPorts.length + occupiedPorts.length,
            vacant_count: vacantPorts.length,
            broken_count: brokenPorts.length,
            occupied_count: occupiedPorts.length,
          },
          vacant: vacantPorts,
          broken: brokenPorts,
          occupied: occupiedPorts,
        };
      } catch (psErr) {
        console.error('Port status error:', psErr.message);
      }
    }

    return {
      success: true,
      input: { ip: cleanIp, subnet: subnet, vlan: `${vlanId} (${vlanName})` },
      source_device: sourceDeviceInfo,
      pe: {
        name: peDevice.name || peDevice.display,
        role: peDevice.role?.name || peDevice.device_role?.name || 'Unknown',
        gateway: gwObj.address,
        logical_interface: assignedGw.name,
        physical_interface: pePhys ? pePhys.name : '-',
        physical_interface_description: pePhys?.description || '-',
        status: peDevice.status?.label || peDevice.status || '-',
        site: peDevice.site?.name || '-',
        model: peDevice.device_type?.model || '-',
        manufacturer: peDevice.device_type?.manufacturer?.name || '-',
        serial: peDevice.serial || '-',
        primary_ip: peDevice.primary_ip?.address ? peDevice.primary_ip.address.split('/')[0] : '-',
        connections: await getActiveConnections(peDevice.id),
      },
      agg: aggDeviceInfo,
      port_status: portStatusData,
    };
  } catch (err) {
    console.error('PE-AGG Trace Error:', err);
    throw err;
  }
}

// ==================== NETOPS SITE TOPOLOGY (site-topology) ====================

/**
 * Retrieves the topology of a site based on its site code.
 * @param {string} siteCode - The site code or slug.
 * @returns {Promise<Object>} The site topology object containing devices, links, and gateways.
 */
async function getSiteTopology(siteCode = '') {
  try {
    const query = siteCode.trim().toLowerCase();
    if (!query) {
      return { success: false, message: 'กรุณาระบุ Site Code' };
    }

    let siteResp = await netboxService.get(`/dcim/sites/?slug=${encodeURIComponent(query)}&limit=1`);
    let siteResults = siteResp || [];
    if (siteResults.length === 0) {
      siteResp = await netboxService.get(`/dcim/sites/?name=${encodeURIComponent(query)}&limit=1`);
      siteResults = siteResp || [];
    }
    if (siteResults.length === 0) {
      siteResp = await netboxService.get(`/dcim/sites/?q=${encodeURIComponent(query)}&limit=1`);
      siteResults = siteResp || [];
    }

    if (siteResults.length === 0) {
      return { success: false, message: `Site '${siteCode}' not found in NetBox.` };
    }

    const siteObj = siteResults[0];
    const siteId = siteObj.id;
    const siteName = siteObj.name;
    const siteSlug = siteObj.slug;

    const devicesResp = await netboxService.get(`/dcim/devices/?site_id=${siteId}&limit=1000`);
    const devicesList = devicesResp || [];

    const devicesMap = {};
    const devicesData = [];

    devicesList.forEach((dev) => {
      const devId = dev.id;
      const roleName = dev.role?.name || dev.device_role?.name || 'Unknown';
      const devInfo = {
        id: devId,
        name: dev.name || dev.display || `Device-${devId}`,
        role: roleName,
        status: dev.status?.label || dev.status || '-',
        primary_ip: dev.primary_ip?.address ? dev.primary_ip.address.split('/')[0] : '-',
        model: dev.device_type?.model || '-',
        manufacturer: dev.device_type?.manufacturer?.name || '-',
        site: siteName,
        is_external: false,
      };
      devicesMap[devId] = devInfo;
      devicesData.push(devInfo);
    });

    const links = [];
    const seenLinks = new Set();
    const gatewaysDict = {};

    const traceDeviceVlan = async (dev) => {
      const devId = dev.id;
      try {
        const ipsResp = await netboxService.get(`/ipam/ip-addresses/?device_id=${devId}&limit=100`);
        const ips = ipsResp || [];

        let targetIpObj = ips.find((ip) => (ip.assigned_object?.name || '').toLowerCase().includes('vlanif115'));
        if (!targetIpObj) {
          targetIpObj = ips.find((ip) => (ip.assigned_object?.name || '').toLowerCase().includes('vlanif100'));
        }
        if (!targetIpObj) {
          targetIpObj = ips.find((ip) => ip.assigned_object);
        }

        if (targetIpObj) {
          const address = targetIpObj.address;
          const cleanIp = address.split('/')[0];
          const vlanId = (targetIpObj.assigned_object?.name || '').includes('115') ? 115 : 100;

          const prefixResp = await netboxService.get(`/ipam/prefixes/?contains=${encodeURIComponent(cleanIp)}&limit=1`);
          const prefixResults = prefixResp || [];
          const subnet = prefixResults.length > 0 ? prefixResults[0].prefix : '-';

          if (subnet !== '-') {
            const ipsInSubnetResp = await netboxService.get(`/ipam/ip-addresses/?parent=${encodeURIComponent(subnet)}&limit=50`);
            const gatewayIps = ipsInSubnetResp || [];
            const gwObj = await findGatewayIp(gatewayIps);

            if (gwObj && gwObj.assigned_object?.device?.id) {
              const assignedGw = gwObj.assigned_object;
              const peDeviceId = assignedGw.device.id;

              const peDevice = await netboxService.getSingle(`/dcim/devices/${peDeviceId}/`);
              const peRole = peDevice.role?.name || peDevice.device_role?.name || 'Unknown';
              const gwIp = gwObj.address ? gwObj.address.split('/')[0] : '-';
              const gwSiteName = peDevice.site?.name || '-';
              const gwSiteId = peDevice.site?.id;

              gatewaysDict[peDeviceId] = {
                id: peDeviceId,
                name: peDevice.name || peDevice.display,
                ip: gwIp,
                interface: assignedGw.name,
                site: gwSiteName,
              };

              if (!devicesMap[peDeviceId]) {
                const extPeInfo = {
                  id: peDeviceId,
                  name: peDevice.name || peDevice.display,
                  role: peRole,
                  status: peDevice.status?.label || peDevice.status || '-',
                  primary_ip: peDevice.primary_ip?.address ? peDevice.primary_ip.address.split('/')[0] : '-',
                  model: peDevice.device_type?.model || '-',
                  manufacturer: peDevice.device_type?.manufacturer?.name || '-',
                  site: gwSiteName,
                  is_external: gwSiteId !== siteId,
                };
                devicesMap[peDeviceId] = extPeInfo;
                devicesData.push(extPeInfo);
              }

              const pePhys = await findPhysicalInterface(peDeviceId, assignedGw, vlanId);
              if (pePhys) {
                const peers = pePhys.link_peers || [];
                let selectedPeer = null;
                for (const p of peers) {
                  if (p.device?.id) {
                    const pDev = await netboxService.getSingle(`/dcim/devices/${p.device.id}/`);
                    const pRole = (pDev.role?.name || pDev.device_role?.name || '').toLowerCase();
                    if (pRole.includes('agg') || pRole.includes('dist')) {
                      selectedPeer = p;
                      break;
                    }
                  }
                }
                if (!selectedPeer && peers.length > 0) selectedPeer = peers[0];

                if (selectedPeer && selectedPeer.device?.id) {
                  let aggDeviceId = selectedPeer.device.id;
                  let aggDevice = await netboxService.getSingle(`/dcim/devices/${aggDeviceId}/`);
                  let aggRole = aggDevice.role?.name || aggDevice.device_role?.name || 'Unknown';
                  let aggSiteName = aggDevice.site?.name || '-';
                  let aggSiteId = aggDevice.site?.id;

                  if (!devicesMap[aggDeviceId]) {
                    const extAggInfo = {
                      id: aggDeviceId,
                      name: aggDevice.name || aggDevice.display,
                      role: aggRole,
                      status: aggDevice.status?.label || aggDevice.status || '-',
                      primary_ip: aggDevice.primary_ip?.address ? aggDevice.primary_ip.address.split('/')[0] : '-',
                      model: aggDevice.device_type?.model || '-',
                      manufacturer: aggDevice.device_type?.manufacturer?.name || '-',
                      site: aggSiteName,
                      is_external: aggSiteId !== siteId,
                    };
                    devicesMap[aggDeviceId] = extAggInfo;
                    devicesData.push(extAggInfo);
                  }

                  if (devId !== aggDeviceId) {
                    const linkKey1 = [devId, aggDeviceId].sort().join('-');
                    if (!seenLinks.has(linkKey1)) {
                      seenLinks.add(linkKey1);
                      links.push({
                        source: devId,
                        source_name: devicesMap[devId].name,
                        source_port: targetIpObj.assigned_object?.name,
                        target: aggDeviceId,
                        target_name: devicesMap[aggDeviceId].name,
                        target_port: selectedPeer.name || selectedPeer.display,
                        target_role: aggRole,
                      });
                    }
                  }

                  if (aggDeviceId !== peDeviceId) {
                    const linkKey2 = [aggDeviceId, peDeviceId].sort().join('-');
                    if (!seenLinks.has(linkKey2)) {
                      seenLinks.add(linkKey2);
                      links.push({
                        source: aggDeviceId,
                        source_name: devicesMap[aggDeviceId].name,
                        source_port: selectedPeer.name || selectedPeer.display,
                        target: peDeviceId,
                        target_name: devicesMap[peDeviceId].name,
                        target_port: pePhys.name,
                        target_role: peRole,
                      });
                    }
                  }
                }
              } else {
                if (devId !== peDeviceId) {
                  const linkKey = [devId, peDeviceId].sort().join('-');
                  if (!seenLinks.has(linkKey)) {
                    seenLinks.add(linkKey);
                    links.push({
                      source: devId,
                      source_name: devicesMap[devId].name,
                      source_port: targetIpObj.assigned_object?.name,
                      target: peDeviceId,
                      target_name: devicesMap[peDeviceId].name,
                      target_port: 'Logical',
                      target_role: peRole,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (ex) {
        console.error(`Error tracing device ${devId} VLAN:`, ex.message);
      }
    };

    if (devicesList.length > 0) {
      await Promise.all(
        devicesList
          .filter((dev) => !['edge', 'router'].some((r) => (dev.role?.name || dev.device_role?.name || '').toLowerCase().includes(r)))
          .map((dev) => traceDeviceVlan(dev))
      );
    }

    const addPhysicalLinks = async (dId, dInfo) => {
      try {
        const conns = await getActiveConnections(dId);
        for (const c of conns) {
          const remoteName = c.remote_device;
          const remoteDev = devicesData.find((d) => d.name === remoteName);
          if (remoteDev && dId !== remoteDev.id) {
            const linkKey = [dId, remoteDev.id].sort().join('-');
            if (!seenLinks.has(linkKey)) {
              seenLinks.add(linkKey);
              links.push({
                source: dId,
                source_name: dInfo.name,
                source_port: c.local_port,
                target: remoteDev.id,
                target_name: remoteDev.name,
                target_port: c.remote_port,
                target_role: remoteDev.role,
              });
            }
          }
        }
      } catch (e) {
        console.error(`Error checking physical links for ${dId}:`, e.message);
      }
    };

    if (Object.keys(devicesMap).length > 0) {
      await Promise.all(Object.entries(devicesMap).map(([k, v]) => addPhysicalLinks(k, v)));
    }

    return {
      success: true,
      site: {
        id: siteId,
        name: siteName,
        slug: siteSlug,
      },
      devices: devicesData,
      links: links,
      gateways: Object.values(gatewaysDict),
    };
  } catch (err) {
    console.error('Site Topology Error:', err);
    throw err;
  }
}

// ==================== NETOPS DEVICE DETAILS ====================

/**
 * Retrieves detailed information for a specific device.
 * @param {string|number} deviceId - The device ID.
 * @returns {Promise<Object>} Detailed device information.
 */
async function getDeviceDetails(deviceId) {
  try {
    const allDevs = await netboxService.getDevices();
    const devFull = allDevs.find((d) => String(d.id) === String(deviceId));
    if (!devFull) {
      return { success: false, message: `Device ID ${deviceId} not found` };
    }

    const conns = await getActiveConnections(devFull.id);
    let gwInfo = null;

    if (devFull.ip && devFull.ip !== 'N/A') {
      const cleanIp = devFull.ip.split('/')[0];
      const prefixResp = await netboxService.get(`/ipam/prefixes/?contains=${encodeURIComponent(cleanIp)}&limit=1`);
      const prefixResults = prefixResp || [];
      const subnet = prefixResults.length > 0 ? prefixResults[0].prefix : '-';

      if (subnet !== '-') {
        const ipsInSubnetResp = await netboxService.get(`/ipam/ip-addresses/?parent=${encodeURIComponent(subnet)}&limit=50`);
        const gatewayIps = ipsInSubnetResp || [];
        const gwObj = await findGatewayIp(gatewayIps);

        if (gwObj && gwObj.assigned_object?.device?.id) {
          const peDeviceId = gwObj.assigned_object.device.id;
          const peDevice = allDevs.find((d) => String(d.id) === String(peDeviceId));
          gwInfo = {
            id: peDeviceId,
            name: peDevice?.name || gwObj.assigned_object.device.name,
            ip: gwObj.address ? gwObj.address.split('/')[0] : '-',
            interface: gwObj.assigned_object.name,
            site: peDevice?.site_name || peDevice?.site || '-',
            assigned_gw: gwObj.assigned_object,
          };
        }
      }
    }

    // Fetch REAL IP Networks (Prefixes) from NetBox for this VRF/site
    let ipNetworks = [];
    const peNameFull = gwInfo?.name || devFull.pe_name || '';
    const vrfCode = peNameFull ? (peNameFull.includes('_') ? peNameFull.split('_')[0] : peNameFull) : '';

    try {
      const vrfsResp = vrfCode ? await netboxService.get(`/ipam/vrfs/?q=${encodeURIComponent(vrfCode)}&limit=10`) : [];
      let targetVrfId = null;
      if (Array.isArray(vrfsResp) && vrfsResp.length > 0) {
        targetVrfId = vrfsResp[0].id;
      }

      const queryUrl = targetVrfId
        ? `/ipam/prefixes/?vrf_id=${targetVrfId}&limit=1000`
        : devFull.site
        ? `/ipam/prefixes/?site=${encodeURIComponent(devFull.site)}&limit=1000`
        : `/ipam/prefixes/?limit=1000`;

      const sitePrefixesResp = await netboxService.get(queryUrl);
      if (Array.isArray(sitePrefixesResp) && sitePrefixesResp.length > 0) {
        ipNetworks = sitePrefixesResp.map((p) => {
          const vid = p.vlan ? (typeof p.vlan === 'object' ? (p.vlan.vid || p.vlan.name || p.vlan.display || '') : p.vlan) : '';
          return `${p.prefix}${vid ? ` (VLAN ${vid})` : ''}`;
        });
      }
    } catch (pErr) {
      console.warn('Error fetching NetBox VRF prefixes:', pErr);
    }

    // Resolve Aggregation device for the site using physical links as in site topology
    let aggDeviceName = null;
    
    if (gwInfo && gwInfo.assigned_gw && gwInfo.id) {
      try {
        const vlanId = devFull.name.includes('115') ? 115 : 100;
        const pePhys = await findPhysicalInterface(gwInfo.id, gwInfo.assigned_gw, vlanId);
        if (pePhys && pePhys.link_peers) {
          for (const p of pePhys.link_peers) {
            if (p.device?.id) {
              const pDev = allDevs.find((d) => String(d.id) === String(p.device.id));
              const pRole = (pDev?.role_name || pDev?.role || '').toLowerCase();
              if (pRole.includes('agg') || pRole.includes('dist') || pDev?.name?.toUpperCase().includes('AGG')) {
                aggDeviceName = pDev.name;
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error finding AGG via physical connections:', err.message);
      }
    }

    if (!aggDeviceName) {
      // Find Aggregation device in the same site from NetBox devices list
      const siteAggs = allDevs.filter(
        (d) =>
          ((d.site_id === devFull.site_id && devFull.site_id !== null) ||
           (d.site && devFull.site && d.site.toLowerCase() === devFull.site.toLowerCase()) ||
           (d.site_name && devFull.site_name && d.site_name.toLowerCase() === devFull.site_name.toLowerCase())) &&
          ((d.role_name && d.role_name.toLowerCase().includes('agg')) ||
            (d.role && d.role.toLowerCase().includes('agg')) ||
            (d.name && d.name.toUpperCase().includes('AGG')))
      );

      if (siteAggs.length > 0) {
        aggDeviceName = siteAggs[0].name;
      } else if (devFull.site && devFull.site !== 'N/A') {
        aggDeviceName = `85002_EMX-${devFull.site.toUpperCase()}-AGG`; // fallback format
      }
    }

    let matchedSubnet = '';
    let matchedRingName = '';

    if (aggDeviceName) {
      const aggDevFull = allDevs.find((d) => d.name === aggDeviceName);
      if (aggDevFull && aggDevFull.ip && aggDevFull.ip !== 'N/A') {
        const aggCleanIp = aggDevFull.ip.split('/')[0];
        try {
          const prefixResp = await netboxService.get(`/ipam/prefixes/?contains=${encodeURIComponent(aggCleanIp)}&limit=1`);
          const prefixResults = prefixResp || [];
          if (prefixResults.length > 0) {
            const p = prefixResults[0];
            const vid = p.vlan ? (typeof p.vlan === 'object' ? (p.vlan.vid || p.vlan.name || p.vlan.display || '') : p.vlan) : '';
            matchedSubnet = `${p.prefix}${vid ? ` (VLAN ${vid})` : ''}`;
            matchedRingName = p.custom_fields?.ringname || p.ringname || '';
          }
        } catch (pErr) {
          console.warn('Error fetching NetBox prefix containing AGG IP:', pErr);
        }
      }
    }

    const details = {
      id: devFull.id,
      name: devFull.name,
      role: devFull.role_name || devFull.role || 'Unknown',
      status: devFull.status || 'Active',
      site: devFull.site_name || devFull.site || '-',
      model: devFull.type || '-',
      manufacturer: devFull.manufacturer || '-',
      platform: devFull.platform || '-',
      serial: devFull.serial || '-',
      asset_tag: devFull.asset_tag || '-',
      rack: devFull.rack || '-',
      position: devFull.position || '-',
      tenant: devFull.tenant || '-',
      description: devFull.description || '-',
      primary_ip: devFull.ip !== 'N/A' ? devFull.ip.split('/')[0] : '-',
      connections: conns,
      gateway: gwInfo,
      aggregation: aggDeviceName,
      ip_networks: ipNetworks,
      matched_subnet: matchedSubnet,
      matched_ring_name: matchedRingName,
    };

    return { success: true, device: details };
  } catch (err) {
    console.error(`Error fetching device details for ${deviceId}:`, err);
    return { success: false, message: err.message };
  }
}

/**
 * Retrieves available IPs for a given prefix.
 * @param {string} prefixStr - The prefix string (e.g., '192.168.1.0/24').
 * @returns {Promise<Object>} Object containing the success status and available IPs.
 */
async function getAvailableIps(prefixStr) {
  try {
    if (!prefixStr) return { success: false, available_ips: [] };
    const cleanPrefix = prefixStr.split(' ')[0].trim();

    // ค้นหา Gateway IP ของ Subnet นี้จาก IP Addresses ที่ผูกกับอินเตอร์เฟสของ PE/Router
    let gatewayIp = '';
    let assignedIps = [];
    try {
      const assignedResp = await netboxService.get(`/ipam/ip-addresses/?parent=${encodeURIComponent(cleanPrefix)}&limit=1000`);
      assignedIps = assignedResp || [];
      const gwObj = await findGatewayIp(assignedIps);
      if (gwObj && gwObj.address) {
        gatewayIp = gwObj.address.split('/')[0];
      }
    } catch (gwErr) {
      console.warn('Error determining gateway IP for prefix:', gwErr.message);
    }

    if (!gatewayIp) {
      // Fallback: คำนวณ Gateway จาก Subnet Base IP + 1 (เช่น 172.30.201.192/26 -> 172.30.201.193)
      const ipPart = cleanPrefix.split('/')[0];
      const parts = ipPart.split('.');
      if (parts.length === 4) {
        const lastOctet = parseInt(parts[3], 10);
        gatewayIp = `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet + 1}`;
      } else if (parts.length === 3) {
        gatewayIp = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
      }
    }

    // 1. ค้นหา Prefix ID จาก NetBox เพื่อดึง IP ที่ว่าง
    try {
      const prefixObjResp = await netboxService.get(`/ipam/prefixes/?prefix=${encodeURIComponent(cleanPrefix)}&limit=1`);
      if (Array.isArray(prefixObjResp) && prefixObjResp.length > 0 && prefixObjResp[0].id) {
        const prefixId = prefixObjResp[0].id;
        const availResp = await netboxService.getSingle(`/ipam/prefixes/${prefixId}/available-ips/`);
        if (Array.isArray(availResp) && availResp.length > 0) {
          const ips = availResp.map((item) => (typeof item === 'object' && item.address ? item.address.split('/')[0] : String(item)));
          return { success: true, prefix: cleanPrefix, available_ips: ips, gateway_ip: gatewayIp };
        }
      }
    } catch (apiErr) {
      console.warn('NetBox native available-ips endpoint warning:', apiErr.message);
    }

    // 2. Fallback: ดึงรายการ IP Address ที่ถูกใช้งานแล้วใน NetBox (Assigned IPs)
    const assignedIpSet = new Set();
    assignedIps.forEach((ipObj) => {
      if (ipObj.address) {
        assignedIpSet.add(ipObj.address.split('/')[0]);
      }
    });

    // 3. กรองเฉพาะ IP Address ที่ยังไม่เคยถูกสร้าง/แจกจ่ายใน NetBox
    const match = cleanPrefix.match(/(\d+\.\d+\.\d+)\.\d+/);
    if (match) {
      const basePrefix = match[1];
      const freeIps = [];
      for (let host = 2; host <= 254; host++) {
        const candidate = `${basePrefix}.${host}`;
        if (!assignedIpSet.has(candidate)) {
          freeIps.push(candidate);
          if (freeIps.length >= 50) break;
        }
      }
      return { success: true, prefix: cleanPrefix, available_ips: freeIps, gateway_ip: gatewayIp };
    }

    return { success: false, available_ips: [], gateway_ip: gatewayIp };
  } catch (err) {
    console.error('Error getting available IPs for prefix:', err);
    return { success: false, available_ips: [], gateway_ip: '' };
  }
}

/**
 * อัปเดตข้อมูล VLAN บน Dashboard และซิงก์ NetBox ทั้งหมด (Vlanif, Interfaces, Untagged VLAN)
 * @param {string} id - Identifier ของ Dashboard item
 * @param {Object} vlanData - ข้อมูล VLAN ที่ต้องการอัปเดต
 */
async function updateDashboardVlan(id, vlanData) {
  const updates = {
    pe_vlan_customer: vlanData.pe_vlan_customer,
    agg_vlan: vlanData.agg_vlan,
    access_lsw_vlan_management: vlanData.access_lsw_vlan_management
  };
  
  // ลบฟิลด์ที่เป็น undefined
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
  
  const updatedItem = await cdsModel.updateDashboardItem(id, updates);
  if (!updatedItem) return null;

  // ค้นหา NetBox Device ID ถ้ายังไม่มีในตัวแปร (เช่น อุปกรณ์สร้างไว้ก่อนหน้า)
  let deviceId = updatedItem.netbox_device_id;
  if (!deviceId) {
    const foundDev = await findDeviceByNameOrNodeId(updatedItem.access_lsw_id || updatedItem.nodeName || updatedItem.nodeId);
    if (foundDev) {
      deviceId = foundDev.id;
      updatedItem.netbox_device_id = deviceId;
    }
  }

  // ถ้ามี NetBox Device ID ให้ดำเนินการอัปเดตลง NetBox
  if (deviceId) {
    console.log(`📡 [NetBox Sync] Updating VLANs for device ID ${deviceId} (${updatedItem.access_lsw_id || updatedItem.nodeName})`);
    
    // 1. สร้าง/อัปเดต Vlanif + Management IP
    if (updates.agg_vlan) {
      await setupVlanifAndPrimaryIp(deviceId, updatedItem);
    }

    // 2. อัปเดต Untagged VLAN บน Port Uplink ของ LSW Access
    if (updates.agg_vlan) {
      try {
        const vlanDbId = await netboxService.getVlanByVid(updates.agg_vlan);
        if (vlanDbId) {
          const uplinkPorts = [updatedItem.access_lsw_port_uplink, updatedItem.access_lsw_port_uplink_backup].filter(Boolean);
          for (const portName of uplinkPorts) {
            const ifaceId = await netboxService.getOrCreateInterface(deviceId, portName, 'other');
            await netboxService.updateInterface(ifaceId, { mode: 'access', untagged_vlan: vlanDbId });
            console.log(`✅ [NetBox Sync] Updated interface ${portName} on device ${deviceId} to VLAN ${updates.agg_vlan} (ID: ${vlanDbId})`);
          }
        }
      } catch (err) {
        console.error(`❌ [NetBox Sync Error] Failed to update untagged VLAN on interfaces:`, err.message);
      }
    }
  } else {
    console.warn(`⚠️ [NetBox Sync] Could not find matching device in NetBox for ${updatedItem.access_lsw_id || id}, updated dashboard state only.`);
  }
  
  return updatedItem;
}

/**
 * สร้าง VLAN ใหม่ใน NetBox (สร้าง Customer VLAN พร้อมฟิลด์มาตรฐาน NetBox ครบถ้วน)
 */
async function createVlan(data) {
  const payload = {
    vid: parseInt(data.vid, 10),
    name: data.name,
    status: data.status || 'active',
  };

  if (data.role) payload.role = isNaN(data.role) ? data.role : parseInt(data.role, 10);
  if (data.group) payload.group = isNaN(data.group) ? data.group : parseInt(data.group, 10);
  if (data.site) payload.site = isNaN(data.site) ? data.site : parseInt(data.site, 10);
  if (data.tenant) payload.tenant = isNaN(data.tenant) ? data.tenant : parseInt(data.tenant, 10);
  if (data.description) payload.description = data.description;
  if (data.tags && Array.isArray(data.tags)) payload.tags = data.tags;
  if (data.qinq_svlan) payload.qinq_svlan = parseInt(data.qinq_svlan, 10);
  if (data.qinq_cvlan) payload.qinq_cvlan = parseInt(data.qinq_cvlan, 10);

  return await netboxService.createVlan(payload);
}

/**
 * ดึงรายการ VLAN Roles ทั้งหมดจาก NetBox
 */
async function getVlanRoles() {
  return await netboxService.getVlanRoles();
}

async function getVlanGroups() {
  return await netboxService.getVlanGroups();
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  getDashboardData,
  addDashboardData,
  getSiteTopology,
  getPathTrace,
  getDeviceDetails,
  getAvailableIps,
  updateDashboardVlan,
  createVlan,
  getVlanRoles,
  getVlanGroups,
};
