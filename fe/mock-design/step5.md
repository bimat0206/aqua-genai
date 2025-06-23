import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, CheckCircle, XCircle, ImageIcon, ChevronRight, RefreshCw, AlertCircle, Package, Calendar, ArrowLeft, Home, FileText, Bot, Camera, Sparkles, Columns, X, List, Hash, Palette, DoorOpen } from 'lucide-react';

// --- MOCK DATA & API SIMULATION --- //

const MOCK_S3_DATA = {
  "REF": {
    "AQR-B360MA(SLB)": {
      description: "Bottom Freezer Refrigerator, 292L",
      overviewImages: [{ key: "dataset/REF/AQR-B360MA(SLB)/CHÍNH DIỆN/overview_front.jpg", date: "2025-06-15", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=REF+Front" }],
      labelImages: [{ key: "dataset/REF/AQR-B360MA(SLB)/TEM NL/label_energy.jpg", date: "2025-06-15", url: "https://placehold.co/600x400/1E1E1E/A0A0A0?text=Energy+Label", quality: 0.98 }]
    },
    "AQR-T389FA(FB)": {
      description: "Top Freezer Refrigerator, 344L",
      overviewImages: [{ key: "dataset/REF/AQR-T389FA(FB)/CHÍNH DIỆN/overview_main.jpg", date: "2025-05-20", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=REF+Top+Freezer" }],
      labelImages: [{ key: "dataset/REF/AQR-T389FA(FB)/TEM NL/label.jpg", date: "2025-05-20", url: "https://placehold.co/600x400/1E1E1E/A0A0A0?text=Energy+Label", quality: 0.85 }]
    }
  },
  "WM": { "AQW-F800Z1T": { description: "Front Load Washer, 8kg", overviewImages: [], labelImages: [] }},
  "TV": { "LE50AQT7000QU": { description: "50-inch 4K UHD Google TV", overviewImages: [], labelImages: [] }}
};

const RefrigeratorIcon = () => (<svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"></path><line x1="3" y1="10" x2="21" y2="10"></line></svg>);
const WashingMachineIcon = () => (<svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"></path><circle cx="12" cy="12" r="4"></circle><line x1="17" y1="6" x2="19" y2="6"></line></svg>);
const TelevisionIcon = () => (<svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="12" rx="2"></rect><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="16" x2="12" y2="20"></line></svg>);

const CATEGORIES = {
  REF: { name: "Refrigerators", icon: <RefrigeratorIcon /> },
  WM: { name: "Washing Machines", icon: <WashingMachineIcon /> },
  TV: { name: "Televisions", icon: <TelevisionIcon /> },
};

const simulateVerificationApi = (body) => {
  console.log("🚀 [API MOCK] Sending Verification Request:", body);
  return new Promise((resolve) => {
    setTimeout(() => {
        const isMismatch = body.product_id === "AQR-T389FA(FB)";
        resolve({
            transactionId: `verif-${Date.now()}`,
            status: isMismatch ? 'MISMATCH' : 'CORRECT',
            product: { id: body.product_id, category: body.product_category },
            labelAnalysis: {
                match: 'yes', confidence: 0.98,
                explanation: 'Exact product code match: AQR-M536XA found on both uploaded label and reference labels. All key specifications match perfectly: capacity 469L, energy consumption 431.3 kWh/năm, power rating 135W, energy efficiency rating 1.81, manufacturer HAIER ELECTRIC (THAILAND) PCL, country of origin THÁI LAN. The energy rating shows 5-star rating with identical layout and design. VNEEP certification logo and Vietnamese standards (TCVN 7828:2016, TCVN 7829:2016) are present and match. The warranty information, QR code, and hotline number (1800 58 58 32) are identical across all images.',
                uploadedImage: 'https://placehold.co/800x600/111111/FFFFFF?text=Uploaded+Label',
                referenceImage: 'https://placehold.co/800x600/1E1E1E/A0A0A0?text=Reference+Label'
            },
            overviewAnalysis: {
                match: isMismatch ? 'no' : 'yes', confidence: isMismatch ? 0.93 : 0.95,
                explanation: isMismatch 
                    ? 'Mismatch Found: The uploaded product has external bar handles, while reference images for AQR-T389FA(FB) show integrated pocket handles.' 
                    : 'The uploaded overview image shows a four-door French door refrigerator with bottom freezer configuration that matches the reference images perfectly. Key matching features include: glossy black finish on all door surfaces, four-door configuration (two upper French doors, two lower freezer drawers), integrated pocket-style handles on all doors, AQUA logo positioned in the upper right corner of the right door, TWIN INVERTER branding visible on the lower right door, digital display panel visible on the upper left door, overall proportions and dimensions match the reference model. The product displays identical design elements including door alignment, handle positioning, and finish quality. All visible physical characteristics are consistent with the AQR-M536XA(GB) reference images.',
                uploadedImage: 'https://placehold.co/800x600/111111/FFFFFF?text=Uploaded+Overview',
                referenceImage: 'https://placehold.co/800x600/1E1E1E/A0A0A0?text=Reference+Overview'
            }
        });
    }, 2500);
  });
};

// --- UI COMPONENTS --- //

const ImageComparisonModal = ({ isOpen, onClose, uploadedImage, referenceImage, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-[#2F2F2F] flex-shrink-0"><h2 className="text-lg font-bold text-white">{title}</h2><button onClick={onClose} className="text-[#A0A0A0] hover:text-white"><X size={20}/></button></header>
                <main className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    <div><h3 className="text-center font-semibold text-[#A0A0A0] mb-2">Uploaded Image</h3><img src={uploadedImage} alt="Uploaded" className="w-full h-auto object-contain rounded-lg border-2 border-blue-500"/></div>
                    <div><h3 className="text-center font-semibold text-[#A0A0A0] mb-2">Reference Image</h3><img src={referenceImage} alt="Reference" className="w-full h-auto object-contain rounded-lg"/></div>
                </main>
            </div>
        </div>
    );
};

const StructuredExplanation = ({ text }) => {
    const keyPoints = useMemo(() => {
        const points = [];
        const overviewKeywords = {"Configuration": /four-door French door|bottom freezer|two upper French doors, two lower freezer drawers/,"Finish": /glossy black finish/,"Handles": /integrated pocket-style handles/,"Logo": /aqua logo positioned/,"Branding": /twin inverter branding/,"Display": /digital display panel/};
        Object.entries(overviewKeywords).forEach(([key, regex]) => { const match = text.match(regex); if(match) points.push({ key, value: match[0] }); });
        const labelKeywords = {"Product Code": /AQR-M536XA/,"Capacity": /\b\d{3}L\b/,"Energy Consumption": /\d+\.\d+\s*kWh\/năm/,"Power Rating": /\d+\s*W/,"Energy Rating": /5-star rating/,"Certification": /VNEEP certification/,"Hotline": /1800 58 58 32/,};
        Object.entries(labelKeywords).forEach(([key, regex]) => { const match = text.match(regex); if(match) points.push({ key, value: match[0] }); });
        if (points.length > 0) return points;
        return [{ key: "Summary", value: text }];
    }, [text]);

    return (
        <div className="bg-[#111111] p-4 rounded-lg border border-[#2F2F2F] space-y-2">
            <h5 className="text-sm font-semibold text-[#A0A0A0] flex items-center gap-2"><List size={16}/> Key Findings</h5>
            {keyPoints.map(({ key, value }) => (
                <div key={key} className="flex items-start text-sm border-t border-[#2F2F2F] pt-2">
                    <span className="text-gray-400 w-1/3 flex-shrink-0 font-medium">{key}</span>
                    <span className="text-gray-200">{value}</span>
                </div>
            ))}
        </div>
    );
};

const VerificationResultPage = ({ result, onReset }) => {
    const [modalContent, setModalContent] = useState(null);

    if(!result) return null;

    const { status, product, labelAnalysis, overviewAnalysis } = result;
    const isCorrect = status === 'CORRECT';

    const StatusDisplay = () => (
        <div className={`p-6 rounded-xl flex flex-col items-center justify-center text-center border ${isCorrect ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
            {isCorrect ? <CheckCircle className="text-green-400" size={48} /> : <XCircle className="text-red-400" size={48} />}
            <h3 className={`text-2xl font-bold mt-3 ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                Verification Result: {isCorrect ? 'Correct' : 'Mismatch'}
            </h3>
        </div>
    );

    const AnalysisCard = ({ title, data, onCompare }) => {
        const match = data.match === 'yes';
        return (
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-[#2F2F2F] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">{title === 'Label Analysis' ? <FileText/> : <Camera/>}{title}</h4>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${match ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{match ? `Match - ${(data.confidence*100).toFixed(0)}%` : `Mismatch - ${(data.confidence*100).toFixed(0)}%`}</span>
                </div>
                <div className="bg-[#111111] p-4 rounded-lg border border-[#2F2F2F] mb-4">
                    <img src={data.uploadedImage} alt="Uploaded" className="w-full h-48 object-cover rounded-md mb-3"/>
                    <button onClick={onCompare} className="w-full flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20"><Columns size={16}/> Compare with Reference</button>
                </div>
                <div className="flex-grow"><StructuredExplanation text={data.explanation} /></div>
            </div>
        )
    };
    
    return (
        <>
            <ImageComparisonModal isOpen={!!modalContent} onClose={() => setModalContent(null)} {...modalContent}/>
            <div>
                <h2 className="text-xl font-bold mb-6">Step 5: Verification Result</h2>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Info Column */}
                    <div className="xl:col-span-1 space-y-6">
                        <StatusDisplay />
                        <div className="bg-[#1E1E1E] p-4 rounded-xl border border-[#2F2F2F]">
                            <h4 className="text-sm font-semibold text-[#A0A0A0] mb-2">Product Info</h4>
                            <p className="text-lg font-bold text-white">{product.id}</p>
                            <p className="text-sm text-gray-400">{product.category}</p>
                        </div>
                    </div>
                    {/* Analysis Columns */}
                    <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <AnalysisCard title="Label Analysis" data={labelAnalysis} onCompare={() => setModalContent({ uploadedImage: labelAnalysis.uploadedImage, referenceImage: labelAnalysis.referenceImage, title: 'Label Image Comparison' })}/>
                       <AnalysisCard title="Overview Analysis" data={overviewAnalysis} onCompare={() => setModalContent({ uploadedImage: overviewAnalysis.uploadedImage, referenceImage: overviewAnalysis.referenceImage, title: 'Overview Image Comparison' })}/>
                    </div>
                </div>
                <div className="flex justify-between mt-8">
                     <button onClick={() => {}} className="text-[#A0A0A0] font-bold py-3 px-8 rounded-lg bg-[#2F2F2F] hover:bg-white/10">View All Results</button>
                     <button onClick={onReset} className="text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90">Start New Verification</button>
                </div>
            </div>
        </>
    );
};


// --- The rest of the wizard components --- //
const StepIndicator = ({ currentStep }) => { const steps = ["Product", "Overview Image", "Label Image", "Review", "Result"]; const Step = ({ number, title, active, isComplete }) => (<div className="flex items-center"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${active ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' : isComplete ? 'bg-green-500 text-white' : 'bg-[#2F2F2F] text-[#A0A0A0]'}`}>{isComplete && !active ? <CheckCircle size={18}/> : number}</div><p className={`ml-3 font-medium hidden sm:block ${active || isComplete ? 'text-white' : 'text-[#A0A0A0]'}`}>{title}</p></div>); return (<div className="flex justify-between items-center mb-10 px-4">{steps.map((title, index) => (<React.Fragment key={title}><Step number={index + 1} title={title} active={currentStep === index + 1} isComplete={currentStep > index + 1} />{index < steps.length - 1 && <div className="flex-1 h-0.5 bg-[#2F2F2F] mx-4"></div>}</React.Fragment>))}</div>); };
const ImageBrowser = ({ title, images = [], onSelectImage, selectedImageKey }) => { const [previewItem, setPreviewItem] = useState(null); useEffect(() => { if(selectedImageKey) { const alreadySelected = images.find(img => img.key === selectedImageKey); if(alreadySelected) setPreviewItem(alreadySelected); } else { setPreviewItem(null); } }, [images, selectedImageKey]); return (<div className="bg-[#111111] p-6 rounded-2xl border border-[#2F2F2F] h-[70vh] flex flex-col"><h3 className="font-bold text-lg text-white mb-4">{title}</h3><div className="flex-grow flex gap-6 overflow-hidden"><div className="w-1/2 flex-shrink-0 overflow-y-auto pr-2 border-r border-[#2F2F2F] styled-scrollbar">{images.length > 0 ? images.map(img => { const isPreviewed = previewItem?.key === img.key; const isSelected = selectedImageKey === img.key; return (<div key={img.key} onClick={() => setPreviewItem(img)} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-200 ${isPreviewed ? 'bg-purple-600/30' : 'hover:bg-white/10'}`}>{isSelected ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 text-green-400" /> : <ImageIcon className="w-5 h-5 mr-3 flex-shrink-0 text-gray-400" />}<span className="text-sm font-mono truncate">{img.key.split('/').pop()}</span></div>); }) : <p className="text-gray-500">No images found.</p>}</div><div className="w-1/2 flex flex-col"><p className="text-sm text-[#A0A0A0] mb-2 flex-shrink-0">Preview</p><div className="flex-grow bg-[#1E1E1E] rounded-lg p-4 flex items-center justify-center border border-[#2F2F2F]">{previewItem ? (<img src={previewItem.url} alt="preview" className="max-w-full max-h-full object-contain rounded-md" />) : (<p className="text-[#A0A0A0]">Select a file to preview</p>)}</div>{previewItem && (<button onClick={() => onSelectImage(previewItem)} disabled={selectedImageKey === previewItem.key} className="w-full mt-4 flex-shrink-0 text-white font-bold py-2 px-4 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed">{selectedImageKey === previewItem.key ? '✓ Selected' : 'Select this Image'}</button>)}</div></div></div>); };
const AquaVerificationWizard = ({ onVerificationComplete }) => {
    const [step, setStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOverviewImage, setSelectedOverviewImage] = useState(null);
    const [selectedLabelImage, setSelectedLabelImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const productsForCategory = useMemo(() => Object.entries(MOCK_S3_DATA[selectedCategory] || {}).map(([id, data]) => ({ id, ...data })), [selectedCategory]);
    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    const resetWizard = () => { setStep(1); setSelectedCategory(null); setSelectedProduct(null); setSelectedOverviewImage(null); setSelectedLabelImage(null); setVerificationResult(null); setIsLoading(false); };
    const handleSubmit = async () => { setStep(5); setIsLoading(true); setVerificationResult(null); const result = await simulateVerificationApi({ product_id: selectedProduct.id, product_category: selectedCategory, }); setVerificationResult(result); setIsLoading(false); onVerificationComplete(result); };
    const renderStep1 = () => (
         <div>
            <h2 className="text-xl font-bold mb-4">Step 1: Select Product</h2>
            <div className="space-y-6">
                <div>
                    <label className="font-semibold block mb-2">Product Category</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Object.entries(CATEGORIES).map(([key, { name, icon }]) => (<button key={key} onClick={() => { setSelectedCategory(key); setSelectedProduct(null); }} className={`p-3 border-2 rounded-lg text-center transition-all group ${selectedCategory === key ? 'bg-purple-600/30 border-purple-500' : 'border-[#2F2F2F] hover:bg-white/10'}`}>{icon}<div className="text-sm mt-1">{name}</div></button>))}</div>
                </div>
                <div>
                     <label className="font-semibold block mb-2">Product ID</label>
                     <select value={selectedProduct?.id || ''} onChange={(e) => { const p = productsForCategory.find(p => p.id === e.target.value); setSelectedProduct(p); }} disabled={!selectedCategory} className="w-full bg-[#111111] border border-[#2F2F2F] rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50">
                        <option value="" disabled>{selectedCategory ? 'Select a product' : 'First select a category'}</option>
                        {productsForCategory.map(p => <option key={p.id} value={p.id}>{p.id} - {p.description}</option>)}
                     </select>
                </div>
            </div>
            <button onClick={handleNext} disabled={!selectedProduct} className="w-full mt-8 text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 disabled:opacity-50">Next Step</button>
        </div>
    );
    const renderStep4 = () => (
         <div>
             <h2 className="text-xl font-bold mb-6">Step 4: Review and Submit</h2>
             <div className="bg-[#111111] p-6 rounded-lg border border-[#2F2F2F] space-y-4 font-mono text-sm">
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Product:</strong> <span className="text-cyan-400">{selectedProduct.id}</span></div>
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Overview Image:</strong> <span className="text-green-400">{selectedOverviewImage?.key || 'Not Selected'}</span></div>
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Label Image:</strong> <span className="text-green-400">{selectedLabelImage?.key || 'Not Selected'}</span></div>
             </div>
             <div className="flex justify-between mt-6"><button onClick={handleBack} className="text-[#A0A0A0] font-bold py-3 px-8 rounded-lg bg-[#2F2F2F] hover:bg-white/10">Back</button><button onClick={handleSubmit} disabled={!selectedOverviewImage || !selectedLabelImage} className="text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 disabled:opacity-50">Submit Verification</button></div>
        </div>
    );

    const renderCurrentStep = () => {
        switch(step) {
            case 1: return renderStep1();
            case 2: return <ImageBrowser title="Step 2: Select Overview Image" images={selectedProduct?.overviewImages} onSelectImage={setSelectedOverviewImage} selectedImageKey={selectedOverviewImage?.key}/>;
            case 3: return <ImageBrowser title="Step 3: Select Label Image" images={selectedProduct?.labelImages} onSelectImage={setSelectedLabelImage} selectedImageKey={selectedLabelImage?.key} />;
            case 4: return renderStep4();
            case 5: if (isLoading) return <div className="flex items-center justify-center gap-4 h-96"><RefreshCw className="animate-spin text-purple-400" size={32}/><p className="text-lg">AI analysis is in progress...</p></div>; return <VerificationResultPage result={verificationResult} onReset={resetWizard} />;
            default: return <div>Invalid Step</div>;
        }
    }
    
    return (<div className="bg-[#111111] text-[#F5F5F5] min-h-screen font-sans p-8 flex items-center justify-center"><style>{`.styled-scrollbar::-webkit-scrollbar { width: 8px; } .styled-scrollbar::-webkit-scrollbar-track { background: #111; } .styled-scrollbar::-webkit-scrollbar-thumb { background: #2F2F2F; border-radius: 10px; }`}</style><div className="w-full max-w-7xl"><h1 className="text-center text-4xl font-bold mb-4"><span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">New Verification</span></h1><p className="text-center text-[#A0A0A0] mb-10">Follow the steps below to initiate a new visual verification.</p>{step < 5 && <StepIndicator currentStep={step} />}<div className="bg-[#1E1E1E] p-8 rounded-2xl border border-[#2F2F2F]">{renderCurrentStep()}{(step === 2 || step === 3) && (<div className="flex justify-between mt-6"><button onClick={handleBack} className="text-[#A0A0A0] font-bold py-3 px-8 rounded-lg bg-[#2F2F2F] hover:bg-white/10">Back</button><button onClick={handleNext} disabled={(step === 2 && !selectedOverviewImage) || (step === 3 && !selectedLabelImage)} className="text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 disabled:opacity-50">Next Step</button></div>)}</div></div></div>);
};

export default function App() {
    const handleVerificationComplete = (result) => { console.log("Verification Complete in App:", result); };
    return <AquaVerificationWizard onVerificationComplete={handleVerificationComplete} />
}