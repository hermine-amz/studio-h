export function fileToResizedDataUrl(
  file: File,
  maxWidth = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png' && maxWidth <= 300;
        resolve(
          canvas.toDataURL(
            isPng ? 'image/png' : 'image/jpeg',
            isPng ? undefined : quality
          )
        );
      };
      img.onerror = () => reject(new Error('Image invalide'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lecture fichier impossible'));
    reader.readAsDataURL(file);
  });
}

