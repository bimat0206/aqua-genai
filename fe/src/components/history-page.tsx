
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowUpDown, 
  Eye, 
  FilterX, 
  Search as SearchIcon, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import StatCard from './stat-card';
import DetailsModal from './details-modal';
import type { LegacyTransactionData, ProductCategory, VerificationMatchStatus } from '@/types';
import { getHistory } from '@/lib/api-client';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const HistoryPage: React.FC = () => {
  const [allData, setAllData] = useState<LegacyTransactionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<{
    search: string;
    category: ProductCategory | 'all';
    result: VerificationMatchStatus | 'all';
  }>({ search: '', category: 'all', result: 'all' });

  const debouncedSearchTerm = useDebounce(filters.search, 300);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof LegacyTransactionData | 'result' | 'category' | null; direction: 'ascending' | 'descending' }>({ key: 'timestamp', direction: 'descending' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [modalItem, setModalItem] = useState<LegacyTransactionData | null>(null);
  const [copiedTransactionId, setCopiedTransactionId] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Copy transaction ID function
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
      
      setCopiedTransactionId(transactionId);
      setTimeout(() => setCopiedTransactionId(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Transaction ID has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshData = useCallback(() => {
    setIsLoading(true);
    getHistory()
      .then(data => {
        setAllData(data);
      })
      .catch(err => {
        console.error("Failed to fetch history:", err);
        toast({
          title: "Error Fetching Data",
          description: "Could not retrieve verification history. Please try again later.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [debouncedSearchTerm, filters.category, filters.result]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredData = useMemo(() => {
    let data = [...allData];
    if (debouncedSearchTerm) {
      data = data.filter(item =>
        item.productName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.transactionId.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.productId.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    if (filters.category !== 'all') {
      data = data.filter(item => item.category === filters.category);
    }
    if (filters.result !== 'all') {
      data = data.filter(item => item.result.matchStatus === filters.result);
    }
    return data;
  }, [allData, debouncedSearchTerm, filters.category, filters.result]);

  const sortedData = useMemo(() => {
    let sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'result') {
          valA = a.result.matchStatus;
          valB = b.result.matchStatus;
        } else if (sortConfig.key === 'category') {
          valA = a.category;
          valB = b.category;
        } else {
           valA = a[sortConfig.key as keyof LegacyTransactionData];
           valB = b[sortConfig.key as keyof LegacyTransactionData];
        }
        
        if (valA === undefined || valA === null) valA = '' as any; 
        if (valB === undefined || valB === null) valB = '' as any;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        // Ensure timestamp (which is a number) sorting works correctly
        if (sortConfig.key === 'timestamp' && typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));

  const requestSort = (key: keyof LegacyTransactionData | 'result' | 'category') => { 
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: keyof LegacyTransactionData | 'result' | 'category') => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? 
        <ChevronUp size={16} className="ml-1 inline" /> : 
        <ChevronDown size={16} className="ml-1 inline" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-30 group-hover:opacity-100 transition-opacity" />;
  };
  
  const statusConfig: Record<VerificationMatchStatus, { badgeClass: string, textClass: string, name: string }> = {
    Correct: { badgeClass: 'border-transparent bg-status-correct', textClass: 'text-primary-foreground', name: 'Correct' },
    Incorrect: { badgeClass: 'border-transparent bg-status-incorrect', textClass: 'text-destructive-foreground', name: 'Incorrect' },
    Uncertain: { badgeClass: 'border-transparent bg-status-uncertain', textClass: 'text-primary-foreground', name: 'Uncertain' },
  };

  const resetFilters = useCallback(() => {
    setFilters({ search: '', category: 'all', result: 'all' });
    setCurrentPage(1);
    setSortConfig({ key: 'timestamp', direction: 'descending' });
  }, []);

  const stats = useMemo(() => {
    const total = allData.length;
    const correct = allData.filter(item => item.result.matchStatus === 'Correct').length;
    const incorrect = allData.filter(item => item.result.matchStatus === 'Incorrect').length;
    const uncertain = allData.filter(item => item.result.matchStatus === 'Uncertain').length;
    return { total, correct, incorrect, uncertain };
  }, [allData]);


  const TableSkeletonLoader = () => (
    <Card className="bg-card shadow-md border-border">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/0 border-b-border">
                {['Transaction ID', 'Date', 'Product ID', 'Product Category', 'Result', 'Actions'].map(header => (
                  <TableHead key={header} className="py-3 px-4 text-base font-bold text-foreground">
                    <div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                <TableRow key={i} className="border-b-border last:border-b-0">
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j} className="py-3 px-4">
                      <div className="h-5 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground font-body p-4 md:p-6 min-h-full flex items-start justify-center">
        <DetailsModal item={modalItem} onClose={() => setModalItem(null)} />
        
        <div className="w-full max-w-7xl">
          <header className="mb-8">
            <h1 className="text-center text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to bg-clip-text text-transparent">
                Verification Results
              </span>
            </h1>
            <p className="text-center text-muted-foreground mb-4 text-sm md:text-base">Review, filter, and analyze all verification outcomes.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              <StatCard title="Total Verifications" value={isLoading ? '...' : stats.total.toLocaleString()} icon={<Database className="w-6 h-6"/>} colorClass="text-accent-gradient-from" />
              <StatCard title="Correct" value={isLoading ? '...' : stats.correct.toLocaleString()} icon={<CheckCircle className="w-6 h-6"/>} colorClass="text-status-correct" />
              <StatCard title="Incorrect" value={isLoading ? '...' : stats.incorrect.toLocaleString()} icon={<XCircle className="w-6 h-6"/>} colorClass="text-status-incorrect" />
              <StatCard title="Uncertain" value={isLoading ? '...' : stats.uncertain.toLocaleString()} icon={<AlertTriangle className="w-6 h-6"/>} colorClass="text-status-uncertain" />
            </div>
          </header>

          {/* Filters & Sorting Card - expandable/collapsible */}
          <Card className="bg-card rounded-xl border-border shadow-md mb-6">
            <div 
              className="flex justify-between items-center p-6 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <h3 className="text-xl font-semibold bg-gradient-to-r from-accent-gradient-from via-accent-gradient-via to-accent-gradient-to bg-clip-text text-transparent">
                Filters & Sorting
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {filtersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
            </div>
            
            {filtersExpanded && (
              <div className="px-6 pb-6 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  <div className="lg:col-span-2">
                    <label htmlFor="search-filter" className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          id="search-filter"
                          placeholder="Product, TXN ID..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="bg-background focus:ring-ring pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="category-filter" className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value as ProductCategory | 'all')}>
                      <SelectTrigger id="category-filter" className="h-9 text-sm bg-background focus:ring-ring">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {(['Refrigerators', 'Washing Machines', 'Televisions'] as ProductCategory[]).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="result-filter" className="block text-sm font-medium text-muted-foreground mb-1">Result Status</label>
                    <Select value={filters.result} onValueChange={(value) => handleFilterChange('result', value as VerificationMatchStatus | 'all')}>
                      <SelectTrigger id="result-filter" className="h-9 text-sm bg-background focus:ring-ring">
                        <SelectValue placeholder="All Results" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Results</SelectItem>
                        {Object.values(statusConfig).map(status => (
                          <SelectItem key={status.name} value={status.name}>{status.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-start mt-4">
                  <Button onClick={resetFilters} variant="outline" size="sm" className="text-sm">
                      <FilterX className="mr-2 h-3.5 w-3.5" /> Reset All Filters
                  </Button>
                </div>
              </div>
            )}
          </Card>
          
          <main className="w-full">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <div className="flex-grow text-base text-muted-foreground">
                    {totalPages > 1 && paginatedData.length > 0 && (
                        <span>
                        Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedData.length)}
                        {' '}to {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)}
                        {' '}of {sortedData.length} results
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {totalPages > 1 && paginatedData.length > 0 && (
                        <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} aria-label="Go to first page">
                                <ChevronsLeft size={16} />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Go to previous page">
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="px-2 text-sm">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Go to next page">
                                <ChevronRight size={16} />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} aria-label="Go to last page">
                                <ChevronsRight size={16} />
                            </Button>
                        </>
                    )}
                </div>
                    <Button variant="outline" size="icon" onClick={refreshData} disabled={isLoading} className="h-8 w-8 ml-2" aria-label="Refresh data">
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16}/>}
                    </Button>
            </div>

            {isLoading ? (
              <TableSkeletonLoader />
            ) : (
              <Card className="bg-card shadow-md border-border">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[600px]"> 
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow className="hover:bg-muted/0 border-b-border">
                            <TableHead className="cursor-pointer group py-3 px-4 text-base font-bold text-foreground" onClick={() => requestSort('transactionId')}>
                              Transaction ID {getSortIndicator('transactionId')}
                            </TableHead>
                            <TableHead className="cursor-pointer group py-3 px-4 whitespace-nowrap text-base font-bold text-foreground" onClick={() => requestSort('timestamp')}>
                              Date {getSortIndicator('timestamp')}
                            </TableHead>
                            <TableHead className="cursor-pointer group py-3 px-4 whitespace-nowrap text-base font-bold text-foreground" onClick={() => requestSort('productId')}>
                              Product ID {getSortIndicator('productId')}
                            </TableHead>
                             <TableHead className="cursor-pointer group py-3 px-4 whitespace-nowrap text-base font-bold text-foreground" onClick={() => requestSort('category')}>
                              Product Category {getSortIndicator('category')}
                            </TableHead>
                            <TableHead className="cursor-pointer group py-3 px-4 whitespace-nowrap text-base font-bold text-foreground" onClick={() => requestSort('result')}>
                              Result {getSortIndicator('result')}
                            </TableHead>
                            <TableHead className="py-3 px-4 text-right whitespace-nowrap text-base font-bold text-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.length === 0 ? (
                              <TableRow>
                                  <TableCell colSpan={6} className="text-center h-48 text-muted-foreground">
                                      <div className="flex flex-col items-center justify-center">
                                          <FilterX className="w-12 h-12 mb-2 text-gray-400" />
                                          <p className="font-semibold text-xl">No Matching Records</p>
                                          <p className="text-base">Try adjusting your search or filter criteria.</p>
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ): (paginatedData.map(item => {
                            const statusInfo = statusConfig[item.result.matchStatus];
                            return (
                              <TableRow key={item.transactionId} className="hover:bg-muted/30 border-b-border last:border-b-0">
                                <TableCell className="font-mono text-sm py-3 px-4 text-foreground">
                                  <div className="flex items-center justify-between group">
                                    <Tooltip delayDuration={100}>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-pointer" onClick={() => handleCopyTransactionId(item.transactionId)}>
                                          {item.transactionId}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="start">
                                        <p>Click to copy: {item.transactionId}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyTransactionId(item.transactionId)}
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2"
                                      aria-label={`Copy transaction ID ${item.transactionId}`}
                                    >
                                      {copiedTransactionId === item.transactionId ? (
                                        <Check className="h-3 w-3 text-status-correct" />
                                      ) : (
                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm py-3 px-4 whitespace-nowrap">{format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}</TableCell>
                                <TableCell className="text-sm py-3 px-4 font-medium text-foreground whitespace-nowrap">
                                  {item.productId}
                                </TableCell>
                                <TableCell className="text-sm py-3 px-4 whitespace-nowrap">{item.category}</TableCell>
                                <TableCell className="py-3 px-4 whitespace-nowrap">
                                  <Badge className={`${statusInfo.badgeClass} ${statusInfo.textClass} font-bold px-2 py-0.5 text-xs`}>
                                    {statusInfo.name}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModalItem(item)} aria-label={`View details for ${item.transactionId}`}>
                                    <Eye className="h-4 w-4 text-primary hover:text-accent-gradient-from" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          }))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default HistoryPage;
