/**
 * Model ของทีม CDS (Core Design Services)
 * ตอนนี้เป็น in-memory mock data — พร้อมสลับไปใช้ฐานข้อมูลจริงในอนาคต
 */

let cdsProjects = [
  {
    id: 1,
    name: 'Core Router Firmware Upgrade',
    status: 'in_progress',
    owner: 'CDS Team',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Data Center Interconnect Redesign',
    status: 'planned',
    owner: 'CDS Team',
    updatedAt: new Date().toISOString(),
  },
];

async function findAll() {
  return cdsProjects;
}

async function findById(id) {
  return cdsProjects.find((p) => p.id === Number(id)) || null;
}

async function create(payload) {
  const newItem = {
    id: cdsProjects.length ? Math.max(...cdsProjects.map((p) => p.id)) + 1 : 1,
    status: 'planned',
    updatedAt: new Date().toISOString(),
    ...payload,
  };
  cdsProjects.push(newItem);
  return newItem;
}

let cdsDashboardData = [
  {
    pe_name: 'BKK-PE-01',
    ip_loopback: '10.0.0.1',
    model: 'Huawei NetEngine 8000',
    type: 'Core PE',
    pe_port_list: 'Eth-Trunk1, Eth-Trunk2',
    pe_vlan_customer: '101, 102',
    agg_id: 'AGG-BKK-01',
    agg_ip_network: '10.100.1.0/24',
    agg_vlan: '901',
    nw_lsw_id: 'NW-LSW-BKK-01',
    nw_lsw_ip: '10.200.1.1',
    nw_lsw_use_for: 'Core Link',
    nw_lsw_port: 'GE0/0/1',
    access_lsw_id: 'ACC-LSW-BKK-10A',
    access_lsw_model: 'Cisco Catalyst 9300',
    access_lsw_port_uplink: 'Te1/0/1',
    access_lsw_port_customer: 'Gi1/0/1-12',
    access_lsw_ip: '10.200.1.10',
    access_lsw_vlan_management: '99',
  },
  {
    pe_name: 'CNX-PE-02',
    ip_loopback: '10.0.0.2',
    model: 'Cisco ASR 9006',
    type: 'Edge PE',
    pe_port_list: 'TenGigE0/0/0/1',
    pe_vlan_customer: '201, 202, 203',
    agg_id: 'AGG-CNX-02',
    agg_ip_network: '10.100.2.0/24',
    agg_vlan: '902',
    nw_lsw_id: 'NW-LSW-CNX-02',
    nw_lsw_ip: '10.200.2.1',
    nw_lsw_use_for: 'Uplink Distribution',
    nw_lsw_port: 'GE0/0/2',
    access_lsw_id: 'ACC-LSW-CNX-20B',
    access_lsw_model: 'Huawei S5735',
    access_lsw_port_uplink: 'XGigabitEthernet0/0/1',
    access_lsw_port_customer: 'GigabitEthernet0/0/1-24',
    access_lsw_ip: '10.200.2.20',
    access_lsw_vlan_management: '99',
  },
  {
    pe_name: 'HKT-PE-03',
    ip_loopback: '10.0.0.3',
    model: 'Juniper MX204',
    type: 'Core PE',
    pe_port_list: 'xe-0/0/0, xe-0/0/1',
    pe_vlan_customer: '301',
    agg_id: 'AGG-HKT-03',
    agg_ip_network: '10.100.3.0/24',
    agg_vlan: '903',
    nw_lsw_id: 'NW-LSW-HKT-03',
    nw_lsw_ip: '10.200.3.1',
    nw_lsw_use_for: 'Backup Link',
    nw_lsw_port: 'xe-0/0/2',
    access_lsw_id: 'ACC-LSW-HKT-30A',
    access_lsw_model: 'Cisco Catalyst 9200',
    access_lsw_port_uplink: 'Gi1/0/49',
    access_lsw_port_customer: 'Gi1/0/1-48',
    access_lsw_ip: '10.200.3.30',
    access_lsw_vlan_management: '99',
  }
];

async function getDashboardData() {
  return cdsDashboardData;
}

module.exports = { findAll, findById, create, getDashboardData };
