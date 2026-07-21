/**
 * Model ของทีม CDS (Customer Design Service)
 * ตอนนี้เป็น in-memory mock data — พร้อมสลับไปใช้ฐานข้อมูลจริงในอนาคต
 */

let cdsProjects = [];

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
    pe_name: 'PE-BKK-01',
    ip_loopback: '10.0.0.1',
    model: 'Cisco ASR9001',
    type: 'Provider Edge',
    pe_port_list: 'GigabitEthernet0/0/1',
    pe_vlan_customer: '100',
    agg_id: 'AGG-BKK-01',
    agg_ip_network: '10.100.1.0/24',
    agg_vlan: '100',
    nw_lsw_id: 'NW-LSW-BKK-01',
    nw_lsw_ip: '10.100.1.2',
    nw_lsw_use_for: 'Office Network',
    nw_lsw_port: 'GigabitEthernet0/1',
    access_lsw_id: 'BKK-SW-01',
    access_lsw_model: 'Cisco C9200L-24T-4G',
    access_lsw_port_uplink: 'GigabitEthernet0/1',
    access_lsw_port_customer: 'GigabitEthernet0/2-24',
    access_lsw_ip: '10.100.1.10',
    access_lsw_vlan_management: '99',
  },
  {
    pe_name: 'PE-CNX-02',
    ip_loopback: '10.0.0.2',
    model: 'Cisco ASR9006',
    type: 'Provider Edge',
    pe_port_list: 'GigabitEthernet0/1/2',
    pe_vlan_customer: '200',
    agg_id: 'AGG-CNX-02',
    agg_ip_network: '10.200.1.0/24',
    agg_vlan: '200',
    nw_lsw_id: 'NW-LSW-CNX-02',
    nw_lsw_ip: '10.200.1.2',
    nw_lsw_use_for: 'Wireless Network',
    nw_lsw_port: 'GigabitEthernet0/2',
    access_lsw_id: 'CNX-SW-02',
    access_lsw_model: 'Huawei S5735-L24T4S-A',
    access_lsw_port_uplink: 'GigabitEthernet0/1',
    access_lsw_port_customer: 'GigabitEthernet0/2-24',
    access_lsw_ip: '10.200.1.10',
    access_lsw_vlan_management: '99',
  }
];

async function getDashboardData() {
  return cdsDashboardData;
}

async function addDashboardItem(item) {
  cdsDashboardData.unshift(item);
  return item;
}

module.exports = { findAll, findById, create, getDashboardData, addDashboardItem };
