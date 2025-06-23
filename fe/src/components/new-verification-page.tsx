'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, AlertTriangle, HelpCircle, Package, ChevronRight, RefreshCw, ArrowLeft, ImageIcon as ImageIconLucide, FileText, Camera, Columns, List, Copy, Check, Expand, X } from 'lucide-react';
import StepIndicator from './step-indicator';
import ImageBrowser from './image-browser';
import RefrigeratorIcon from './icons/RefrigeratorIcon';
import WashingMachineIcon from './icons/WashingMachineIcon';
import TelevisionIcon from './icons/TelevisionIcon';
import type { ProductCategory, Product, ImageFile, VerificationMatchStatus, ExtendedVerificationResult } from '@/types';
import { getProductsForCategory, mockImageFiles } from '@/lib/mock-data';
import { getProducts, getImages, getOverviewImages, getLabelImages, getApiEndpoint, getApiKey, getCategoryCode } from '@/lib/api-client';
import { analyzeVerificationResult, AnalyzeVerificationResultOutput } from '@/ai/flows/analyze-verification-result';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const categories: { name: ProductCategory; icon: React.FC<React.SVGProps<SVGSVGElement>>; dataAiHint: string }[] = [
  { name: "Refrigerators", icon: RefrigeratorIcon, dataAiHint: "kitchen appliance" },
  { name: "Washing Machines", icon: WashingMachineIcon, dataAiHint: "laundry appliance" },
  { name: "Televisions", icon: TelevisionIcon, dataAiHint: "home entertainment" },
];

const wizardSteps = ["Product", "Overview Image", "Label Image", "Review", "Result"];

const NewVerificationPage: React.FC<{ onNavigate: (page: 'new' | 'results') => void }> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [overviewImage, setOverviewImage] = useState<ImageFile | null>(null);
  const [labelImage, setLabelImage] = useState<ImageFile | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [availableImages, setAvailableImages] = useState<ImageFile[]>([]);
  const [overviewImages, setOverviewImages] = useState<ImageFile[]>([]);
  const [labelImages, setLabelImages] = useState<ImageFile[]>([]);
  const [verificationResult, setVerificationResult] = useState<ExtendedVerificationResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState(false);
  const [copiedOverview, setCopiedOverview] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'label' | 'overview' | null>(null);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);

  const { toast } = useToast();

  // Copy function with fallback
  const handleCopy = async (text: string, type: 'label' | 'overview') => {
    if (!text || text.trim() === '') {
      toast({
        title: "Nothing to copy",
        description: "No text available to copy.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if clipboard API is available and we're in a secure context
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('Fallback copy failed');
        }
      }
      
      // Update state and show success message
      if (type === 'label') {
        setCopiedLabel(true);
        setTimeout(() => setCopiedLabel(false), 2000);
      } else {
        setCopiedOverview(true);
        setTimeout(() => setCopiedOverview(false), 2000);
      }
      
      toast({
        title: "Copied to clipboard",
        description: "AI analysis has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        title: "Failed to copy",
        description: "Unable to copy to clipboard. Please try selecting and copying the text manually.",
        variant: "destructive",
      });
    }
  };

  // Copy transaction ID function (no notification)
  const handleCopyTransactionId = async (transactionId: string) => {
    try {
      // Check if clipboard API is available and we're in a secure context
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(transactionId);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = transactionId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('Fallback copy failed');
        }
      }
      
      setCopiedTransactionId(true);
      setTimeout(() => setCopiedTransactionId(false), 2000);
    } catch (err) {
      // Silent fail - no notification as requested
      console.error('Copy transaction ID failed:', err);
    }
  };

  // Helper function to format AI text with line breaks after sentences
  const formatAIText = (text: string) => {
    if (!text) return null;
    
    // Split by periods followed by space or end of string, but preserve the period
    const sentences = text.split(/(?<=\.)(?:\s+|$)/);
    
    return sentences.map((sentence, index) => {
      // Trim whitespace and skip empty sentences
      const trimmed = sentence.trim();
      if (!trimmed) return null;
      
      return (
        <span key={index}>
          {trimmed}
          {index < sentences.length - 1 && (
            <>
              <br />
              <br />
            </>
          )}
        </span>
      );
    }).filter(Boolean);
  };

  // Expand Modal Component
  const ExpandedModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    type: 'label' | 'overview';
    image: ImageFile | null;
    explanation: string | null;
    confidence: number | null;
  }> = ({ isOpen, onClose, type, image, explanation, confidence }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl border border-border shadow-2xl w-[1490px] h-[1280px] overflow-auto">
          <div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              {type === 'label' ? <FileText size={24}/> : <Camera size={24}/>}
              {type === 'label' ? 'Label Analysis' : 'Overview Analysis'}
              <span className={cn(
                "px-2 py-1 text-xs font-semibold rounded-full ml-2",
                confidence && confidence >= 0.8 ? 'bg-status-correct/10 text-status-correct' : 
                confidence && confidence >= 0.5 ? 'bg-status-uncertain/10 text-status-uncertain' :
                'bg-status-incorrect/10 text-status-incorrect'
              )}>
                {explanation ? `Confidence: ${Math.round((confidence || 0) * 100)}%` : 'No Analysis'}
              </span>
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X size={16} />
            </Button>
          </div>
          
          <div className="p-6 h-[calc(1280px-80px)] flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Image Section */}
              {image && (
                <div className="flex flex-col h-full">
                  <h4 className="text-lg font-semibold mb-4">Image</h4>
                  <div className="relative flex-1 bg-muted/20 rounded-lg overflow-hidden min-h-0">
                    <Image 
                      src={image.dataUri} 
                      alt={type === 'label' ? 'Label Image' : 'Overview Image'}
                      fill 
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
              
              {/* Analysis Section */}
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Analysis</h4>
                  <button
                    onClick={() => explanation && handleCopy(explanation, type)}
                    className="p-2 rounded-md hover:bg-muted/50 transition-colors"
                    title="Copy analysis"
                  >
                    {(type === 'label' ? copiedLabel : copiedOverview) ? (
                      <Check size={16} className="text-status-correct" />
                    ) : (
                      <Copy size={16} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="bg-muted/20 p-4 rounded-lg flex-1 min-h-0">
                  <div className="text-lg text-foreground leading-relaxed h-full overflow-y-auto">
                    {explanation ? formatAIText(explanation) : (
                      <p className="text-muted-foreground italic">No analysis available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const loadProducts = async () => {
      if (selectedCategory) {
        setIsLoadingProducts(true);
        setSelectedProduct(null);
        setOverviewImage(null);
        setLabelImage(null);
        
        try {
          const categoryCode = getCategoryCode(selectedCategory);
          const products = await getProducts(categoryCode as ProductCategory);
          setAvailableProducts(products);
        } catch (error) {
          console.error('Failed to load products:', error);
          toast({
            title: "Error Loading Products",
            description: "Failed to load products for the selected category. Please try again.",
            variant: "destructive",
          });
          setAvailableProducts([]);
        } finally {
          setIsLoadingProducts(false);
        }
      } else {
        setAvailableProducts([]);
      }
    };

    loadProducts();
  }, [selectedCategory, toast]);

  // Load images when entering step 2 (overview) or step 3 (label)
  useEffect(() => {
    const loadStepImages = async () => {
      if (!selectedProduct || !selectedCategory) return;
      
      const categoryCode = getCategoryCode(selectedCategory);
      
      if (currentStep === 2 && overviewImages.length === 0) {
        // Load overview images for step 2
        setIsLoadingImages(true);
        try {
          const images = await getOverviewImages(selectedProduct.id, categoryCode);
          setOverviewImages(images);
        } catch (error) {
          console.error('Failed to load overview images:', error);
          toast({
            title: "Error Loading Overview Images",
            description: "Failed to load overview images for the selected product. Please try again.",
            variant: "destructive",
          });
          setOverviewImages([]);
        } finally {
          setIsLoadingImages(false);
        }
      } else if (currentStep === 3 && labelImages.length === 0) {
        // Load label images for step 3
        setIsLoadingImages(true);
        try {
          const images = await getLabelImages(selectedProduct.id, categoryCode);
          setLabelImages(images);
        } catch (error) {
          console.error('Failed to load label images:', error);
          toast({
            title: "Error Loading Label Images",
            description: "Failed to load label images for the selected product. Please try again.",
            variant: "destructive",
          });
          setLabelImages([]);
        } finally {
          setIsLoadingImages(false);
        }
      }
    };

    loadStepImages();
  }, [currentStep, selectedProduct, selectedCategory, overviewImages.length, labelImages.length, toast]);

  const handleCategorySelect = (category: ProductCategory) => {
    setSelectedCategory(category);
  };

  const handleProductSelect = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setOverviewImage(null);
    setLabelImage(null);
    // Clear cached images when product changes
    setOverviewImages([]);
    setLabelImages([]);
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, wizardSteps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const submitVerification = async (aiInput: any) => {
    const apiEndpoint = await getApiEndpoint();
    const apiKey = await getApiKey();
    const res = await fetch(`${apiEndpoint}/validate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(aiInput),
    });
    if (!res.ok) {
      const errorBody = await res.text();
      console.error('API Error Response:', errorBody);
      throw new Error(`Failed to validate: ${res.status} ${res.statusText}`);
    }
    return res.json();
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !overviewImage || !labelImage || !selectedCategory) {
      toast({
        title: "Missing Information",
        description: "Please ensure all fields are selected before submitting.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setSubmissionError(null);
    setVerificationResult(null);
    setProgressValue(0);
    setCurrentStep(wizardSteps.length);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgressValue(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);
    try {
      const categoryCode = getCategoryCode(selectedCategory);
      const aiInput = {
        product_id: selectedProduct.id,
        product_category: categoryCode,
        uploaded_overview_image_key: overviewImage.key,
        uploaded_label_image_key: labelImage.key,
      };
      const result = await submitVerification(aiInput);
      
      // Map backend response to frontend format
      // Determine match status based on both label and overview verification results
      let matchStatus: VerificationMatchStatus;
      const labelMatch = result.matchLabelToReference?.toLowerCase();
      const overviewMatch = result.matchOverviewToReference?.toLowerCase();
      
      // Map individual match results to status
      const mapMatchToStatus = (match: string): VerificationMatchStatus => {
        if (match === 'yes') return 'Correct';
        if (match === 'no') return 'Incorrect';
        return 'Uncertain';
      };
      
      const labelMatchStatus = mapMatchToStatus(labelMatch);
      const overviewMatchStatus = mapMatchToStatus(overviewMatch);
      
      // Overall status logic
      if (labelMatch === 'yes' && overviewMatch === 'yes') {
        matchStatus = 'Correct';
      } else if (labelMatch === 'no' || overviewMatch === 'no') {
        matchStatus = 'Incorrect';
      } else {
        matchStatus = 'Uncertain';
      }
      
      const mappedResult: ExtendedVerificationResult = {
        matchStatus,
        confidenceScore: Math.max(
          result.matchLabelToReference_confidence || 0,
          result.matchOverviewToReference_confidence || 0
        ),
        explanation: [
          result.label_explanation,
          result.overview_explanation
        ].filter(Boolean).join(' '),
        uploadedOverviewImage: overviewImage?.key || '',
        uploadedLabelImage: labelImage?.key || '',
        referenceImages: [], // Backend doesn't return reference images in this format
        labelExplanation: result.label_explanation,
        overviewExplanation: result.overview_explanation,
        labelConfidence: result.matchLabelToReference_confidence || 0,
        overviewConfidence: result.matchOverviewToReference_confidence || 0,
        labelMatchStatus,
        overviewMatchStatus,
        transactionId: result.transactionId,
        timestamp: new Date().toISOString() // Add current timestamp
      };
      
      clearInterval(progressInterval);
      setProgressValue(100);
      setVerificationResult(mappedResult);
    } catch (error) {
      console.error("Verification Error:", error);
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : "Failed to get verification result. Please try again.";
      setSubmissionError(errorMessage);
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const startNewVerification = () => {
    setCurrentStep(1);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setOverviewImage(null);
    setLabelImage(null);
    setVerificationResult(null);
    setIsLoading(false);
    setSubmissionError(null);
  };

  const getCurrentImageSet = (): ImageFile[] => {
    if (currentStep === 2) {
      // Step 2: Overview Image - show images from CHÍNH DIỆN folder
      return overviewImages;
    } else if (currentStep === 3) {
      // Step 3: Label Image - show images from TEM NL folder
      return labelImages;
    }
    return [];
  };

  const getConfidenceBadgeColors = (confidence: number) => {
    if (confidence >= 0.8) {
      return 'bg-status-correct text-primary-foreground'; // Green
    } else if (confidence >= 0.5) {
      return 'bg-status-uncertain text-primary-foreground'; // Yellow
    } else {
      return 'bg-status-incorrect text-destructive-foreground'; // Red
    }
  };

  // Parse AI explanation to extract key-value pairs and summary
  const parseAIExplanation = (explanation: string, isLabelAnalysis: boolean = false) => {
    const keyFindings: { key: string; value: string; status?: 'match' | 'mismatch' | 'info' }[] = [];
    const details: { key: string; value: string }[] = [];
    
    // Common patterns to extract
    const patterns = {
      productCode: /product (?:code|model|ID)[:\s]+([A-Z0-9\-\(\)]+)/gi,
      capacity: /capacity[:\s]+(\d+[A-Z]+)/gi,
      energyConsumption: /energy consumption[:\s]+(\d+\.?\d*\s*kWh\/[^\s,]+)/gi,
      power: /(?:power|rated power|power rating)[:\s]+(\d+\.?\d*\s*W)/gi,
      energyRating: /energy (?:efficiency )?rating[:\s]+(\d+\.?\d*)/gi,
      starRating: /(\d+)-star rating/gi,
      manufacturer: /manufacturer[:\s]+([^,\.\n]+)/gi,
      technology: /(Twin Inverter|TWIN INVERTER|Inverter)/gi,
      doors: /(\d+)-door|(\d+) doors?/gi,
      color: /(glossy black|black|silver|white|grey|dark grey)/gi,
    };

    // Extract key information
    const text = explanation.toLowerCase();
    
    // Check for matches/mismatches
    if (text.includes('match') || text.includes('correct')) {
      // Product code match/mismatch
      const codeMatch = explanation.match(patterns.productCode);
      if (codeMatch) {
        const codes = Array.from(new Set(codeMatch.map(m => m.match(/[A-Z0-9\-\(\)]+$/)?.[0]).filter(Boolean)));
        if (codes.length >= 2) {
          keyFindings.push({
            key: 'Product Code',
            value: codes.join(' vs '),
            status: text.includes('mismatch') || text.includes('incorrect') ? 'mismatch' : 'match'
          });
        } else if (codes.length === 1) {
          keyFindings.push({
            key: 'Product Code',
            value: codes[0] || '',
            status: 'match'
          });
        }
      }
    }

    // Extract specifications
    const capacityMatch = explanation.match(patterns.capacity);
    if (capacityMatch) {
      details.push({ key: 'Capacity', value: capacityMatch[0].split(':').pop()?.trim() || '' });
    }

    const energyMatch = explanation.match(patterns.energyConsumption);
    if (energyMatch) {
      details.push({ key: 'Energy Consumption', value: energyMatch[0].split(':').pop()?.trim() || '' });
    }

    const powerMatch = explanation.match(patterns.power);
    if (powerMatch) {
      details.push({ key: 'Power Rating', value: powerMatch[0].split(':').pop()?.trim() || '' });
    }

    const ratingMatch = explanation.match(patterns.energyRating);
    if (ratingMatch) {
      details.push({ key: 'Energy Efficiency', value: ratingMatch[0].split(':').pop()?.trim() || '' });
    }

    const starMatch = explanation.match(patterns.starRating);
    if (starMatch) {
      details.push({ key: 'Star Rating', value: starMatch[0] });
    }

    // Extract visual features for overview analysis
    if (!isLabelAnalysis) {
      const doorMatch = explanation.match(patterns.doors);
      if (doorMatch) {
        details.push({ key: 'Configuration', value: doorMatch[0] });
      }

      const colorMatch = explanation.match(patterns.color);
      if (colorMatch) {
        details.push({ key: 'Color/Finish', value: colorMatch[0] });
      }

      const techMatch = explanation.match(patterns.technology);
      if (techMatch) {
        details.push({ key: 'Technology', value: techMatch[0] });
      }
    }

    // Generate summary based on findings
    let summary = '';
    if (text.includes('exact') && text.includes('match')) {
      summary = 'Perfect match with all specifications aligned';
    } else if (text.includes('mismatch') || text.includes('incorrect')) {
      summary = 'Critical mismatches found in product identification';
    } else if (text.includes('match') && text.includes('consistent')) {
      summary = 'Product verified with matching key features';
    } else if (text.includes('uncertain')) {
      summary = 'Unable to verify due to insufficient information';
    } else {
      summary = 'Analysis completed with mixed results';
    }

    return { keyFindings, details, summary, originalText: explanation };
  };

  function renderStepContent() {
    switch (currentStep) {
      case 1: 
        return (
          <>
            <div>
            <h2 className="text-xl font-bold mb-4 text-primary">Step 1: Select Product</h2>
            <div className="space-y-4">
              <div>
                <label className="font-semibold block mb-2 text-sm text-primary">Product Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <button 
                      key={cat.name} 
                      onClick={() => handleCategorySelect(cat.name)}
                      className={cn(
                        "p-4 border-2 rounded-xl text-center transition-all group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card",
                        selectedCategory === cat.name 
                          ? 'bg-purple-600/30 border-purple-500 shadow-lg scale-105' 
                          : 'border-border hover:bg-muted/50 hover:border-accent'
                      )}
                      aria-pressed={selectedCategory === cat.name}
                    >
                      <cat.icon 
                        className={cn(
                          "w-8 h-8 mx-auto mb-2 transition-colors",
                           selectedCategory === cat.name ? "text-purple-400" : "text-muted-foreground group-hover:text-foreground"
                        )} 
                        data-ai-hint={cat.dataAiHint} />
                      <div className={cn("text-sm mt-1 font-medium", selectedCategory === cat.name ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{cat.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                 <label className="font-semibold block mb-2 text-sm text-primary">Product ID</label>
                 <Select 
                    onValueChange={handleProductSelect} 
                    value={selectedProduct?.id || ""} 
                    disabled={!selectedCategory || isLoadingProducts || availableProducts.length === 0}
                 >
                    <SelectTrigger 
                      aria-label="Select Product ID" 
                      className="w-full bg-background border-border rounded-lg p-3 md:p-4 h-auto text-base md:text-lg focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50 text-foreground placeholder:text-muted-foreground"
                    >
                      {isLoadingProducts ? (
                        <div className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading products...
                        </div>
                      ) : (
                        <SelectValue placeholder={selectedCategory ? 'Select a product ID' : 'First select a category'} />
                      )}
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {isLoadingProducts ? (
                        <SelectItem value="loading" disabled className="text-base">
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading products...
                          </div>
                        </SelectItem>
                      ) : availableProducts.length > 0 ? (
                        availableProducts.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-base focus:bg-accent/50 hover:bg-accent/30">
                            <span className="font-code">{p.id}</span> - <span className="text-muted-foreground">{p.name}</span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-products" disabled className="text-base">
                          {selectedCategory ? 'No products for this category' : 'Select a category first'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
            </div>
            </div>
            <Button onClick={nextStep} disabled={!selectedProduct} className="w-full mt-6 text-white font-bold py-2.5 px-6 rounded-lg bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to hover:opacity-90 disabled:opacity-50 disabled:from-muted disabled:to-muted/80 text-sm">
              Next Step <ChevronRight size={22} className="ml-2"/>
            </Button>
            </div>
          </>
        );
      case 2: 
      case 3: 
        const isOverviewStep = currentStep === 2;
        const navButtons = (
            <div className="flex justify-between w-full">
                <Button onClick={prevStep} variant="outline" className="text-muted-foreground font-bold py-3 px-6 rounded-lg bg-secondary hover:bg-muted/80 border-0 text-base">
                    <ArrowLeft size={20} className="mr-2"/> Back
                </Button>
                <Button onClick={nextStep} disabled={isOverviewStep ? !overviewImage : !labelImage} className="text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to hover:opacity-90 disabled:opacity-50 disabled:from-muted disabled:to-muted/80 text-base">
                    Next Step <ChevronRight size={20} className="ml-2"/>
                </Button>
            </div>
        );
        return (
          <>
            {isLoadingImages ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Loading images...</p>
              </div>
            ) : (
              <ImageBrowser 
                  images={getCurrentImageSet()} 
                  onImageSelect={isOverviewStep ? setOverviewImage : setLabelImage} 
                  selectedImage={isOverviewStep ? overviewImage : labelImage} 
                  title={`Step ${currentStep}: Select ${isOverviewStep ? 'Overview' : 'Label'} Image`}
                  imageTypeHint={isOverviewStep ? "product overview" : "product label"}
                  actionButtons={navButtons}
              />
            )}
          </>
        );
      case 4: 
        return (
             <div className="bg-card p-6 rounded-2xl border border-border h-[70vh] flex flex-col">
                 <h3 className="font-bold text-lg text-primary mb-4">Step 4: Review and Submit</h3>
                 <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                     {/* Product Information - Now at the top */}
                     <div>
                         <h4 className="text-lg font-semibold mb-3 text-primary">Product Information</h4>
                         <div className="grid grid-cols-3 gap-4 bg-muted/20 p-4 rounded-lg">
                             <div className="text-center">
                                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Category</span>
                                 <p className="font-medium text-sm mt-1">{selectedCategory}</p>
                             </div>
                             <div className="text-center">
                                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Product ID</span>
                                 <p className="font-mono font-medium text-sm mt-1">{selectedProduct?.id}</p>
                             </div>
                             <div className="text-center">
                                 <span className="text-xs text-muted-foreground uppercase tracking-wide">Product Name</span>
                                 <p className="font-medium text-sm mt-1">{selectedProduct?.name}</p>
                             </div>
                         </div>
                     </div>
                     
                     {/* Selected Images - Now below Product Information */}
                     <div className="flex-grow flex flex-col">
                         <h4 className="text-lg font-semibold mb-3 text-primary">Selected Images</h4>
                         <div className="grid grid-cols-2 gap-4 flex-grow">
                             <div className="flex flex-col">
                                 <p className="text-sm font-medium text-muted-foreground mb-2">Overview Image</p>
                                 {overviewImage && (
                                     <div className="relative flex-grow rounded-lg overflow-hidden border border-border min-h-[180px]">
                                         <Image 
                                             src={overviewImage.dataUri} 
                                             alt="Overview" 
                                             fill
                                             className="object-cover"
                                         />
                                     </div>
                                 )}
                             </div>
                             <div className="flex flex-col">
                                 <p className="text-sm font-medium text-muted-foreground mb-2">Label Image</p>
                                 {labelImage && (
                                     <div className="relative flex-grow rounded-lg overflow-hidden border border-border min-h-[180px]">
                                         <Image 
                                             src={labelImage.dataUri} 
                                             alt="Label" 
                                             fill
                                             className="object-cover"
                                         />
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                     
                     {/* Action Buttons - now inside the card */}
                     <div className="flex justify-between pt-4 border-t border-border">
                         <Button onClick={prevStep} variant="outline" className="text-muted-foreground font-bold py-3 px-6 rounded-lg bg-secondary hover:bg-muted/80 border-0 text-base">
                             <ArrowLeft size={20} className="mr-2"/> Back
                         </Button>
                         <Button onClick={handleSubmit} className="text-white font-bold py-3 px-6 rounded-lg bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to hover:opacity-90 text-base">
                             Submit for Verification <ChevronRight size={20} className="ml-2"/>
                         </Button>
                     </div>
                 </div>
             </div>
        );
      case 5:
        if (isLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-primary">Processing Verification</h3>
                <p className="text-muted-foreground text-lg">Please wait while we analyze your submission...</p>
              </div>
              <div className="space-y-2 w-80">
                <Progress value={progressValue} className="w-full h-3 [&>div]:bg-gradient-to-r [&>div]:from-accent-gradient-from [&>div]:via-accent-gradient-via [&>div]:to-accent-gradient-to" />
                <p className="text-center text-sm text-muted-foreground">
                  {Math.round(progressValue)}% Complete
                </p>
              </div>
            </div>
          );
        }
        if (submissionError) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
              <XCircle className="h-20 w-20 text-destructive" />
              <h3 className="text-2xl md:text-3xl font-bold text-destructive">Verification Failed</h3>
              <p className="text-muted-foreground text-base md:text-lg">{submissionError || "An unexpected error occurred."}</p>
              <Button onClick={startNewVerification} className="w-full md:w-auto mt-10 text-white font-bold py-3.5 px-8 rounded-lg bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to hover:opacity-90 text-base">
                Start New Verification
              </Button>
            </div>
          );
        }
        if (verificationResult) {
          const { matchStatus, confidenceScore, explanation, labelExplanation, overviewExplanation, labelConfidence, overviewConfidence, labelMatchStatus, overviewMatchStatus, referenceImages, transactionId, timestamp } = verificationResult;
          let statusColorClass = '';
          let StatusIcon = HelpCircle;
          let resultText = matchStatus;

          if (matchStatus === 'Correct') { statusColorClass = 'text-status-correct'; StatusIcon = CheckCircle; resultText = "Correct"; }
          else if (matchStatus === 'Incorrect') { statusColorClass = 'text-status-incorrect'; StatusIcon = XCircle; resultText = "Incorrect"; }
          else if (matchStatus === 'Uncertain') { statusColorClass = 'text-status-uncertain'; StatusIcon = AlertTriangle; resultText = "Uncertain"; }


          return (
            <div className="w-full max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Step 5: Verification Result</h2>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                            Confidence: {Math.round((confidenceScore || 0) * 100)}%
                        </span>
                        <span className={cn(
                            "px-3 py-1.5 text-sm font-semibold rounded-full",
                            matchStatus === 'Correct' ? 'bg-status-correct/10 text-status-correct border border-status-correct/20' :
                            matchStatus === 'Incorrect' ? 'bg-status-incorrect/10 text-status-incorrect border border-status-incorrect/20' :
                            'bg-status-uncertain/10 text-status-uncertain border border-status-uncertain/20'
                        )}>
                            {resultText}
                        </span>
                    </div>
                </div>
                
                {/* Product Info - Now at the top */}
                <div className="bg-card p-6 rounded-xl border border-border mb-6">
                    <h4 className="text-lg font-semibold text-primary mb-4">Verification Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="group">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction ID</p>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-sm font-mono font-medium text-foreground">{transactionId || 'N/A'}</p>
                                {transactionId && (
                                    <button
                                        onClick={() => handleCopyTransactionId(transactionId)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-md hover:bg-muted/50 ml-2"
                                        title="Copy transaction ID"
                                    >
                                        {copiedTransactionId ? (
                                            <Check size={14} className="text-status-correct" />
                                        ) : (
                                            <Copy size={14} className="text-muted-foreground" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timestamp</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                                {(() => {
                                    try {
                                        return timestamp ? format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss') : 'N/A';
                                    } catch (error) {
                                        return 'Invalid date';
                                    }
                                })()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product ID</p>
                            <p className="text-sm font-medium text-foreground mt-1">{selectedProduct?.id}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product Category</p>
                            <p className="text-sm font-medium text-foreground mt-1">{selectedCategory}</p>
                        </div>
                    </div>
                </div>
                
                {/* Analysis Cards - Now in a horizontal layout with 60% more width */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Label Analysis Card */}
                        <div className="bg-card p-4 rounded-xl border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-bold flex items-center gap-2">
                                    <FileText size={20}/>
                                    Label Analysis
                                </h4>
                                <div className="flex items-center gap-2">
                                    {labelExplanation && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {Math.round((labelConfidence || 0) * 100)}%
                                        </span>
                                    )}
                                    <span className={cn(
                                        "px-2 py-1 text-xs font-semibold rounded-full",
                                        !labelExplanation ? 'bg-muted/50 text-muted-foreground' :
                                        labelMatchStatus === 'Correct' ? 'bg-status-correct/10 text-status-correct' : 
                                        labelMatchStatus === 'Uncertain' ? 'bg-status-uncertain/10 text-status-uncertain' :
                                        'bg-status-incorrect/10 text-status-incorrect'
                                    )}>
                                        {!labelExplanation ? 'No Analysis' : labelMatchStatus}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-muted/10 p-4 rounded-lg border border-border group relative">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-auto">
                                        <button
                                            onClick={() => setExpandedSection('label')}
                                            className="p-1.5 rounded-md hover:bg-muted/50"
                                            title="Expand view"
                                        >
                                            <Expand size={16} className="text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => labelExplanation && handleCopy(labelExplanation, 'label')}
                                            className="p-1.5 rounded-md hover:bg-muted/50"
                                            title="Copy analysis"
                                        >
                                            {copiedLabel ? (
                                                <Check size={16} className="text-status-correct" />
                                            ) : (
                                                <Copy size={16} className="text-muted-foreground" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Image Preview at the top */}
                                {labelImage && (
                                    <div className="mb-4">
                                        <div className="relative w-full h-48 mb-3">
                                            <Image 
                                                src={labelImage.dataUri} 
                                                alt="Uploaded Label" 
                                                fill 
                                                className="object-contain rounded-md"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* AI Text Analysis */}
                                <div className="text-base text-foreground leading-relaxed">
                                    {labelExplanation ? formatAIText(labelExplanation) : (
                                        <p className="text-muted-foreground italic">No label analysis available</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    
                        {/* Overview Analysis Card */}
                        <div className="bg-card p-4 rounded-xl border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-bold flex items-center gap-2">
                                    <Camera size={20}/>
                                    Overview Analysis
                                </h4>
                                <div className="flex items-center gap-2">
                                    {overviewExplanation && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {Math.round((overviewConfidence || 0) * 100)}%
                                        </span>
                                    )}
                                    <span className={cn(
                                        "px-2 py-1 text-xs font-semibold rounded-full",
                                        !overviewExplanation ? 'bg-muted/50 text-muted-foreground' :
                                        overviewMatchStatus === 'Correct' ? 'bg-status-correct/10 text-status-correct' : 
                                        overviewMatchStatus === 'Uncertain' ? 'bg-status-uncertain/10 text-status-uncertain' :
                                        'bg-status-incorrect/10 text-status-incorrect'
                                    )}>
                                        {!overviewExplanation ? 'No Analysis' : overviewMatchStatus}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-muted/10 p-4 rounded-lg border border-border group relative">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-auto">
                                        <button
                                            onClick={() => setExpandedSection('overview')}
                                            className="p-1.5 rounded-md hover:bg-muted/50"
                                            title="Expand view"
                                        >
                                            <Expand size={16} className="text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => overviewExplanation && handleCopy(overviewExplanation, 'overview')}
                                            className="p-1.5 rounded-md hover:bg-muted/50"
                                            title="Copy analysis"
                                        >
                                            {copiedOverview ? (
                                                <Check size={16} className="text-status-correct" />
                                            ) : (
                                                <Copy size={16} className="text-muted-foreground" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Image Preview at the top */}
                                {overviewImage && (
                                    <div className="mb-4">
                                        <div className="relative w-full h-48 mb-3">
                                            <Image 
                                                src={overviewImage.dataUri} 
                                                alt="Uploaded Overview" 
                                                fill 
                                                className="object-contain rounded-md"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* AI Text Analysis */}
                                <div className="text-base text-foreground leading-relaxed">
                                    {overviewExplanation ? formatAIText(overviewExplanation) : (
                                        <p className="text-muted-foreground italic">No overview analysis available</p>
                                    )}
                                </div>
                            </div>
                        </div>
                </div>
                
                {/* Bottom Action Buttons */}
                <div className="flex justify-between mt-8">
                    <Button onClick={() => onNavigate('results')} variant="outline" className="font-bold py-3 px-8 rounded-lg text-muted-foreground bg-secondary hover:bg-muted/80 border-0">View All Results</Button>
                    <Button onClick={startNewVerification} className="text-white font-bold py-3 px-8 rounded-lg bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to hover:opacity-90">Start New Verification</Button>
                </div>
            </div>
          );
        }
        return null;
    }
  };

  return (
    <div className="bg-background text-foreground font-body p-4 md:p-6 min-h-full flex items-center justify-center">
        {/* Expanded Modals */}
        <ExpandedModal
          isOpen={expandedSection === 'label'}
          onClose={() => setExpandedSection(null)}
          type="label"
          image={labelImage}
          explanation={verificationResult?.labelExplanation || null}
          confidence={verificationResult?.labelConfidence || null}
        />
        
        <ExpandedModal
          isOpen={expandedSection === 'overview'}
          onClose={() => setExpandedSection(null)}
          type="overview"
          image={overviewImage}
          explanation={verificationResult?.overviewExplanation || null}
          confidence={verificationResult?.overviewConfidence || null}
        />

        <div className={cn("w-full", (currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) ? 'max-w-7xl' : 'max-w-5xl')}> 
            <h1 className="text-center text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                <span className="bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to bg-clip-text text-transparent">
                    Aqua Product Verification
                </span>
            </h1>
            <p className="text-center text-muted-foreground mb-4 text-sm md:text-base">Verify product authenticity with AI-powered analysis</p>
            
            {currentStep < wizardSteps.length && (
              <div className="mb-4">
                <StepIndicator steps={wizardSteps} currentStep={currentStep} />
              </div>
            )}
            
            {(currentStep === 2 || currentStep === 3) ? (
              <div className="w-full">
                {renderStepContent()}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border shadow-xl p-4 md:p-6">
                {renderStepContent()}
              </div>
            )}
        </div>
    </div>
  );
};

export default NewVerificationPage;
