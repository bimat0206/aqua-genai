import type { TransactionData, ProductCategory, VerificationMatchStatus, Product, ImageFile } from '@/types';

const productCategories: ProductCategory[] = ["Refrigerators", "Washing Machines", "Televisions"];

const productsByCategory: Record<ProductCategory, Product[]> = {
  "Refrigerators": [
    { id: "REF001", name: "CoolZone 5000", category: "Refrigerators" },
    { id: "REF002", name: "IceKing Pro", category: "Refrigerators" },
    { id: "REF003", name: "FrostFree Deluxe", category: "Refrigerators" },
  ],
  "Washing Machines": [
    { id: "WM001", name: "UltraClean X1", category: "Washing Machines" },
    { id: "WM002", name: "SpinMaster 300", category: "Washing Machines" },
  ],
  "Televisions": [
    { id: "TV001", name: "VisionMax 4K", category: "Televisions" },
    { id: "TV002", name: "CineView OLED", category: "Televisions" },
    { id: "TV003", name: "SmartScreen HD", category: "Televisions" },
  ],
};

export const getProductsForCategory = (category: ProductCategory): Product[] => {
  return productsByCategory[category] || [];
};

export const getAllProducts = (): Product[] => {
  return Object.values(productsByCategory).flat();
};


const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const placeholderDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const mockImageFiles: Record<ProductCategory, ImageFile[]> = {
  "Refrigerators": [
    { key: 'ref_overview_1.png', name: 'Refrigerator Front View', url: 'https://placehold.co/400x300.png', dataUri: placeholderDataUri, type: 'overview' },
    { key: 'ref_label_1.png', name: 'Refrigerator Energy Label', url: 'https://placehold.co/200x300.png', dataUri: placeholderDataUri, type: 'label' },
    { key: 'ref_overview_2.png', name: 'Refrigerator Side View', url: 'https://placehold.co/400x300.png', dataUri: placeholderDataUri, type: 'overview' },
  ],
  "Washing Machines": [
    { key: 'wm_overview_1.png', name: 'Washing Machine Front', url: 'https://placehold.co/350x350.png', dataUri: placeholderDataUri, type: 'overview' },
    { key: 'wm_label_1.png', name: 'Washing Machine Spec Label', url: 'https://placehold.co/300x200.png', dataUri: placeholderDataUri, type: 'label' },
  ],
  "Televisions": [
    { key: 'tv_overview_1.png', name: 'Television Screen On', url: 'https://placehold.co/500x300.png', dataUri: placeholderDataUri, type: 'overview' },
    { key: 'tv_label_1.png', name: 'Television Model Label', url: 'https://placehold.co/250x150.png', dataUri: placeholderDataUri, type: 'label' },
    { key: 'tv_overview_2.png', name: 'Television Back Panel', url: 'https://placehold.co/450x300.png', dataUri: placeholderDataUri, type: 'overview' },
  ],
};


export const generateMockData = (count: number): TransactionData[] => {
  const data: TransactionData[] = [];
  const baseTimestamp = new Date().getTime();

  for (let i = 0; i < count; i++) {
    const category = getRandomElement(productCategories);
    const availableProducts = productsByCategory[category];
    const product = getRandomElement(availableProducts);
    const matchStatus = getRandomElement<VerificationMatchStatus>(["Correct", "Incorrect", "Uncertain"]);
    
    const transaction: TransactionData = {
      transactionId: `TRX-${Date.now().toString().slice(-6)}-${String(i).padStart(4, '0')}`,
      timestamp: baseTimestamp - (i * getRandomNumber(1000 * 60 * 5, 1000 * 60 * 60 * 24)), // transactions going back in time
      productId: product.id,
      productName: product.name,
      category: product.category,
      processingTime: getRandomNumber(500, 5000),
      storeLocation: `Store #${getRandomNumber(1, 100)}`,
      result: {
        matchStatus,
        confidenceScore: parseFloat(Math.random().toFixed(2)),
        explanation: `AI analysis determined the product to be ${matchStatus.toLowerCase()} based on visual characteristics and label data. Reference features matched with ${getRandomNumber(60,99)}% accuracy.`,
        uploadedOverviewImage: getRandomElement(mockImageFiles[category]).url,
        uploadedLabelImage: getRandomElement(mockImageFiles[category]).url,
        referenceImages: [
          'https://placehold.co/150x100.png',
          'https://placehold.co/150x100.png',
          'https://placehold.co/150x100.png',
        ],
      },
    };
    data.push(transaction);
  }
  return data;
};
