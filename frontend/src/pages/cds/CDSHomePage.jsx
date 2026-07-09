import { useEffect, useState } from 'react';
import { cdsApi } from '../../api/cds.api.js';
import Sidebar from '../../components/Sidebar.jsx';
import StatusCard from '../../components/StatusCard.jsx';

const menuItems = [
  { label: 'ภาพรวม', value: 'overview', path: '/cds', end: true },
  { label: 'โปรเจกต์ (เร็วๆ นี้)', value: 'projects_soon' },
  { label: 'อุปกรณ์ (เร็วๆ นี้)', value: 'devices_soon' },
];

export default function CDSHomePage() {
  return <div className="w-full h-full bg-base-950" />;
}
