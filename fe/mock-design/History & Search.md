import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Flag, RefreshCw, X, Eye, CheckCircle, Clock, XCircle, PanelLeft, Download, Share2, AlertCircle } from 'lucide-react';

// --- MOCK DATA GENERATION & HELPERS --- //

const mockProducts = {
  REF: [{ id: "AQR-B360MA(SLB)", name: "Bottom Freezer Refrigerator", desc: "292L, Inverter" }],
  WM: [{ id: "AQW-F714K1", name: "Front Load Washer", desc: "7kg Capacity" }],
  TV: [{ id: "AQT-P505BGA", name: "Smart LED TV", desc: "50 inch, 4K" }]
};

const generateMockData = (count) => {
  const data = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const categoryRoll = Math.random();
    let category;
    if (categoryRoll < 0.4) category = 'REF';
    else if (categoryRoll < 0.7) category = 'WM';
    else category = 'TV';

    const product = mockProducts[category][0];
    const timestamp = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);

    const resultRoll = Math.random();
    let resultType;
    if (resultRoll < 0.75) resultType = 'Correct';
    else if (resultRoll < 0.90) resultType = 'Incorrect';
    else resultType = 'Uncertain';

    let labelMatch, overviewMatch, labelConf, overviewConf;
    let explanation;
    switch (resultType) {
      case 'Incorrect':
        labelMatch = Math.random() > 0.5 ? 'yes' : 'no';
        overviewMatch = labelMatch === 'yes' ? 'no' : 'yes';
        labelConf = labelMatch === 'yes' ? 0.9 + Math.random() * 0.1 : 0.7 + Math.random() * 0.3;
        overviewConf = overviewMatch === 'yes' ? 0.9 + Math.random() * 0.1 : 0.7 + Math.random() * 0.3;
        explanation = "Mismatch found: Control panel layout differs from reference.";
        break;
      case 'Uncertain':
        labelMatch = 'yes';
        overviewMatch = 'yes';
        labelConf = 0.6 + Math.random() * 0.24;
        overviewConf = 0.6 + Math.random() * 0.24;
        explanation = "Analysis completed, but image quality is low, leading to reduced confidence.";
        break;
      case 'Correct':
      default:
        labelMatch = 'yes';
        overviewMatch = 'yes';
        labelConf = 0.85 + Math.random() * 0.15;
        overviewConf = 0.85 + Math.random() * 0.15;
        explanation = `Perfect match. All features align with reference for ${product.id}.`;
    }

    data.push({
      transactionId: `TXN-${timestamp.getTime()}-${i}`,
      timestamp,
      productId: product.id,
      productName: product.name,
      category,
      processingTime: (Math.random() * 5 + 2).toFixed(1),
      storeLocation: "Metro Manila - SM Megamall",
      result: {
        matchLabelToReference: labelMatch,
        labelConfidence: parseFloat(labelConf.toFixed(2)),
        matchOverviewToReference: overviewMatch,
        overviewConfidence: parseFloat(overviewConf.toFixed(2)),
        explanation: explanation,
        uploadedLabelImage: "https://placehold.co/800x600/111111/A0A0A0?text=Uploaded+Label",
        uploadedOverviewImage: "https://placehold.co/800x600/111111/A0A0A0?text=Uploaded+Overview",
        referenceLabelImages: ["https://placehold.co/400x300/1E1E1E/A0A0A0?text=Ref+Label+1"],
        referenceOverviewImages: ["https://placehold.co/400x300/1E1E1E/A0A0A0?text=Ref+Overview+1"],
        rawResponse: { model: "aqua-vision-v2.1", analysis: { /* ... */ } }
      },
    });
  }
  return data;
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const getResultStatus = (item) => {
  const { matchLabelToReference, labelConfidence, matchOverviewToReference, overviewConfidence } = item.result;
  let status = 'Correct', color = 'green', Icon = CheckCircle;
  if (matchLabelToReference === 'no' || matchOverviewToReference === 'no') {
    status = 'Incorrect'; color = 'red'; Icon = XCircle;
  } else if (labelConfidence < 0.85 || overviewConfidence < 0.85) {
    status = 'Uncertain'; color = 'yellow'; Icon = AlertCircle;
  }
  return { status, Icon, color };
};

// --- UI COMPONENTS --- //

const StatCard = ({ title, value, icon, accentColor }) => (
    <div className="bg-[#1E1E1E] p-4 rounded-xl border border-[#2F2F2F] flex items-start justify-between">
        <div>
            <p className="text-sm text-[#A0A0A0]">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`text-white p-2 rounded-full`} style={{ backgroundColor: accentColor }}>{icon}</div>
    </div>
);

const AnalysisSection = ({ title, matchStatus, confidence, explanation, uploadedImage, referenceImages }) => {
    const { status, Icon, color } = getResultStatus({ result: { matchLabelToReference: matchStatus, labelConfidence: confidence, matchOverviewToReference: matchStatus, overviewConfidence: confidence }});
    return (
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">{title}</h3><span className={`px-2 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-${color}-500/10 text-${color}-400`}><Icon size={14} /> {matchStatus === 'yes' ? 'Match' : 'Mismatch'}</span></div>
            <div><img src={uploadedImage} alt="Uploaded" className="w-full h-auto object-cover rounded-lg border-2 border-[#2F2F2F] mb-3"/><div className="flex gap-2 overflow-x-auto pb-2">{referenceImages.map((img, i) => (<img key={i} src={img} alt={`Reference ${i}`} className="w-24 h-auto object-cover rounded flex-shrink-0"/>))}</div></div>
            <div className="bg-[#111111] p-3 rounded-lg border border-[#2F2F2F]"><p className="text-sm"><strong className="text-gray-400">Confidence:</strong> <span className={`font-bold text-${color}-400`}>{(confidence * 100).toFixed(0)}%</span></p><p className="text-sm mt-1"><strong className="text-gray-400">Explanation:</strong> {explanation}</p></div>
        </div>
    );
};

const DetailsModal = ({ item, onClose }) => {
    if (!item) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#18181B] border border-[#2F2F2F] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-[#2F2F2F] flex-shrink-0">
                    <div><h2 className="text-lg font-bold text-white">Verification Details</h2><p className="text-xs text-[#A0A0A0] font-mono">{item.transactionId}</p></div>
                    <button onClick={onClose} className="text-[#A0A0A0] hover:text-white"><X size={20}/></button>
                </header>
                <main className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
                    <aside className="lg:col-span-1 space-y-6">
                        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-[#A0A0A0] mb-2">Product ID & Category</h3>
                            <p className="text-lg font-bold">{item.productName}</p>
                            <p className="text-sm font-mono text-gray-400">{item.productId}</p>
                            <p className="text-sm text-gray-400">{item.category}</p>
                        </div>
                        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-[#A0A0A0] mb-2">Transaction Details</h3>
                            <p className="text-sm"><strong className="text-gray-400">Date:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                            <p className="text-sm"><strong className="text-gray-400">Location:</strong> {item.storeLocation}</p>
                            <p className="text-sm"><strong className="text-gray-400">Duration:</strong> {item.processingTime}s</p>
                        </div>
                    </aside>
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <AnalysisSection title="Label Verification" matchStatus={item.result.matchLabelToReference} confidence={item.result.labelConfidence} explanation={item.result.explanation} uploadedImage={item.result.uploadedLabelImage} referenceImages={item.result.referenceLabelImages}/>
                        <AnalysisSection title="Overview Verification" matchStatus={item.result.matchOverviewToReference} confidence={item.result.overviewConfidence} explanation={item.result.explanation} uploadedImage={item.result.uploadedOverviewImage} referenceImages={item.result.referenceOverviewImages}/>
                    </div>
                </main>
            </div>
        </div>
    );
};

const ResultsTable = ({ data, setSorting, sorting, onDetailsClick }) => {
    const SortableHeader = ({ children, aKey }) => { const isSorted = sorting.key === aKey; return (<th className="p-3 text-left text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider cursor-pointer" onClick={() => { const direction = isSorted && sorting.direction === 'asc' ? 'desc' : 'asc'; setSorting({ key: aKey, direction }); }}><div className="flex items-center gap-2">{children}{isSorted && (sorting.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div></th>); };
    return (<div className="overflow-x-auto bg-[#1E1E1E] rounded-xl border border-[#2F2F2F]"><table className="min-w-full divide-y divide-[#2F2F2F]"><thead className="bg-[#111111]/50"><tr><SortableHeader aKey="transactionId">Transaction ID</SortableHeader><SortableHeader aKey="timestamp">Date</SortableHeader><SortableHeader aKey="productId">Product</SortableHeader><SortableHeader aKey="result">Result</SortableHeader><th className="p-3 text-left text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-[#1E1E1E] divide-y divide-[#2F2F2F]">{data.map(item => { const { status, color } = getResultStatus(item); return (<tr className="hover:bg-white/5" key={item.transactionId}><td className="p-3 text-sm text-[#F5F5F5] font-mono">{item.transactionId.substring(4, 22)}...</td><td className="p-3 text-sm text-[#A0A0A0]">{new Date(item.timestamp).toLocaleDateString()}</td><td className="p-3 text-sm font-medium text-[#F5F5F5]">{item.productId}</td><td className="p-3"><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${color}-500/10 text-${color}-400`}>{status}</span></td><td className="p-3 text-sm font-medium"><button onClick={() => onDetailsClick(item)} className="text-blue-400 hover:text-blue-300"><Eye size={18} /></button></td></tr>); })}</tbody></table></div>);
};

const SkeletonLoader = () => (<div className="bg-[#1E1E1E] p-4 rounded-xl border border-[#2F2F2F] space-y-4 animate-pulse">{[...Array(5)].map((_, i) => (<div key={i} className="flex items-center space-x-4"><div className="h-4 w-1/4 rounded bg-[#2F2F2F]"></div><div className="h-4 w-1/6 rounded bg-[#2F2F2F]"></div><div className="h-4 flex-1 rounded bg-[#2F2F2F]"></div></div>))}</div>);
const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => { const totalPages = Math.ceil(totalItems / itemsPerPage); if(totalPages <= 1) return null; return (<div className="flex items-center justify-between text-sm text-[#A0A0A0]"><span>Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results</span><div className="flex items-center gap-1"><button disabled={currentPage === 1} onClick={() => onPageChange(1)} className="p-1 disabled:opacity-50"><ChevronsLeft size={20} /></button><button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="p-1 disabled:opacity-50"><ChevronLeft size={20} /></button><span className="px-2">Page {currentPage} of {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className="p-1 disabled:opacity-50"><ChevronRight size={20} /></button><button disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)} className="p-1 disabled:opacity-50"><ChevronsRight size={20} /></button></div></div>); };

// --- MAIN PAGE COMPONENT --- //
export default function HistoryPage() {
    const [allData, setAllData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', category: [], result: 'All' });
    const [sorting, setSorting] = useState({ key: 'timestamp', direction: 'desc' });
    const [pagination, setPagination] = useState({ currentPage: 1, itemsPerPage: 10 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [modalItem, setModalItem] = useState(null);
    const debouncedSearch = useDebounce(filters.search, 300);
    const refreshData = useCallback(() => { setIsLoading(true); setTimeout(() => { setAllData(generateMockData(523)); setIsLoading(false); }, 1000); }, []);
    useEffect(() => { refreshData(); }, [refreshData]);
    const filteredData = useMemo(() => allData.filter(item => { const { status } = getResultStatus(item); if (debouncedSearch && !(item.productId.toLowerCase().includes(debouncedSearch.toLowerCase()) || item.transactionId.toLowerCase().includes(debouncedSearch.toLowerCase()))) return false; if (filters.category.length > 0 && !filters.category.includes(item.category)) return false; if (filters.result !== 'All' && status !== filters.result) return false; return true; }).sort((a, b) => { const valA = sorting.key === 'result' ? getResultStatus(a).status : a[sorting.key]; const valB = sorting.key === 'result' ? getResultStatus(b).status : b[sorting.key]; if (valA < valB) return sorting.direction === 'asc' ? -1 : 1; if (valA > valB) return sorting.direction === 'asc' ? 1 : -1; return 0; }), [allData, debouncedSearch, filters, sorting]);
    const paginatedData = useMemo(() => { const start = (pagination.currentPage - 1) * pagination.itemsPerPage; return filteredData.slice(start, start + pagination.itemsPerPage); }, [filteredData, pagination]);
    const { totalCorrect, totalIncorrect } = useMemo(() => allData.reduce((acc, item) => { const { status } = getResultStatus(item); if (status === 'Correct') acc.totalCorrect++; if (status === 'Incorrect') acc.totalIncorrect++; return acc; }, { totalCorrect: 0, totalIncorrect: 0 }), [allData]);
    const handleFilterChange = (key, value) => { setFilters(prev => ({ ...prev, [key]: value })); setPagination(prev => ({ ...prev, currentPage: 1 })); };

    return (
        <div className="bg-[#111111] text-[#F5F5F5] min-h-screen font-sans">
            <DetailsModal item={modalItem} onClose={() => setModalItem(null)} />
            <div className="max-w-screen-2xl mx-auto p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Verification History & Analytics</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                        <StatCard title="Total Verifications" value={allData.length} icon={<CheckCircle size={20}/>} accentColor="#3B82F6" />
                        <StatCard title="Total Correct" value={totalCorrect} icon={<CheckCircle size={20}/>} accentColor="#22C55E" />
                        <StatCard title="Total Incorrect" value={totalIncorrect} icon={<XCircle size={20}/>} accentColor="#EF4444" />
                    </div>
                </header>
                <div className="flex gap-8">
                    <aside className={`w-72 flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'block' : 'hidden'}`}>
                        <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2F2F2F] space-y-6 sticky top-8">
                            <h3 className="text-lg font-semibold">Filters & Sorting</h3>
                            <div><label className="text-sm font-medium text-[#A0A0A0]">Search</label><div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} /><input type="text" placeholder="Product or TXN ID..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#2F2F2F] rounded-md"/></div></div>
                            <div><label className="text-sm font-medium text-[#A0A0A0]">Category</label><select onChange={(e) => handleFilterChange('category', e.target.value ? [e.target.value] : [])} className="w-full mt-1 py-2 bg-[#111111] border border-[#2F2F2F] rounded-md"><option value="">All Categories</option><option value="REF">Refrigerators</option><option value="WM">Washing Machines</option><option value="TV">Televisions</option></select></div>
                            <div><label className="text-sm font-medium text-[#A0A0A0]">Result</label><select onChange={(e) => handleFilterChange('result', e.target.value)} className="w-full mt-1 py-2 bg-[#111111] border border-[#2F2F2F] rounded-md"><option>All</option><option>Correct</option><option>Incorrect</option><option>Uncertain</option></select></div>
                        </div>
                    </aside>
                    <main className="flex-1 w-full min-w-0">
                         <div className="flex justify-between items-center mb-4"><Pagination totalItems={filteredData.length} itemsPerPage={pagination.itemsPerPage} currentPage={pagination.currentPage} onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}/><div className="flex items-center gap-2"><button onClick={refreshData} className="p-2 rounded-md bg-[#1E1E1E] border border-[#2F2F2F] hover:bg-white/10"><RefreshCw size={18}/></button><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md bg-[#1E1E1E] border border-[#2F2F2F] hover:bg-white/10"><PanelLeft size={18}/></button></div></div>
                        {isLoading ? <SkeletonLoader /> : <ResultsTable data={paginatedData} setSorting={setSorting} sorting={sorting} onDetailsClick={setModalItem}/>}
                    </main>
                </div>
            </div>
        </div>
    );
}