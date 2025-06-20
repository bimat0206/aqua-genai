import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, XCircle, ImageIcon, ChevronRight, RefreshCw, AlertTriangle, Package, Calendar, ArrowLeft, Home } from 'lucide-react';

// --- MOCK DATA & API SIMULATION (Adapted for Aqua System) ---

const MOCK_S3_DATA = {
  // Simulates the S3 bucket structure and product database
  "REF": {
    "AQR-B360MA(SLB)": {
      description: "Bottom Freezer Refrigerator, 292L",
      overviewImages: [
        { key: "dataset/REF/AQR-B360MA(SLB)/CHÍNH DIỆN/overview_front.jpg", date: "2025-06-15", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=REF+Front" },
        { key: "dataset/REF/AQR-B360MA(SLB)/HÌNH WEB/overview_angle.jpg", date: "2025-06-14", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=REF+Angle" },
        { key: "dataset/REF/AQR-B360MA(SLB)/HÌNH WEB/overview_detail.jpg", date: "2025-06-13", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=REF+Detail" },
      ],
      labelImages: [
        { key: "dataset/REF/AQR-B360MA(SLB)/TEM NL/label_energy.jpg", date: "2025-06-15", url: "https://placehold.co/600x400/1E1E1E/A0A0A0?text=Energy+Label", quality: 0.98 },
      ]
    },
    "AQR-T389FA(FB)": {
      description: "Top Freezer Refrigerator, 344L",
      overviewImages: [
        { key: "dataset/REF/AQR-T389FA(FB)/CHÍNH DIỆN/overview_main.jpg", date: "2025-05-20", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=REF+Top+Freezer" },
      ],
      labelImages: [
         { key: "dataset/REF/AQR-T389FA(FB)/TEM NL/label.jpg", date: "2025-05-20", url: "https://placehold.co/600x400/1E1E1E/A0A0A0?text=Energy+Label", quality: 0.85 },
      ]
    }
  },
  "WM": {
    "AQW-F800Z1T": {
      description: "Front Load Washer, 8kg",
      overviewImages: [
        { key: "dataset/WM/AQW-F800Z1T/HÌNH WEB/wm_front.jpg", date: "2025-04-11", url: "https://placehold.co/800x600/1E1E1E/A0A0A0?text=WM+Front+Load" },
      ],
      labelImages: [] // Example of no labels available
    }
  },
  "TV": {
     "LE50AQT7000QU": {
      description: "50-inch 4K UHD Google TV",
      overviewImages: [
        { key: "dataset/TV/LE50AQT7000QU/HÌNH WEB/tv_main.jpg", date: "2025-03-01", url: "https://placehold.co/800x600/111111/A0A0A0?text=TV+Front" },
      ],
      labelImages: [
        { key: "dataset/TV/LE50AQT7000QU/TEM NL/label_box.jpg", date: "2025-03-01", url: "https://placehold.co/600x400/1E1E1E/A0A0A0?text=TV+Box+Label", quality: 0.79 },
      ]
    }
  }
};

// --- Custom SVG Icons for Categories ---
const RefrigeratorIcon = () => (
    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"></path>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);
const WashingMachineIcon = () => (
    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"></path>
        <circle cx="12" cy="12" r="4"></circle>
        <line x1="17" y1="6" x2="19" y2="6"></line>
    </svg>
);
const TelevisionIcon = () => (
    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="12" rx="2"></rect>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="16" x2="12" y2="20"></line>
    </svg>
);


const CATEGORIES = {
  REF: { name: "Refrigerators", icon: <RefrigeratorIcon /> },
  WM: { name: "Washing Machines", icon: <WashingMachineIcon /> },
  TV: { name: "Televisions", icon: <TelevisionIcon /> },
};

const simulateVerificationApi = (body) => {
  console.log("🚀 [API MOCK] Sending Verification Request:", body);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!body.uploaded_label_image_key || !body.uploaded_overview_image_key) {
        reject({ error: "Verification failed. One or more required images were not selected.", transactionId: `verif-${Date.now()}` });
        return;
      }
      if (body.product_id === "AQR-T389FA(FB)") {
        resolve({
          transactionId: `verif-${Date.now()}`,
          status: 'COMPLETE',
          match: 'no',
          llmAnalysis: 'Mismatch Found: The uploaded product has external bar handles, while reference images for AQR-T389FA(FB) show integrated pocket handles. Label data matches correctly.'
        });
        return;
      }
      resolve({
        transactionId: `verif-${Date.now()}`,
        status: 'COMPLETE',
        match: 'yes',
        llmAnalysis: 'Perfect Match: All physical features and label information from the uploaded images correspond exactly with the reference data for the selected product.'
      });
    }, 4000);
  });
};

// --- UI COMPONENTS (Vending Machine Theme) ---

const StepIndicator = ({ currentStep }) => {
    const steps = ["Product", "Overview Image", "Label Image", "Review", "Result"];
    const Step = ({ number, title, active, isComplete }) => (
        <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${active ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' : isComplete ? 'bg-green-500 text-white' : 'bg-[#2F2F2F] text-[#A0A0A0]'}`}>
                {isComplete && !active ? <CheckCircle size={18}/> : number}
            </div>
            <p className={`ml-3 font-medium hidden sm:block ${active || isComplete ? 'text-white' : 'text-[#A0A0A0]'}`}>{title}</p>
        </div>
    );
    return (
         <div className="flex justify-between items-center mb-10 px-4">
            {steps.map((title, index) => (
                <React.Fragment key={title}>
                    <Step number={index + 1} title={title} active={currentStep === index + 1} isComplete={currentStep > index + 1} />
                    {index < steps.length - 1 && <div className="flex-1 h-0.5 bg-[#2F2F2F] mx-4"></div>}
                </React.Fragment>
            ))}
        </div>
    );
};

const ImageBrowser = ({ title, images = [], onSelectImage, selectedImageKey, disabled }) => {
    const [previewItem, setPreviewItem] = useState(null);

    useEffect(() => {
      // If an image is already selected, set it as the preview
      if(selectedImageKey) {
        const alreadySelected = images.find(img => img.key === selectedImageKey);
        if(alreadySelected) {
            setPreviewItem(alreadySelected);
        }
      } else {
        setPreviewItem(null);
      }
    }, [images, selectedImageKey]);

    if (disabled) return null;

    return (
        <div className="bg-[#111111] p-6 rounded-2xl border border-[#2F2F2F] h-[70vh] flex flex-col">
            <h3 className="font-bold text-lg text-white mb-4">{title}</h3>
            <div className="flex-grow flex gap-6 overflow-hidden">
                {/* Item List */}
                <div className="w-1/2 flex-shrink-0 overflow-y-auto pr-2 border-r border-[#2F2F2F] styled-scrollbar">
                    {images.length > 0 ? images.map(img => {
                        const isPreviewed = previewItem?.key === img.key;
                        const isSelected = selectedImageKey === img.key;
                        return (
                            <div
                                key={img.key}
                                onClick={() => setPreviewItem(img)}
                                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-200 ${isPreviewed ? 'bg-purple-600/30' : 'hover:bg-white/10'}`}
                            >
                                {isSelected ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 text-green-400" /> : <ImageIcon className="w-5 h-5 mr-3 flex-shrink-0 text-gray-400" />}
                                <span className="text-sm font-mono truncate">{img.key.split('/').pop()}</span>
                            </div>
                        );
                    }) : <p className="text-gray-500">No images found for this product.</p>}
                </div>

                {/* Preview Pane */}
                <div className="w-1/2 flex flex-col">
                    <p className="text-sm text-[#A0A0A0] mb-2 flex-shrink-0">Preview</p>
                    <div className="flex-grow bg-[#1E1E1E] rounded-lg p-4 flex items-center justify-center border border-[#2F2F2F]">
                        {previewItem ? (
                            <img src={previewItem.url} alt="preview" className="max-w-full max-h-full object-contain rounded-md" />
                        ) : (
                            <p className="text-[#A0A0A0]">Select a file to preview</p>
                        )}
                    </div>
                    {previewItem && (
                        <button 
                          onClick={() => onSelectImage(previewItem)} 
                          disabled={selectedImageKey === previewItem.key}
                          className="w-full mt-4 flex-shrink-0 text-white font-bold py-2 px-4 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed"
                        >
                            {selectedImageKey === previewItem.key ? '✓ Selected' : 'Select this Image'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- WIZARD STEPS & MAIN COMPONENT ---

export default function AquaVerificationWizard() {
    const [step, setStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOverviewImage, setSelectedOverviewImage] = useState(null);
    const [selectedLabelImage, setSelectedLabelImage] = useState(null);
    const [verificationResult, setVerificationResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const productsForCategory = useMemo(() => {
        return Object.entries(MOCK_S3_DATA[selectedCategory] || {}).map(([id, data]) => ({ id, ...data }));
    }, [selectedCategory]);
    
    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    
    const resetWizard = () => {
        setStep(1);
        setSelectedCategory(null);
        setSelectedProduct(null);
        setSelectedOverviewImage(null);
        setSelectedLabelImage(null);
        setVerificationResult(null);
        setIsLoading(false);
    };
    
    const handleSubmit = async () => {
        setStep(5); // Move to results page
        setIsLoading(true);
        setVerificationResult(null);
        try {
            const result = await simulateVerificationApi({
                product_id: selectedProduct.id,
                product_category: selectedCategory,
                uploaded_overview_image_key: selectedOverviewImage?.key,
                uploaded_label_image_key: selectedLabelImage?.key,
            });
            setVerificationResult(result);
        } catch(error) {
            setVerificationResult(error); // API errors are also results
        } finally {
            setIsLoading(false);
        }
    };

    // Step 1: Product Selection
    const renderStep1 = () => (
        <div>
            <h2 className="text-xl font-bold mb-4">Step 1: Select Product</h2>
            <div className="space-y-6">
                <div>
                    <label className="font-semibold block mb-2">Product Category</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(CATEGORIES).map(([key, { name, icon }]) => (
                            <button key={key} onClick={() => { setSelectedCategory(key); setSelectedProduct(null); }}
                                className={`p-3 border-2 rounded-lg text-center transition-all group ${selectedCategory === key ? 'bg-purple-600/30 border-purple-500' : 'border-[#2F2F2F] hover:bg-white/10'}`}>
                                {icon}
                                <div className="text-sm mt-1">{name}</div>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                     <label className="font-semibold block mb-2">Product ID</label>
                     <select 
                        value={selectedProduct?.id || ''}
                        onChange={(e) => {
                            const product = productsForCategory.find(p => p.id === e.target.value);
                            setSelectedProduct(product);
                        }}
                        disabled={!selectedCategory}
                        className="w-full bg-[#111111] border border-[#2F2F2F] rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50"
                     >
                        <option value="" disabled>{selectedCategory ? 'Select a product' : 'First select a category'}</option>
                        {productsForCategory.map(p => <option key={p.id} value={p.id}>{p.id} - {p.description}</option>)}
                     </select>
                </div>
            </div>
            <button onClick={handleNext} disabled={!selectedProduct} className="w-full mt-8 text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 disabled:opacity-50">Next Step</button>
        </div>
    );

    // Step 4: Review
    const renderStep4 = () => (
         <div>
             <h2 className="text-xl font-bold mb-6">Step 4: Review and Submit</h2>
             <div className="bg-[#111111] p-6 rounded-lg border border-[#2F2F2F] space-y-4 font-mono text-sm">
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Product Category:</strong> <span className="text-cyan-400">{selectedCategory}</span></div>
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Product ID:</strong> <span className="text-cyan-400">{selectedProduct.id}</span></div>
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Overview Image:</strong> <span className="text-green-400">{selectedOverviewImage?.key || 'Not Selected'}</span></div>
                <div><strong className="text-[#A0A0A0] w-36 inline-block">Label Image:</strong> <span className="text-green-400">{selectedLabelImage?.key || 'Not Selected'}</span></div>
             </div>
             <div className="flex justify-between mt-6">
                 <button onClick={handleBack} className="text-[#A0A0A0] font-bold py-3 px-8 rounded-lg bg-[#2F2F2F] hover:bg-white/10">Back</button>
                 <button onClick={handleSubmit} disabled={!selectedOverviewImage || !selectedLabelImage} className="text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 disabled:opacity-50">Submit Verification</button>
             </div>
        </div>
    );

    // Step 5: Result
    const renderStep5 = () => (
        <div>
             <h2 className="text-xl font-bold mb-6">Step 5: Verification Result</h2>
             <div className="bg-[#111111] p-6 rounded-lg border border-[#2F2F2F] space-y-3 min-h-[200px] flex flex-col justify-center">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-4">
                        <RefreshCw className="animate-spin text-purple-400" size={24}/>
                        <p className="text-lg">AI analysis is in progress...</p>
                    </div>
                ) : verificationResult ? (
                    <>
                        <p><strong className="text-[#A0A0A0] w-28 inline-block">ID:</strong> <span className="font-mono text-blue-400">{verificationResult.transactionId}</span></p>
                        <p><strong className="text-[#A0A0A0] w-28 inline-block">Status:</strong> <span className="font-bold text-yellow-400">{verificationResult.status}</span></p>
                        {verificationResult.match && <p><strong className="text-[#A0A0A0] w-28 inline-block">Result:</strong> <span className={`font-bold ${verificationResult.match === 'yes' ? 'text-green-400' : 'text-red-400'}`}>{verificationResult.match === 'yes' ? 'MATCH' : 'MISMATCH'}</span></p>}
                        <div className="pt-3 mt-3 border-t border-[#2F2F2F]">
                            <p className="text-[#A0A0A0] mb-2">LLM Analysis:</p>
                            <p className="font-mono text-sm whitespace-pre-wrap">{verificationResult.llmAnalysis || verificationResult.error}</p>
                        </div>
                    </>
                ) : <p>An unexpected error occurred.</p>}
             </div>
              <button onClick={resetWizard} className="w-full mt-6 text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90">Start New Verification</button>
        </div>
    );
    
    const renderCurrentStep = () => {
        switch(step) {
            case 1: return renderStep1();
            case 2: return <ImageBrowser title="Step 2: Select Overview Image" images={selectedProduct?.overviewImages} onSelectImage={setSelectedOverviewImage} selectedImageKey={selectedOverviewImage?.key}/>;
            case 3: return <ImageBrowser title="Step 3: Select Label Image" images={selectedProduct?.labelImages} onSelectImage={setSelectedLabelImage} selectedImageKey={selectedLabelImage?.key} />;
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return <div>Invalid Step</div>;
        }
    }

    return (
        <div className="bg-[#111111] text-[#F5F5F5] min-h-screen font-sans p-8 flex items-center justify-center">
             <style>{`.styled-scrollbar::-webkit-scrollbar { width: 8px; } .styled-scrollbar::-webkit-scrollbar-track { background: #111; } .styled-scrollbar::-webkit-scrollbar-thumb { background: #2F2F2F; border-radius: 10px; }`}</style>
            <div className="w-full max-w-5xl">
                <h1 className="text-center text-4xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Aqua Product Verification
                    </span>
                </h1>
                <p className="text-center text-[#A0A0A0] mb-10">Follow the steps below to initiate a new visual verification.</p>
                
                <StepIndicator currentStep={step} />
                
                <div className="bg-[#1E1E1E] p-8 rounded-2xl border border-[#2F2F2F]">
                    {renderCurrentStep()}
                    {(step === 2 || step === 3) && (
                         <div className="flex justify-between mt-6">
                            <button onClick={handleBack} className="text-[#A0A0A0] font-bold py-3 px-8 rounded-lg bg-[#2F2F2F] hover:bg-white/10">Back</button>
                            <button onClick={handleNext} disabled={(step === 2 && !selectedOverviewImage) || (step === 3 && !selectedLabelImage)} className="text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 disabled:opacity-50">Next Step</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}