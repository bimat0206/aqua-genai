
'use client';

import React, { useState, useEffect } from 'react';
import { ScanLine, History, CheckCircle, ArrowRight, BarChart2, HelpCircle, Lightbulb, FileText, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getHistory } from '@/lib/api-client';
import type { LegacyTransactionData } from '@/types';

// --- STATS CALCULATION --- //

interface Stats {
    totalVerifications: number;
    overallAccuracy: number;
    verificationsToday: number;
    isLoading: boolean;
}

const calculateStats = (data: LegacyTransactionData[]): Omit<Stats, 'isLoading'> => {
    if (data.length === 0) {
        return {
            totalVerifications: 0,
            overallAccuracy: 0,
            verificationsToday: 0,
        };
    }

    const total = data.length;
    const correct = data.filter(item => item.result.matchStatus === 'Correct').length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    // Calculate today's verifications (current calendar day)
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const verificationsToday = data.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startOfToday && itemDate <= endOfToday;
    }).length;

    return {
        totalVerifications: total,
        overallAccuracy: Number(accuracy.toFixed(1)),
        verificationsToday,
    };
};

const faqItems = [
    {
        question: "What is AquaVision?",
        answer: "AquaVision is an AI-powered system designed to automate the verification of product displays in retail environments. It helps ensure brand consistency and compliance by analyzing images of in-store displays and energy labels."
    },
    {
        question: "How do I start a new verification?",
        answer: "Click on the 'New Verification' button or navigation link. You'll be guided through selecting a product category, product ID, and selecting existing images for analysis."
    },
    {
        question: "What kind of images do I need to select?",
        answer: "You'll typically need to select two types of images from the image browser: an 'overview image' showing the product in its display context, and a 'label image' focusing on the product's energy or specification label."
    },
    {
        question: "How accurate is the AI analysis?",
        answer: "The AI is trained on a vast dataset to provide high accuracy. However, it also provides a confidence score. All AI recommendations should be reviewed by a human verifier for final confirmation, especially for critical decisions."
    },
    {
        question: "Can I search for past verifications?",
        answer: "Yes, the 'Verification Results' section allows you to search, filter, and view details of all past verifications. You can search by product ID, transaction ID, date, and more."
    }
];

// --- UI COMPONENTS --- //

const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    gradientTextClass: string; 
    isLoading?: boolean;
    tooltipContent: string;
}> = ({ title, value, icon: Icon, gradientTextClass, isLoading = false, tooltipContent }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="bg-card p-6 rounded-xl border border-border flex flex-col justify-between shadow-md hover:shadow-lg hover:border-accent-gradient-via/30 hover:bg-card/80 transition-all duration-300 cursor-help group">
                    <div className="flex justify-between items-center">
                        <h3 className="text-md text-muted-foreground group-hover:text-foreground transition-colors">{title}</h3>
                        <Icon className="text-muted-foreground group-hover:text-accent-gradient-via transition-colors" size={24} />
                    </div>
                    {isLoading ? (
                        <div className="flex items-center gap-2 mt-2">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="text-2xl font-bold text-muted-foreground">Loading...</p>
                        </div>
                    ) : (
                        <p className={`text-4xl font-bold mt-2 bg-clip-text text-transparent ${gradientTextClass} group-hover:scale-105 transition-transform duration-300`}>{value}</p>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs p-3">
                <p className="text-sm">{tooltipContent}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const FeatureCard: React.FC<{ icon: React.ElementType; title: string; description: string; buttonText: string; onNavigate: () => void }> = ({ icon: Icon, title, description, buttonText, onNavigate }) => (
    <div className="bg-card p-8 rounded-2xl border border-border flex flex-col items-start hover:border-accent-gradient-via/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
        <div className="p-3 mb-4 rounded-full bg-gradient-to-br from-accent-gradient-from/20 via-accent-gradient-via/20 to-accent-gradient-to/20">
            <Icon className="text-accent-gradient-to" size={32} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground flex-grow mb-6">{description}</p>
        <button onClick={onNavigate} className="flex items-center gap-2 text-foreground font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to hover:opacity-90 transition-opacity">
            {buttonText} <ArrowRight size={16} />
        </button>
    </div>
);

const GettingStartedStep: React.FC<{ icon: React.ElementType; title: string; description: string; step: number }> = ({ icon: Icon, title, description, step }) => (
    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center space-x-4 pb-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-accent-gradient-from/10 via-accent-gradient-via/10 to-accent-gradient-to/10">
                <Icon className="text-accent-gradient-via" size={24} />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Step {step}</p>
                <CardTitle className="text-lg text-primary">{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


// --- HOME PAGE COMPONENT --- //
interface HomeLandingPageProps {
  onNavigate: (targetView: 'new' | 'results') => void;
}

export default function HomeLandingPage({ onNavigate }: HomeLandingPageProps) {
    const [currentTime, setCurrentTime] = useState('');
    const [stats, setStats] = useState<Stats>({
        totalVerifications: 0,
        overallAccuracy: 0,
        verificationsToday: 0,
        isLoading: true,
    });

    // Fetch real data from API
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setStats(prev => ({ ...prev, isLoading: true }));
                const data = await getHistory();
                const calculatedStats = calculateStats(data);
                setStats({
                    ...calculatedStats,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to fetch verification statistics:', error);
                // Keep loading state or show fallback values
                setStats(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchStats();
    }, []);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
            const timeZoneShort = new Intl.DateTimeFormat('en', {timeZoneName:'short'}).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';
            setCurrentTime(`${formattedTime} ${timeZoneShort}`);
        };
        updateTime(); 
        const timer = setInterval(updateTime, 1000 * 60); 
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-background text-foreground min-h-screen">
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Header / Hero Section */}
                <header className="text-center py-12 md:py-16">
                    <h1 className="text-5xl md:text-6xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to bg-clip-text text-transparent">
                            AquaVision GenAI System
                        </span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                        The intelligent solution for automated product display verification. Ensure brand consistency and accuracy across all retail channels with the power of AI.
                    </p>
                    {currentTime && (
                        <div className="mt-4 text-sm text-muted-foreground/80">
                            Local Time: {currentTime}
                        </div>
                    )}
                </header>

                {/* Quick Stats Section */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 md:mb-16">
                    <StatCard 
                        title="Total Verifications" 
                        value={stats.isLoading ? 'Loading...' : stats.totalVerifications.toLocaleString()} 
                        icon={ScanLine} 
                        gradientTextClass="bg-gradient-to-r from-blue-500 to-cyan-400" 
                        isLoading={stats.isLoading}
                        tooltipContent="The total number of product verification transactions processed by the system since inception. This includes all completed verifications regardless of their result status."
                    />
                    <StatCard 
                        title="Overall Accuracy" 
                        value={stats.isLoading ? 'Loading...' : `${stats.overallAccuracy}%`} 
                        icon={CheckCircle} 
                        gradientTextClass="bg-gradient-to-r from-green-500 to-emerald-400" 
                        isLoading={stats.isLoading}
                        tooltipContent="The percentage of verifications that resulted in 'Correct' status. This metric indicates the overall accuracy rate of product display compliance across all processed verifications."
                    />
                    <StatCard 
                        title="Verifications Today" 
                        value={stats.isLoading ? 'Loading...' : stats.verificationsToday.toLocaleString()} 
                        icon={BarChart2} 
                        gradientTextClass="bg-gradient-to-r from-purple-500 to-pink-500" 
                        isLoading={stats.isLoading}
                        tooltipContent={`The number of verifications completed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. This count resets daily at midnight and tracks current day activity.`}
                    />
                </section>

                {/* Main Action Cards / Key Features Section */}
                 <section className="mb-12 md:mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-foreground">Key Features</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <FeatureCard
                            icon={ScanLine}
                            title="New Verification"
                            description="Start a new verification process by selecting a product and selecting existing images of its in-store display and energy label for AI analysis."
                            buttonText="Start Verification"
                            onNavigate={() => onNavigate('new')}
                        />
                        <FeatureCard
                            icon={History}
                            title="Verification Results"
                            description="Search, filter, and analyze the complete history of all past verifications. Review detailed results and export reports."
                            buttonText="View Results"
                            onNavigate={() => onNavigate('results')}
                        />
                    </div>
                </section>


                {/* Getting Started Section */}
                <section className="mb-12 md:mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-foreground">Getting Started with AquaVision</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GettingStartedStep
                            step={1}
                            icon={FileText}
                            title="Start a New Verification"
                            description="Navigate to 'New Verification', select your product category and ID, then select the required images (overview and label) from the image browser."
                        />
                        <GettingStartedStep
                            step={2}
                            icon={Lightbulb}
                            title="Review AI Analysis"
                            description="Once submitted, our AI will analyze the images. Review the AI's findings, confidence score, and explanation."
                        />
                        <GettingStartedStep
                            step={3}
                            icon={History}
                            title="Explore Results"
                            description="Use the 'Results & Search' page to track past verifications, filter results, and view detailed transaction data."
                        />
                    </div>
                </section>

                {/* FAQ Section */}
                <section>
                    <h2 className="text-3xl font-bold mb-8 text-foreground">Frequently Asked Questions</h2>
                    <Card className="bg-card border-border shadow-md">
                        <CardContent className="p-6">
                            <Accordion type="single" collapsible className="w-full">
                                {faqItems.map((item, index) => (
                                    <AccordionItem value={`item-${index}`} key={index}>
                                        <AccordionTrigger className="text-left hover:no-underline text-primary hover:text-accent-gradient-via">
                                            <div className="flex items-center space-x-3">
                                                <HelpCircle className="text-accent-gradient-from h-5 w-5" />
                                                <span>{item.question}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground">
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}

