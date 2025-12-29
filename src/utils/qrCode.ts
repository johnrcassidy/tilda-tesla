/**
 * Generate QR code with Douglas Adams quote
 * "Don't Panic. Try again, clear cache, or blame the Vogon bureaucracy of the internet. Douglas A."
 */

export function createDouglasAdamsQRCode(): string {
  // Create canvas for QR code
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Generate simple QR code pattern (simulated - in real app would use QR library)
  const qrSize = 600;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 50;
  const moduleSize = 8;
  
  // Draw QR code pattern (simplified checkerboard pattern)
  ctx.fillStyle = '#000000';
  for (let y = 0; y < qrSize; y += moduleSize) {
    for (let x = 0; x < qrSize; x += moduleSize) {
      if ((Math.floor(x / moduleSize) + Math.floor(y / moduleSize)) % 2 === 0) {
        ctx.fillRect(qrX + x, qrY + y, moduleSize, moduleSize);
      }
    }
  }
  
  // Draw finder patterns (corners)
  const finderSize = 7 * moduleSize;
  const drawFinder = (startX: number, startY: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(startX, startY, finderSize, finderSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(startX + moduleSize, startY + moduleSize, 5 * moduleSize, 5 * moduleSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(startX + 2 * moduleSize, startY + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
  };
  
  drawFinder(qrX, qrY);
  drawFinder(qrX + qrSize - finderSize, qrY);
  drawFinder(qrX, qrY + qrSize - finderSize);
  
  // Draw text below QR code
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Don't Panic.", canvas.width / 2, qrY + qrSize + 40);
  
  ctx.font = '16px sans-serif';
  const message = "Try again, clear cache, or blame the Vogon bureaucracy of the internet. Douglas A.";
  const lines = message.match(/.{1,60}/g) || [message];
  let textY = qrY + qrSize + 70;
  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, textY);
    textY += 25;
  });
  
  return canvas.toDataURL('image/png');
}

export function createErrorImage(message: string = "Oops! Something went wrong"): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Pixelated effect
  const pixelSize = 20;
  const colors = ['#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333'];
  
  for (let y = 0; y < canvas.height; y += pixelSize) {
    for (let x = 0; x < canvas.width; x += pixelSize) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  // Draw "404" text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('404', canvas.width / 2, canvas.height / 2 - 20);
  
  // Draw message
  ctx.font = '24px sans-serif';
  const shortMessage = message.length > 50 ? message.substring(0, 50) : message;
  ctx.fillText(shortMessage, canvas.width / 2, canvas.height / 2 + 40);
  
  return canvas.toDataURL('image/png');
}

