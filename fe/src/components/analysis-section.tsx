import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VerificationMatchStatus } from '@/types';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisSectionProps {
  title: string;
  matchStatus: VerificationMatchStatus;
  confidence?: number; // Optional, as it might not always be present
  explanation: string;
  uploadedImage: string; // URL
  referenceImages?: string[]; // URLs, optional
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  title,
  matchStatus,
  confidence,
  explanation,
  uploadedImage,
  referenceImages,
}) => {
  let statusStyles = {
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-muted-foreground',
    Icon: HelpCircle,
  };

  switch (matchStatus) {
    case 'Correct':
      statusStyles = { bgColor: 'bg-status-correct/10', textColor: 'text-status-correct', borderColor: 'border-status-correct', Icon: CheckCircle };
      break;
    case 'Incorrect':
      statusStyles = { bgColor: 'bg-status-incorrect/10', textColor: 'text-status-incorrect', borderColor: 'border-status-incorrect', Icon: XCircle };
      break;
    case 'Uncertain':
      statusStyles = { bgColor: 'bg-status-uncertain/10', textColor: 'text-status-uncertain', borderColor: 'border-status-uncertain', Icon: AlertTriangle };
      break;
  }

  const hasReferenceImages = referenceImages && referenceImages.length > 0;

  return (
    <Card className="bg-background shadow-lg border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <statusStyles.Icon className={`w-5 h-5 ${statusStyles.textColor}`} />
            <Badge variant="outline" className={`${statusStyles.bgColor} ${statusStyles.textColor} ${statusStyles.borderColor} px-4 py-1.5 text-sm font-medium`}>
              {matchStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Uploaded Image:</p>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border shadow-sm">
              <Image src={uploadedImage} alt={`${title} - Uploaded`} fill style={{ objectFit: 'contain' }} className="bg-muted" data-ai-hint="product analysis" />
            </div>
          </div>
          {hasReferenceImages && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Reference Images:</p>
              <div className="grid grid-cols-2 gap-3">
                {referenceImages.slice(0, 4).map((refImg, idx) => (
                  <div key={idx} className="relative w-full aspect-square rounded-lg overflow-hidden border border-border shadow-sm">
                    <Image src={refImg} alt={`Reference ${idx + 1}`} fill style={{ objectFit: 'contain' }} className="bg-muted" data-ai-hint="reference image" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {typeof confidence === 'number' && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-2">Confidence Score:</p>
            <div className="flex items-center space-x-3">
              <Progress value={confidence * 100} className="w-full h-3 [&>div]:bg-gradient-to-r [&>div]:from-accent-gradient-from [&>div]:to-accent-gradient-to" />
              <span className={`text-base font-bold ${statusStyles.textColor}`}>{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
        
        <div className="bg-muted/10 p-6 rounded-xl border border-border/50">
          <p className="text-base font-semibold text-primary mb-3">AI Analysis Explanation:</p>
          <div className="prose prose-base max-w-none">
            <p className="text-base text-foreground leading-7 whitespace-pre-wrap">{explanation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisSection;
