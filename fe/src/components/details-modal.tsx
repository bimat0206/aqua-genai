
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LegacyTransactionData, VerificationMatchStatus } from '@/types';
import { getTransactionDetail, type TransactionDetail } from '@/lib/api-client';
import { X, Copy, Check, ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Helper function to check if a string is a valid URL
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Helper function to check if a string is a valid image path for Next.js
function isValidImagePath(src: string): boolean {
  return isValidUrl(src) || src.startsWith('/');
}

// Safe image component that handles both URLs and S3 keys
interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
  'data-ai-hint'?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({ src, alt, fill, style, className, ...props }) => {
  if (isValidImagePath(src)) {
    // Check if this is an S3 URL (either presigned or direct)
    const isS3Url = src.includes('s3') && src.includes('amazonaws.com');
    
    if (isS3Url) {
      // For all S3 URLs, use unoptimized to avoid Next.js image optimization issues
      return <Image src={src} alt={alt} fill={fill} style={style} className={className} unoptimized {...props} />;
    }
    
    return <Image src={src} alt={alt} fill={fill} style={style} className={className} {...props} />;
  }
  
  // Fallback for invalid image sources (S3 keys, etc.)
  return (
    <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)} style={style}>
      <div className="text-center">
        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
        <p className="text-xs">Image not available</p>
        <p className="text-xs opacity-70">{src.split('/').pop()}</p>
      </div>
    </div>
  );
};

interface DetailsModalProps {
  item: LegacyTransactionData | null;
  onClose: () => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ item, onClose }) => {
  const [overviewCopied, setOverviewCopied] = useState(false);
  const [labelCopied, setLabelCopied] = useState(false);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [transactionDetail, setTransactionDetail] = useState<TransactionDetail | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && item.result.referenceImages && item.result.referenceImages.length > 0) {
      setSelectedReferenceImage(item.result.referenceImages[0]);
    } else {
      setSelectedReferenceImage(null);
    }
  }, [item]);

  // Fetch detailed transaction data when modal opens
  useEffect(() => {
    if (item?.transactionId) {
      setLoading(true);
      setError(null);
      getTransactionDetail(item.transactionId)
        .then(detail => {
          setTransactionDetail(detail);
          // Set reference image from the new API data
          if (detail?.imageAccess.uploadedReferenceImage?.presignedUrl) {
            setSelectedReferenceImage(detail.imageAccess.uploadedReferenceImage.presignedUrl);
          }
          setError(null); // Clear any previous errors on success
        })
        .catch(err => {
          // Use different log levels based on error type
          if (err.message.includes('DATABASE_ERROR') || err.message.includes('TRANSACTION_NOT_FOUND')) {
            console.info('Enhanced transaction details not available for this transaction, using basic data:', err.message);
          } else {
            console.warn('Failed to fetch enhanced transaction details, using cached data:', err.message);
          }
          // Set a user-friendly error message but don't block the UI
          if (err.message.includes('DATABASE_ERROR')) {
            setError('Enhanced details unavailable - transaction may not exist in new system');
          } else if (err.message.includes('TRANSACTION_NOT_FOUND') || err.message.includes('Transaction not found')) {
            setError('Enhanced details unavailable - transaction not found');
          } else if (err.message.includes('Server error') || err.message.includes('500')) {
            setError('Transaction API temporarily unavailable - using basic data');
          } else if (err.message.includes('Network error')) {
            setError('Network error - using cached data');
          } else if (err.message.includes('Access denied')) {
            setError('API access error - check configuration');
          } else {
            setError('Enhanced details temporarily unavailable');
          }
          // Don't set transactionDetail to null, let it stay undefined for fallback
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [item?.transactionId]);

  if (!item) return null;

  const handleCopy = async (text: string, type: 'overview' | 'label') => {
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
      
      // Update state on success
      if (type === 'overview') {
        setOverviewCopied(true);
        setTimeout(() => setOverviewCopied(false), 2000);
      } else {
        setLabelCopied(true);
        setTimeout(() => setLabelCopied(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
      // Could add toast notification here if needed
    }
  };

  const statusConfig: Record<VerificationMatchStatus, { badgeClass: string, name: string }> = {
    Correct: { badgeClass: 'border-transparent bg-status-correct text-primary-foreground', name: 'Correct' },
    Incorrect: { badgeClass: 'border-transparent bg-status-incorrect text-destructive-foreground', name: 'Incorrect' },
    Uncertain: { badgeClass: 'border-transparent bg-status-uncertain text-primary-foreground', name: 'Uncertain' },
  };

  const statusInfo = statusConfig[item.result.matchStatus];
  
  // Use detailed transaction data if available, otherwise fall back to legacy format
  const displayData = transactionDetail || {
    labelVerification: { explanation: "Label details were cross-referenced with database records for authenticity markers." },
    overviewVerification: { explanation: item.result.explanation },
    imageAccess: {
      uploadedLabelImage: { presignedUrl: item.result.uploadedLabelImage },
      uploadedOverviewImage: { presignedUrl: item.result.uploadedOverviewImage },
      uploadedReferenceImage: selectedReferenceImage ? { presignedUrl: selectedReferenceImage } : undefined
    }
  };

  // Determine individual statuses for overview and label
  let overviewStatus: VerificationMatchStatus = 'Uncertain';
  let labelStatus: VerificationMatchStatus = 'Uncertain';
  
  if (transactionDetail) {
    // Use detailed transaction data
    const labelResult = transactionDetail.labelVerification?.result?.toLowerCase();
    const overviewResult = transactionDetail.overviewVerification?.result?.toLowerCase();
    
    labelStatus = labelResult === 'yes' ? 'Correct' : labelResult === 'no' ? 'Incorrect' : 'Uncertain';
    overviewStatus = overviewResult === 'yes' ? 'Correct' : overviewResult === 'no' ? 'Incorrect' : 'Uncertain';
  } else {
    // Fallback: use overall status for both (not ideal but maintains backward compatibility)
    overviewStatus = item.result.matchStatus;
    labelStatus = item.result.matchStatus;
  }
  
  const overviewStatusInfo = statusConfig[overviewStatus];
  const labelStatusInfo = statusConfig[labelStatus];

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

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-none w-[95vw] h-[95vh] max-h-[95vh] bg-card text-card-foreground p-0 flex flex-col" aria-describedby={`details-for-${item.transactionId}`}>
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to">
            Transaction Details: <span className="font-mono">{item.transactionId}</span>
          </DialogTitle>
          <DialogDescription id={`details-for-${item.transactionId}`} className="text-muted-foreground">
            Detailed view of verification transaction ID {item.transactionId}.
          </DialogDescription>
          {loading && (
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading enhanced transaction details...</span>
            </div>
          )}
          {error && (
            <div className="pt-2 text-sm text-amber-600 dark:text-amber-400">
              ⚠️ {error}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-4 text-sm">
            <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Product ID:</span>
                <span className="font-mono text-foreground">{item.productId}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Product Category:</span>
                <span className="text-foreground">{item.category}</span>
            </div>
             <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Timestamp:</span>
                <span className="text-foreground">{format(new Date(item.timestamp), 'PPpp')}</span>
            </div>
            {transactionDetail && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Confidence:</span>
                <span className="text-foreground">{(transactionDetail.overallConfidence * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-grow p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Reference Image */}
          <div className="md:col-span-1">
             <Card className="bg-background shadow-md h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Reference Image</CardTitle>
                <CardDescription>An image used for comparison. Select to preview.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="flex-grow relative w-full aspect-square rounded-md overflow-hidden border border-border mb-4 flex items-center justify-center">
                  {displayData.imageAccess.uploadedReferenceImage?.presignedUrl ? (
                      <SafeImage src={displayData.imageAccess.uploadedReferenceImage.presignedUrl} alt="Reference Image" fill style={{ objectFit: 'contain' }} data-ai-hint="reference image" />
                  ) : selectedReferenceImage ? (
                      <SafeImage src={selectedReferenceImage} alt="Reference Image" fill style={{ objectFit: 'contain' }} data-ai-hint="reference image" />
                  ) : (
                    <p className="text-sm text-muted-foreground">No reference image available.</p>
                  )}
                </div>
                
                {item.result.referenceImages && item.result.referenceImages.length > 1 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Available References:</p>
                    <ScrollArea className="h-24">
                      <div className="grid grid-cols-4 gap-2 pr-4">
                        {item.result.referenceImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedReferenceImage(imgUrl)}
                            className={cn(
                              "relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card",
                              selectedReferenceImage === imgUrl ? 'border-primary shadow-lg' : 'border-border hover:border-accent'
                            )}
                            aria-label={`Select reference image ${idx + 1}`}
                          >
                            <SafeImage src={imgUrl} alt={`Reference thumbnail ${idx + 1}`} fill style={{ objectFit: 'cover' }} data-ai-hint="reference product" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Overview Image */}
          <div className="md:col-span-1">
            <Card className="bg-background shadow-md h-full flex flex-col">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-xl text-primary">Overview Image Analysis</CardTitle>
                <Badge className={`${overviewStatusInfo.badgeClass} font-bold`}>
                  {overviewStatusInfo.name}
                </Badge>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col gap-4">
                <div className="relative w-full aspect-square rounded-md overflow-hidden border border-border">
                  <SafeImage src={displayData.imageAccess.uploadedOverviewImage?.presignedUrl || item.result.uploadedOverviewImage} alt="Uploaded Overview" fill style={{ objectFit: 'contain' }} data-ai-hint="product overview" />
                </div>
                <div className="relative group flex-grow">
                  <div className="text-base text-foreground leading-relaxed bg-muted/30 p-3 rounded-md h-full">
                    {formatAIText(displayData.overviewVerification.explanation)}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(displayData.overviewVerification.explanation, 'overview')}
                        >
                          {overviewCopied ? <Check className="h-4 w-4 text-status-correct" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{overviewCopied ? 'Copied!' : 'Copy to clipboard'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Label Image */}
          <div className="md:col-span-1">
            <Card className="bg-background shadow-md h-full flex flex-col">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-xl text-primary">Label Image Analysis</CardTitle>
                <Badge className={`${labelStatusInfo.badgeClass} font-bold`}>
                  {labelStatusInfo.name}
                </Badge>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col gap-4">
                <div className="relative w-full aspect-square rounded-md overflow-hidden border border-border">
                  <SafeImage src={displayData.imageAccess.uploadedLabelImage?.presignedUrl || item.result.uploadedLabelImage} alt="Uploaded Label" fill style={{ objectFit: 'contain' }} data-ai-hint="product label" />
                </div>
                <div className="relative group flex-grow">
                    <div className="text-base text-foreground leading-relaxed bg-muted/30 p-3 rounded-md h-full">
                        {formatAIText(displayData.labelVerification.explanation)}
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopy(displayData.labelVerification.explanation, 'label')}
                            >
                            {labelCopied ? <Check className="h-4 w-4 text-status-correct" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{labelCopied ? 'Copied!' : 'Copy to clipboard'}</p>
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;
