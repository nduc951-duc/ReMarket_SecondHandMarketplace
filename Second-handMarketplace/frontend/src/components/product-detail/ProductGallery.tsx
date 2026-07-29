import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  title: string;
  images: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function ProductGallery({ title, images, selectedIndex, onSelect }: ProductGalleryProps) {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const selectedImage = images[selectedIndex] || images[0];
  const selectedFailed = selectedImage && failedImages.includes(selectedImage);

  return (
    <section aria-label="Hình ảnh sản phẩm" className="space-y-3">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border border-border bg-muted sm:aspect-square">
        {selectedImage && !selectedFailed ? (
          <img
            src={selectedImage}
            alt={title}
            onError={() => setFailedImages((current) => [...current, selectedImage])}
            className="size-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <ImageOff className="size-10" />
            <span className="text-sm font-medium">Sản phẩm chưa có ảnh</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Chọn hình ảnh">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={cn(
                'size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
                selectedIndex === index
                  ? 'border-primary'
                  : 'border-transparent opacity-65 hover:opacity-100',
              )}
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export { ProductGallery };
