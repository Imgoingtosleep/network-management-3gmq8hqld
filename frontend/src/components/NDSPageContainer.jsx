import { useState, useEffect } from 'react';

export default function NDSPageContainer({ 
  fetchData, 
  fetchLookups = async () => ({}), 
  renderTable, 
  placeholder = "ค้นหาด่วน (เช่น ชื่อ, IP, รุ่น, ไซต์)..." 
}) {
  const [data, setData] = useState([]);
  const [lookups, setLookups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination and Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 50;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setSearchQuery('');

    const load = async () => {
      try {
        const [mainRes, lookupData] = await Promise.all([
          fetchData(),
          fetchLookups()
        ]);
        if (mounted) {
          setData(mainRes.data?.data || mainRes.data || mainRes || []);
          setLookups(lookupData);
        }
      } catch (err) {
        if (mounted) setError('ไม่สามารถเชื่อมต่อดึงข้อมูลหลังบ้านได้');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [fetchData]);

  // Search logic
  const filteredList = (() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter(item => {
      return Object.entries(item).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return Object.values(val).some(nestedVal => 
            nestedVal && String(nestedVal).toLowerCase().includes(query)
          );
        }
        return String(val).toLowerCase().includes(query);
      });
    });
  })();

  // Pagination Helpers
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const renderPagination = () => {
    const totalItems = filteredList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 2) {
          end = 3;
        }
        if (currentPage >= totalPages - 1) {
          start = totalPages - 2;
        }
        
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
      return pages;
    };

    const pageNumbers = getPageNumbers();
    
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 px-5 py-4 border-t border-base-600/30 gap-4">
        <span className="text-xs text-ink-600 font-mono">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </span>
        <div className="flex gap-1.5 items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs rounded border border-base-600 bg-base-900 text-ink-400 hover:bg-base-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === '...') {
              return <span key={`ellipsis-${index}`} className="px-2 text-xs text-ink-600 font-mono">...</span>;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 text-xs rounded border transition-all ${
                  currentPage === pageNum
                    ? 'border-nds bg-nds/20 text-nds font-semibold'
                    : 'border-base-600 bg-base-900 text-ink-400 hover:bg-base-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs rounded border border-base-600 bg-base-900 text-ink-400 hover:bg-base-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
          ⚠️ {error}
        </div>
      )}

      {!loading && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-800/40 p-4 rounded-xl border border-base-600/50">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-base-600 bg-base-950 px-3.5 py-2 pl-9 text-xs text-ink-100 placeholder-ink-500 focus:border-nds focus:outline-none focus:ring-1 focus:ring-nds"
            />
            <span className="absolute left-3 top-2.5 text-xs opacity-60">🔍</span>
          </div>
          <div className="text-xs text-ink-400 font-mono">
            ข้อมูลทั้งหมด: <span className="text-nds font-bold text-sm mx-1">{data.length}</span> รายการ
            {searchQuery && (
              <>
                {' '}| ค้นพบ: <span className="text-green-400 font-bold text-sm mx-1">{filteredList.length}</span> รายการ
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-ink-400 animate-pulse text-center">กำลังโหลดข้อมูลระบบ...</p>
      ) : (
        <div className="mt-4">
          <div className="overflow-hidden rounded-xl border border-base-600/60 bg-base-800/40">
            <div className="overflow-x-auto">
              {renderTable(paginatedList, lookups)}
            </div>
            {renderPagination()}
          </div>
        </div>
      )}
    </>
  );
}
