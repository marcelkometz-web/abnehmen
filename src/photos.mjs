// Canvas decoding/re-encoding removes EXIF/location metadata and reduces storage.
export async function compressPhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Bitte ein JPG-, PNG- oder WebP-Foto auswählen. HEIC-Fotos bitte vorher als JPG exportieren.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Bitte ein Foto unter 25 MB auswählen.');
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => { throw new Error('Das Foto konnte nicht geöffnet werden. Bitte als JPG erneut versuchen.'); });
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 1024 * 1024) return blob;
    }
    throw new Error('Das Foto ist nach der Verkleinerung noch zu groß. Bitte ein kleineres Foto wählen.');
  } finally { image.close(); }
}
