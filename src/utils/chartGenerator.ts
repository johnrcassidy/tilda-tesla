/**
 * Generate summary and statistics charts for video analysis
 * Based on tesla-fish-local matplotlib charts but using HTML5 Canvas
 */

export function generateSummaryImage(analysisData: any): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Video Analysis Summary', canvas.width / 2, 40);
  
  // Weather distribution chart (bar chart based on real data)
  ctx.fillStyle = '#000000';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Weather Distribution', 50, 100);
  
  // Use real weather distribution data
  const weatherDistribution = analysisData?.weatherDistribution || {};
  const totalWeatherFrames = Object.values(weatherDistribution).reduce((sum: number, val: any) => sum + val, 0) || 1;
  
  const weatherData = Object.entries(weatherDistribution).map(([label, count]: [string, any]) => ({
    label,
    value: (count / totalWeatherFrames) * 100,
    count,
    color: '#000000', // Black only as requested
  }));
  
  // If no weather data, show placeholder
  if (weatherData.length === 0) {
    weatherData.push({ label: 'Clear', value: 100, count: 0, color: '#000000' });
  }
  
  let xPos = 50;
  const barWidth = 200;
  const barHeight = 300;
  const startY = 130;
  const maxBars = Math.min(weatherData.length, 3); // Show max 3 bars
  
  weatherData.slice(0, maxBars).forEach((item, index) => {
    const barX = xPos + (index * 220);
    const barY = startY + barHeight - (barHeight * item.value / 100);
    
    // Bar
    ctx.fillStyle = item.color;
    ctx.fillRect(barX, barY, barWidth, barHeight * item.value / 100);
    
    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, barX + barWidth / 2, startY + barHeight + 20);
    ctx.fillText(`${item.value.toFixed(1)}%`, barX + barWidth / 2, barY - 5);
  });
  
  // Vehicle and Human detection summary
  ctx.fillStyle = '#000000';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Detection Summary', 50, 480);
  
  const vehicleCount = analysisData?.vehicleCount || 0;
  const humanCount = analysisData?.humanCount || 0;
  const avgConfidence = analysisData?.avgConfidence || 0;
  const totalFrames = analysisData?.totalFrames || 0;
  const vehicleStats = analysisData?.vehicleStats || {};
  const humanStats = analysisData?.humanStats || {};
  const qualityScore = analysisData?.qualityScore || analysisData?.imageQuality?.quality_score || 0;
  
  const detectionStats = [
    `Total Vehicles: ${vehicleCount}`,
    `Median Vehicles: ${vehicleStats.median?.toFixed(1) || '0'} per frame`,
    `Range: ${vehicleStats.min || 0} - ${vehicleStats.max || 0}`,
    `Total Humans: ${humanCount}`,
    `Median Humans: ${humanStats.median?.toFixed(1) || '0'} per frame`,
    `Range: ${humanStats.min || 0} - ${humanStats.max || 0}`,
    `Average Confidence: ${avgConfidence.toFixed(2)}`,
    `Quality Score: ${qualityScore.toFixed(2)}`,
    `Frames Analysed: ${totalFrames}`,
  ];
  
  detectionStats.forEach((stat, index) => {
    ctx.fillText(stat, 50, 510 + (index * 25));
  });
  
  return canvas.toDataURL('image/png');
}

export function generateStatisticsChart(analysisData: any): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Analysis Statistics', canvas.width / 2, 30);
  
  // Get per-frame data from backend
  const perFrameData = analysisData?.perFrameData || [];
  const weatherDistribution = analysisData?.weatherDistribution || {};
  const congestionDistribution = analysisData?.congestionDistribution || { low: 0, medium: 0, high: 0 };
  const vehicleCountsOverTime = analysisData?.vehicleCountsOverTime || [];
  const humanCountsOverTime = analysisData?.humanCountsOverTime || [];
  
  // Subplot positions (2x2 grid)
  const subplotWidth = 700;
  const subplotHeight = 500;
  const margin = 50;
  const spacing = 50;
  
  // 1. Weather Distribution Pie Chart (top-left)
  const pieX = margin;
  const pieY = 60;
  const pieRadius = 150;
  const pieCenterX = pieX + subplotWidth / 2;
  const pieCenterY = pieY + subplotHeight / 2;
  
  ctx.fillStyle = '#000000';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Weather Distribution', pieCenterX, pieY + 20);
  
  if (Object.keys(weatherDistribution).length > 0) {
    const total = Object.values(weatherDistribution).reduce((sum: number, val: any) => sum + val, 0);
    let currentAngle = -Math.PI / 2; // Start at top
    
    const colors = ['#000000', '#808080', '#000000']; // Black, grey, black alternating
    let colorIndex = 0;
    
    Object.entries(weatherDistribution).forEach(([label, count]: [string, any]) => {
      const sliceAngle = (count / total) * 2 * Math.PI;
      
      // Draw pie slice
      ctx.beginPath();
      ctx.moveTo(pieCenterX, pieCenterY);
      ctx.arc(pieCenterX, pieCenterY, pieRadius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[colorIndex % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = pieCenterX + Math.cos(labelAngle) * (pieRadius * 0.7);
      const labelY = pieCenterY + Math.sin(labelAngle) * (pieRadius * 0.7);
      const percentage = ((count / total) * 100).toFixed(1);
      
      ctx.fillStyle = '#000000';
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${label}`, labelX, labelY - 10);
      ctx.fillText(`${percentage}%`, labelX, labelY + 5);
      
      currentAngle += sliceAngle;
      colorIndex++;
    });
  } else {
    ctx.fillStyle = '#000000';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No weather data', pieCenterX, pieCenterY);
  }
  
  // 2. Traffic Congestion Bar Chart (top-right)
  const barX = margin + subplotWidth + spacing;
  const barY = 60;
  const barChartWidth = subplotWidth;
  const barChartHeight = subplotHeight;
  const barMaxHeight = barChartHeight - 100;
  
  ctx.fillStyle = '#000000';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Traffic Congestion', barX + barChartWidth / 2, barY + 20);
  
  // Draw axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX + 50, barY + 50);
  ctx.lineTo(barX + 50, barY + barChartHeight - 50);
  ctx.lineTo(barX + barChartWidth - 50, barY + barChartHeight - 50);
  ctx.stroke();
  
  // Draw bars
  const congestionKeys = ['low', 'medium', 'high'];
  const maxCongestion = Math.max(...Object.values(congestionDistribution));
  const barWidth = 150;
  const barSpacing = 100;
  
  congestionKeys.forEach((key, index) => {
    const value = congestionDistribution[key] || 0;
    const barHeight = maxCongestion > 0 ? (value / maxCongestion) * barMaxHeight : 0;
    const x = barX + 100 + (index * (barWidth + barSpacing));
    const y = barY + barChartHeight - 50 - barHeight;
    
    // Bar (alternating black/grey)
    ctx.fillStyle = index % 2 === 0 ? '#000000' : '#808080';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Value label
    ctx.fillStyle = '#000000';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${value}`, x + barWidth / 2, y - 5);
    
    // Key label
    ctx.fillText(key, x + barWidth / 2, barY + barChartHeight - 30);
  });
  
  // Y-axis label
  ctx.save();
  ctx.translate(barX + 20, barY + barChartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#000000';
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Count', 0, 0);
  ctx.restore();
  
  // 3. Vehicle Count Over Time Line Chart (bottom-left)
  const lineX = margin;
  const lineY = 60 + subplotHeight + spacing;
  const lineChartWidth = subplotWidth;
  const lineChartHeight = subplotHeight;
  
  ctx.fillStyle = '#000000';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Vehicle Count Over Time', lineX + lineChartWidth / 2, lineY + 20);
  
  // Draw axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lineX + 50, lineY + 50);
  ctx.lineTo(lineX + 50, lineY + lineChartHeight - 50);
  ctx.lineTo(lineX + lineChartWidth - 50, lineY + lineChartHeight - 50);
  ctx.stroke();
  
  // Draw line chart
  if (vehicleCountsOverTime.length > 0) {
    const maxVehicles = Math.max(...vehicleCountsOverTime, 1);
    const chartAreaWidth = lineChartWidth - 100;
    const chartAreaHeight = lineChartHeight - 100;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#000000';
    
    ctx.beginPath();
    vehicleCountsOverTime.forEach((value: number, index: number) => {
      const x = lineX + 50 + (index / (vehicleCountsOverTime.length - 1 || 1)) * chartAreaWidth;
      const y = lineY + lineChartHeight - 50 - (value / maxVehicles) * chartAreaHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
    });
    ctx.stroke();
    
    // Fill area under line
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(lineX + 50, lineY + lineChartHeight - 50);
    vehicleCountsOverTime.forEach((value: number, index: number) => {
      const x = lineX + 50 + (index / (vehicleCountsOverTime.length - 1 || 1)) * chartAreaWidth;
      const y = lineY + lineChartHeight - 50 - (value / maxVehicles) * chartAreaHeight;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(lineX + lineChartWidth - 50, lineY + lineChartHeight - 50);
    ctx.closePath();
    ctx.fill();
  }
  
  // X-axis label
  ctx.fillStyle = '#000000';
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Frame Number', lineX + lineChartWidth / 2, lineY + lineChartHeight - 20);
  
  // Y-axis label
  ctx.save();
  ctx.translate(lineX + 20, lineY + lineChartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Vehicle Count', 0, 0);
  ctx.restore();
  
  // 4. Image Quality Metrics - Dual axis (bottom-right)
  const qualityX = margin + subplotWidth + spacing;
  const qualityY = 60 + subplotHeight + spacing;
  const qualityChartWidth = subplotWidth;
  const qualityChartHeight = subplotHeight;
  
  ctx.fillStyle = '#000000';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Image Quality Metrics', qualityX + qualityChartWidth / 2, qualityY + 20);
  
  // Draw axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(qualityX + 50, qualityY + 50);
  ctx.lineTo(qualityX + 50, qualityY + qualityChartHeight - 50);
  ctx.lineTo(qualityX + qualityChartWidth - 50, qualityY + qualityChartHeight - 50);
  ctx.stroke();
  
  // Get brightness and contrast data
  const brightness = perFrameData.map((f: any) => f?.image_quality?.brightness_luminance_cd_per_m2 || f?.brightness_luminance_cd_per_m2 || 0);
  const contrast = perFrameData.map((f: any) => f?.image_quality?.contrast_ratio || f?.contrast_ratio || 0);
  
  if (brightness.length > 0 && contrast.length > 0) {
    const maxBrightness = Math.max(...brightness, 1);
    const maxContrast = Math.max(...contrast, 1);
    const chartAreaWidth = qualityChartWidth - 100;
    const chartAreaHeight = qualityChartHeight - 100;
    
    // Brightness line (left axis, black)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    brightness.forEach((value: number, index: number) => {
      const x = qualityX + 50 + (index / (brightness.length - 1 || 1)) * chartAreaWidth;
      const y = qualityY + qualityChartHeight - 50 - (value / maxBrightness) * chartAreaHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point (circle)
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
    });
    ctx.stroke();
    
    // Contrast line (right axis, grey)
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    contrast.forEach((value: number, index: number) => {
      const x = qualityX + 50 + (index / (contrast.length - 1 || 1)) * chartAreaWidth;
      const y = qualityY + qualityChartHeight - 50 - (value / maxContrast) * chartAreaHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point (square)
      ctx.fillRect(x - 3, y - 3, 6, 6);
    });
    ctx.stroke();
    
    // Legend
    ctx.fillStyle = '#000000';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Brightness (cd/m²)', qualityX + 60, qualityY + 80);
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(qualityX + 60, qualityY + 95);
    ctx.lineTo(qualityX + 120, qualityY + 95);
    ctx.stroke();
    ctx.fillStyle = '#808080';
    ctx.fillText('Contrast Ratio', qualityX + 60, qualityY + 110);
  }
  
  // X-axis label
  ctx.fillStyle = '#000000';
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Frame Number', qualityX + qualityChartWidth / 2, qualityY + qualityChartHeight - 20);
  
  // Y-axis labels
  ctx.save();
  ctx.translate(qualityX + 20, qualityY + qualityChartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#000000';
  ctx.fillText('Brightness (cd/m²)', 0, 0);
  ctx.restore();
  
  ctx.save();
  ctx.translate(qualityX + qualityChartWidth - 20, qualityY + qualityChartHeight / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#808080';
  ctx.fillText('Contrast Ratio', 0, 0);
  ctx.restore();
  
  // Quality metrics text (bottom)
  const imageQuality = analysisData?.imageQuality || {};
  const humanStats = analysisData?.humanStats || {};
  const vehicleStats = analysisData?.vehicleStats || {};
  const qualityScore = analysisData?.qualityScore || imageQuality.quality_score || 0;
  
  ctx.fillStyle = '#000000';
  ctx.font = '14px "Courier New", monospace';
  ctx.textAlign = 'left';
  
  const qualityYPos = qualityY + qualityChartHeight + 30;
  const metrics = [
    `Brightness: ${(imageQuality.brightness || 0).toFixed(1)} (${(imageQuality.brightness_luminance_cd_per_m2 || 0).toFixed(1)} cd/m²)`,
    `Contrast: ${(imageQuality.contrast || 0).toFixed(1)} (ratio: ${(imageQuality.contrast_ratio || 0).toFixed(2)})`,
    `Dynamic Range: ${(imageQuality.dynamicRange || 0).toFixed(1)}`,
    `Quality Score: ${qualityScore.toFixed(2)}`,
  ];
  
  metrics.forEach((metric, index) => {
    ctx.fillText(metric, qualityX, qualityYPos + (index * 20));
  });
  
  // Vehicle stats (left column)
  if (vehicleStats && Object.keys(vehicleStats).length > 0) {
    const vehicleYPos = qualityY + qualityChartHeight + 30;
    const vehicleMetrics = [
      `Vehicles - Median: ${vehicleStats.median?.toFixed(2) || '0'} per frame`,
      `Mean: ${vehicleStats.mean?.toFixed(2) || '0'} per frame`,
      `Range: ${vehicleStats.min || 0} - ${vehicleStats.max || 0}`,
      `Std Dev: ${vehicleStats.std_dev?.toFixed(2) || '0'}`,
    ];
    
    vehicleMetrics.forEach((metric, index) => {
      ctx.fillText(metric, qualityX + 400, vehicleYPos + (index * 20));
    });
  }
  
  // Human detection stats (right column)
  if (humanStats && Object.keys(humanStats).length > 0) {
    const humanYPos = qualityY + qualityChartHeight + 30;
    const humanMetrics = [
      `Humans - Median: ${humanStats.median?.toFixed(2) || '0'} per frame`,
      `Mean: ${humanStats.mean?.toFixed(2) || '0'} per frame`,
      `Range: ${humanStats.min || 0} - ${humanStats.max || 0}`,
      `Std Dev: ${humanStats.std_dev?.toFixed(2) || '0'}`,
    ];
    
    humanMetrics.forEach((metric, index) => {
      ctx.fillText(metric, qualityX + 700, humanYPos + (index * 20));
    });
  }
  
  return canvas.toDataURL('image/png');
}
