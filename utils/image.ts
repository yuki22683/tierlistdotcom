export const resizeImageToSquare = (file: File, size: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate crop (center crop)
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;

      // Draw
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      // To Blob
      // Default to JPEG if original is not PNG/WEBP to ensure good compression?
      // Or respect original type?
      // If original is PNG with transparency, we want PNG.
      // If original is JPEG, we want JPEG.
      // Canvas supports image/png, image/jpeg, image/webp.
      
      let mimeType = file.type;
      if (mimeType !== 'image/png' && mimeType !== 'image/webp') {
          mimeType = 'image/jpeg';
      }

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob failed'));
        }
      }, mimeType, 0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};
