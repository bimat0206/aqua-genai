import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ImageFile } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, ImageIcon } from 'lucide-react'; // Added ImageIcon

interface ImageBrowserProps {
  images: ImageFile[];
  onImageSelect: (image: ImageFile | null) => void;
  selectedImage: ImageFile | null;
  title: string;
  imageTypeHint: string; // e.g., "product overview" or "product label"
  actionButtons?: React.ReactNode; // New prop for action buttons
}

const ImageBrowser: React.FC<ImageBrowserProps> = ({ images, onImageSelect, selectedImage, title, imageTypeHint, actionButtons }) => {
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(selectedImage);

  useEffect(() => {
    if (!previewImage && images.length > 0 && !selectedImage) {
       // setPreviewImage(images[0]); // Default to first image if none selected
    } else if (selectedImage && selectedImage?.key !== previewImage?.key) {
       setPreviewImage(selectedImage);
    } else if (!selectedImage) {
        setPreviewImage(null); // Clear preview if selectedImage is cleared
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage, images]);

  const handleImageClickInList = (image: ImageFile) => {
    setPreviewImage(image); // Set for preview
  };

  const handleSelectThisImage = () => {
    if (previewImage) {
      onImageSelect(previewImage); // Confirm selection
    }
  };

  return (
    <div className="bg-card p-6 rounded-2xl border border-border h-[70vh] flex flex-col">
      <h3 className="font-bold text-lg text-primary mb-4">{title}</h3>
      <div className="flex-grow flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Item List */}
        <ScrollArea className="w-full md:w-1/2 flex-shrink-0 md:pr-2 md:border-r md:border-border styled-scrollbar">
          <div className="space-y-1.5">
            {images.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center">No images found.</p>
            ) : (
              images.map((image) => {
                const isPreviewed = previewImage?.key === image.key;
                const isActuallySelected = selectedImage?.key === image.key;
                return (
                  <div
                    key={image.key}
                    onClick={() => handleImageClickInList(image)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleImageClickInList(image)}
                    aria-pressed={isPreviewed}
                    className={cn(
                      "flex items-center p-2.5 rounded-md cursor-pointer transition-colors duration-200 group",
                      isPreviewed && !isActuallySelected && "bg-accent/20", // Highlight for preview if not yet selected
                      isActuallySelected ? "bg-gradient-to-r from-green-500/30 to-teal-500/30 border border-green-500" : "hover:bg-muted/50",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
                    )}
                  >
                    {isActuallySelected ? (
                      <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 text-status-correct" />
                    ) : (
                      <ImageIcon className="w-5 h-5 mr-3 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                    )}
                    <span className={cn("text-sm truncate", isActuallySelected ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{image.name}</span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Preview Pane */}
        <div className="w-full md:w-1/2 flex flex-col">
          <p className="text-sm text-muted-foreground mb-2 flex-shrink-0">Preview</p>
          <div className="flex-grow bg-background rounded-lg p-2 md:p-4 flex items-center justify-center border border-border relative min-h-[200px] md:min-h-0">
            {previewImage ? (
              <Image
                src={previewImage.url}
                alt={previewImage.name || "Preview"}
                fill
                style={{ objectFit: 'contain' }}
                className="rounded-md"
                data-ai-hint={imageTypeHint}
              />
            ) : (
              <p className="text-muted-foreground text-center">Select a file from the list to preview</p>
            )}
          </div>
          {previewImage && (
            <Button
              onClick={handleSelectThisImage}
              disabled={selectedImage?.key === previewImage.key || !previewImage}
              className="w-full mt-4 flex-shrink-0 text-primary-foreground font-bold py-2 px-4 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 disabled:from-muted disabled:to-muted/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {selectedImage?.key === previewImage.key ? '✓ Selected' : 'Select this Image'}
            </Button>
          )}
        </div>
      </div>
      {actionButtons && (
        <div className="mt-auto pt-6 border-t border-border -mx-6 px-6"> {/* -mx-6 px-6 to make border full width */}
          {actionButtons}
        </div>
      )}
    </div>
  );
};

export default ImageBrowser;
