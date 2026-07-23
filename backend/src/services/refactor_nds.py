import re

with open('nds.service.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add mapDeviceToNds helper
helper = """
/**
 * Maps a NetBox device object to the format expected by NDS.
 * @param {Object} d - The NetBox device object.
 * @returns {Object} The mapped device object.
 */
function mapDeviceToNds(d) {
  return {
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
  };
}
"""

if "function mapDeviceToNds" not in content:
    content = content.replace("const getAllSites =", helper + "\nconst getAllSites =")

# 2. Refactor getAllPEs
pe_regex = re.compile(r"return filtered\.map\(d => \(\{\s*id: d\.id,.*?last_updated: d\.last_updated \|\| 'N/A'\s*\}\)\);", re.DOTALL)
content = pe_regex.sub("return filtered.map(mapDeviceToNds);", content, count=1)

# 3. Refactor getAllAGGs
agg_regex = re.compile(r"return filtered\.map\(d => \(\{\s*id: d\.id,.*?last_updated: d\.last_updated \|\| 'N/A'\s*\}\)\);", re.DOTALL)
content = agg_regex.sub("return filtered.map(mapDeviceToNds);", content, count=1)

# 4. Refactor getAllLswNts (has extra field 'role')
lsw_regex = re.compile(r"return filtered\.map\(d => \(\{\s*id: d\.id,\s*name: d\.name,\s*role: d\.device_role\?\.name \|\| 'LSW_Network',.*?last_updated: d\.last_updated \|\| 'N/A'\s*\}\)\);", re.DOTALL)
content = lsw_regex.sub("return filtered.map(d => ({ ...mapDeviceToNds(d), role: d.device_role?.name || 'LSW_Network' }));", content, count=1)

with open('nds.service.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("NDS refactored.")
