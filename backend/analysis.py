"""
Real video and image analysis with detection models
"""

import torch
import torchvision.transforms as transforms
from PIL import Image
import cv2
import numpy as np
from pathlib import Path
import json
import base64
from io import BytesIO
from typing import Dict, List, Tuple, Optional
import time
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt


class VideoAnalyzer:
    """Analyze video files with detection models"""
    
    def __init__(self, detection_model_name: str = 'facebook/detr-resnet-50', weather_model_name: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.detection_model_name = detection_model_name
        self.weather_model_name = weather_model_name
        self.detection_model = None
        self.weather_model = None
        self._load_models()
    
    def _load_models(self):
        """Load detection and weather models"""
        try:
            from transformers import DetrImageProcessor, DetrForObjectDetection
            from transformers import AutoImageProcessor, AutoModelForImageClassification
            
            # Load detection model
            print(f"Loading detection model: {self.detection_model_name}")
            self.processor = DetrImageProcessor.from_pretrained(self.detection_model_name)
            self.detection_model = DetrForObjectDetection.from_pretrained(self.detection_model_name)
            self.detection_model.to(self.device)
            self.detection_model.eval()
            print(f"Detection model loaded on {self.device}")
            
            # Load weather model if specified
            if self.weather_model_name:
                print(f"Loading weather model: {self.weather_model_name}")
                self.weather_processor = AutoImageProcessor.from_pretrained(self.weather_model_name, use_fast=True)
                self.weather_model = AutoModelForImageClassification.from_pretrained(self.weather_model_name)
                self.weather_model.to(self.device)
                self.weather_model.eval()
                print(f"Weather model loaded on {self.device}")
        except ImportError:
            print("Warning: transformers not installed. Install with: pip install transformers")
        except Exception as e:
            print(f"Error loading models: {e}")
    
    def analyze_video(
        self,
        video_path: str,
        settings: Dict,
        output_dir: Path,
        progress_callback=None
    ) -> Dict:
        """Analyze video file and return results"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        
        # Extract frames based on settings
        extract_fps = settings.get('fps', 1.0)
        frame_interval = int(fps / extract_fps) if fps > 0 else 1
        
        frames = []
        frame_images = []
        vehicle_counts = []
        human_counts = []
        confidences = []
        weather_conditions = []
        brightness_values = []
        contrast_values = []
        
        frame_idx = 0
        extracted_count = 0
        total_frames_to_process = int(total_frames / frame_interval) if frame_interval > 0 else total_frames
        
        if progress_callback:
            progress_callback(10, 'Extracting frames from video...')
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Extract frame at specified interval
            if frame_idx % frame_interval == 0:
                # Update progress during frame processing
                if progress_callback and extracted_count % 5 == 0:
                    progress = 15 + int((extracted_count / max(total_frames_to_process, 1)) * 60)
                    progress_callback(progress, f'Running detection on frame {extracted_count + 1}/{total_frames_to_process}...')
                
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                
                # Analyze frame
                detections = self._detect_objects(pil_image, settings)
                weather = self._analyze_weather(pil_image, settings)
                quality = self._analyze_image_quality(frame_rgb)
                
                # Count vehicles and humans
                vehicle_count = sum(1 for d in detections if d['label'] in ['car', 'truck', 'bus', 'motorcycle', 'bicycle'])
                human_count = sum(1 for d in detections if d['label'] in ['person'])
                
                vehicle_counts.append(vehicle_count)
                human_counts.append(human_count)
                confidences.append(np.mean([d['score'] for d in detections]) if detections else 0.0)
                weather_conditions.append(weather)
                brightness_values.append(quality['brightness'])
                contrast_values.append(quality['contrast'])
                
                # Save frame (only if saveFrames is enabled)
                save_frames = settings.get('saveFrames', True)
                if save_frames:
                    frame_filename = f"frame_{extracted_count:04d}.jpg"
                    frame_path = output_dir / frame_filename
                    pil_image.save(frame_path)
                
                # Create annotated frame (always create for display, but only save if saveAnnotated is enabled)
                annotated = self._annotate_frame(frame_rgb, detections)
                annotated_pil = Image.fromarray(annotated)
                save_annotated = settings.get('saveAnnotated', True)
                if save_annotated:
                    annotated_filename = f"annotated_{extracted_count:04d}.jpg"
                    annotated_path = output_dir / annotated_filename
                    annotated_pil.save(annotated_path)
                
                # Convert to base64 for frontend
                frame_images.append(self._image_to_base64(pil_image))
                
                extracted_count += 1
            
            frame_idx += 1
        
        cap.release()
        
        if progress_callback:
            progress_callback(70, 'Processing results and metadata...')
        
        # Calculate statistics
        total_vehicles = sum(vehicle_counts)
        total_humans = sum(human_counts)
        
        # Vehicle stats (like tesla-fish-local)
        vehicle_stats = {
            'median': float(np.median(vehicle_counts)) if vehicle_counts else 0,
            'mean': float(np.mean(vehicle_counts)) if vehicle_counts else 0,
            'min': int(np.min(vehicle_counts)) if vehicle_counts else 0,
            'max': int(np.max(vehicle_counts)) if vehicle_counts else 0,
            'std_dev': float(np.std(vehicle_counts)) if vehicle_counts else 0,
        }
        
        # Human stats
        human_stats = {
            'median': float(np.median(human_counts)) if human_counts else 0,
            'mean': float(np.mean(human_counts)) if human_counts else 0,
            'min': int(np.min(human_counts)) if human_counts else 0,
            'max': int(np.max(human_counts)) if human_counts else 0,
            'std_dev': float(np.std(human_counts)) if human_counts else 0,
        }
        
        # Image quality metrics
        avg_brightness = float(np.mean(brightness_values)) if brightness_values else 0
        avg_contrast = float(np.mean(contrast_values)) if contrast_values else 0
        dynamic_range = float(np.max(brightness_values) - np.min(brightness_values)) if brightness_values else 0
        
        # Calculate quality score (0-1) based on brightness, contrast, and dynamic range
        # Normalize each metric to 0-1 range and average them
        brightness_score = min(1.0, max(0.0, avg_brightness / 255.0))  # 0-255 -> 0-1
        contrast_score = min(1.0, max(0.0, avg_contrast / 100.0))  # 0-100 -> 0-1
        dynamic_range_score = min(1.0, max(0.0, dynamic_range / 255.0))  # 0-255 -> 0-1
        quality_score = (brightness_score * 0.4 + contrast_score * 0.4 + dynamic_range_score * 0.2)
        
        image_quality = {
            'brightness': avg_brightness,
            'contrast': avg_contrast,
            'dynamicRange': dynamic_range,
            'brightness_luminance_cd_per_m2': float(avg_brightness * 0.318) if brightness_values else 0,  # Approximate conversion
            'contrast_ratio': float(avg_contrast / 100.0) if contrast_values else 0,
            'quality_score': quality_score,  # Add quality score
        }
        
        # Determine weather (most common)
        weather = max(set(weather_conditions), key=weather_conditions.count) if weather_conditions else 'Clear'
        
        if progress_callback:
            progress_callback(80, 'Generating visualisations...')
        
        # Check settings for saving operations
        save_frames = settings.get('saveFrames', True)
        save_for_training = settings.get('saveForTraining', False)
        save_annotated = settings.get('saveAnnotated', True)
        
        # Progress updates for saving operations (only if enabled)
        current_progress = 80
        enabled_operations = sum([save_frames, save_annotated, save_for_training])
        if enabled_operations > 0:
            progress_increment = 15 / enabled_operations  # Divide remaining 15% among enabled operations
            
            if save_frames:
                current_progress += progress_increment
                if progress_callback:
                    progress_callback(int(current_progress), 'Saving extracted frames...')
            
            if save_annotated:
                current_progress += progress_increment
                if progress_callback:
                    progress_callback(int(current_progress), 'Saving annotated frames...')
            
            if save_for_training:
                current_progress += progress_increment
                if progress_callback:
                    progress_callback(int(current_progress), 'Saving training data...')
        
        if progress_callback:
            progress_callback(98, 'Finalising results...')
        
        # Calculate weather distribution from all frames
        weather_distribution = {}
        for w in weather_conditions:
            weather_distribution[w] = weather_distribution.get(w, 0) + 1
        
        # Calculate congestion levels from vehicle counts
        congestion_levels = []
        for vc in vehicle_counts:
            if vc == 0:
                congestion_levels.append('low')
            elif vc <= 3:
                congestion_levels.append('medium')
            else:
                congestion_levels.append('high')
        
        congestion_distribution = {'low': 0, 'medium': 0, 'high': 0}
        for c in congestion_levels:
            congestion_distribution[c] = congestion_distribution.get(c, 0) + 1
        
        # Calculate average confidence
        avg_confidence = float(np.mean(confidences)) if confidences else 0.0
        
        # Prepare per-frame data for charts
        per_frame_data = []
        for i in range(len(vehicle_counts)):
            per_frame_data.append({
                'frame_number': i,
                'vehicle_count': vehicle_counts[i],
                'human_count': human_counts[i] if i < len(human_counts) else 0,
                'weather_primary': weather_conditions[i] if i < len(weather_conditions) else 'Clear',
                'brightness_luminance_cd_per_m2': brightness_values[i] * 0.318 if i < len(brightness_values) else 0,
                'contrast_ratio': contrast_values[i] / 100.0 if i < len(contrast_values) else 0,
                'image_quality': {
                    'brightness': brightness_values[i] if i < len(brightness_values) else 0,
                    'contrast': contrast_values[i] if i < len(contrast_values) else 0,
                    'brightness_luminance_cd_per_m2': brightness_values[i] * 0.318 if i < len(brightness_values) else 0,
                    'contrast_ratio': contrast_values[i] / 100.0 if i < len(contrast_values) else 0,
                },
                'congestion_level': congestion_levels[i] if i < len(congestion_levels) else 'low',
            })
        
        # Generate individual matplotlib charts (non-blocking - don't fail if charts fail)
        chart_images = {}
        try:
            print(f"[Analysis] Generating individual charts...")
            # Only generate charts if we have data
            if len(vehicle_counts) > 0 or len(human_counts) > 0:
                chart_images = self._generate_individual_charts(
                    weather_distribution,
                    congestion_distribution,
                    vehicle_counts,
                    human_counts,
                    brightness_values,
                    contrast_values,
                    fps,
                    duration
                )
                print(f"[Analysis] Generated {len(chart_images)} chart images")
            else:
                print(f"[Analysis] Skipping chart generation - no data available")
        except Exception as e:
            print(f"[Analysis] Warning: Error generating charts (non-fatal): {e}")
            import traceback
            traceback.print_exc()
            # Continue without charts - don't fail the entire analysis
            chart_images = {}
        
        # Ensure we always return a result, even if charts failed
        result = {
            'summary': f'Video analysis complete. Detected {total_vehicles} vehicles and {total_humans} humans across {extracted_count} frames. Weather: {weather}',
            'metadata': {
                'filename': Path(video_path).name,
                'fileSize': f'{Path(video_path).stat().st_size / 1024 / 1024:.2f} MB',
                'duration': f'{duration:.2f}',
                'fps': float(fps),
                'resolution': f'{width}x{height}',
                'codec': 'H.264',  # Default assumption
            },
            'images': frame_images,
            'statistics': f'Total frames analyzed: {extracted_count}\nVehicles detected: {total_vehicles}\nHumans detected: {total_humans}\nWeather: {weather}',
            'processingTime': time.time(),
            'frames': frame_images,
            'totalFrames': extracted_count,
            'vehicleCount': total_vehicles,
            'humanCount': total_humans,
            'totalHumans': total_humans,
            'humanStats': human_stats,
            'vehicleStats': vehicle_stats,  # Add vehicle stats
            'imageQuality': image_quality,
            'avgConfidence': avg_confidence,
            'qualityScore': quality_score,  # Add quality score
            # Chart data
            'weatherDistribution': weather_distribution,
            'congestionDistribution': congestion_distribution,
            'perFrameData': per_frame_data,
            'vehicleCountsOverTime': vehicle_counts,
            'humanCountsOverTime': human_counts,
            # Individual chart images (base64 encoded)
            'chartImages': chart_images,
        }
        
        print(f"[Analysis] Returning result with {len(frame_images)} frames, {total_vehicles} vehicles, {total_humans} humans, {len(chart_images)} charts")
        return result
    
    def analyze_image(
        self,
        image_path: str,
        settings: Dict,
        output_dir: Path,
        progress_callback=None
    ) -> Dict:
        """Analyze single image and return results"""
        if progress_callback:
            progress_callback(10, 'Loading image')
        
        # Load image
        pil_image = Image.open(image_path).convert('RGB')
        image_array = np.array(pil_image)
        
        if progress_callback:
            progress_callback(30, 'Running vehicle detection')
        
        # Analyze
        detections = self._detect_objects(pil_image, settings)
        
        if progress_callback:
            progress_callback(60, 'Analysing weather conditions')
        
        weather = self._analyze_weather(pil_image, settings)
        
        if progress_callback:
            progress_callback(75, 'Checking image quality')
        
        quality = self._analyze_image_quality(image_array)
        
        # Count vehicles and humans
        vehicle_count = sum(1 for d in detections if d['label'] in ['car', 'truck', 'bus', 'motorcycle', 'bicycle'])
        human_count = sum(1 for d in detections if d['label'] in ['person'])
        avg_confidence = np.mean([d['score'] for d in detections]) if detections else 0.0
        
        if progress_callback:
            progress_callback(85, 'Annotating image')
        
        # Create annotated image
        annotated = self._annotate_frame(image_array, detections)
        annotated_pil = Image.fromarray(annotated)
        
        # Check settings for saving operations
        save_for_training = settings.get('saveForTraining', False)
        save_annotated = settings.get('saveAnnotated', True)
        
        if save_annotated:
            annotated_path = output_dir / 'annotated.jpg'
            annotated_pil.save(annotated_path)
        
        # Progress updates for saving operations
        current_progress = 85
        enabled_operations = sum([save_annotated, save_for_training])
        if enabled_operations > 0:
            progress_increment = 10 / enabled_operations  # Divide remaining 10% among enabled operations
            
            if save_annotated and progress_callback:
                current_progress += progress_increment
                progress_callback(int(current_progress), 'Saving annotated image...')
            
            if save_for_training and progress_callback:
                current_progress += progress_increment
                progress_callback(int(current_progress), 'Saving training data...')
        
        if progress_callback:
            progress_callback(98, 'Finalising results...')
        
        return {
            'summary': f'Image analysis complete. Detected {vehicle_count} vehicle{"s" if vehicle_count != 1 else ""}{f" and {human_count} human" if human_count > 0 else ""}. Weather: {weather}. Image quality: Good ({avg_confidence:.2f}).',
            'metadata': {
                'filename': Path(image_path).name,
                'fileSize': f'{Path(image_path).stat().st_size / 1024:.2f} KB',
                'dimensions': f'{pil_image.width}x{pil_image.height}',
                'format': 'image/jpeg',
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
            },
            'images': [self._image_to_base64(annotated_pil)],
            'statistics': f'Vehicles detected: {vehicle_count}\nHumans detected: {human_count}\nWeather: {weather}\nQuality score: {avg_confidence:.2f}\nBrightness: {quality["brightness"]:.1f} ({quality["brightness_luminance_cd_per_m2"]:.1f} cd/m²)\nContrast: {quality["contrast"]:.1f} (ratio: {quality["contrast_ratio"]:.2f})\nDynamic Range: {quality["dynamicRange"]:.1f}',
            'processingTime': time.time(),
            'annotatedImage': self._image_to_base64(annotated_pil),
            'humanCount': human_count,
            'imageQuality': {
                'brightness': quality['brightness'],
                'contrast': quality['contrast'],
                'dynamicRange': quality['dynamicRange'],
                'brightness_luminance_cd_per_m2': quality['brightness_luminance_cd_per_m2'],
                'contrast_ratio': quality['contrast_ratio'],
            },
        }
    
    def _detect_objects(self, image: Image.Image, settings: Dict) -> List[Dict]:
        """Detect objects in image using DETR model"""
        if self.detection_model is None:
            return []
        
        try:
            confidence_threshold = settings.get('confidenceThreshold', 0.3)
            
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.detection_model(**inputs)
            
            # Process outputs
            results = self.processor.post_process_object_detection(
                outputs, threshold=confidence_threshold, target_sizes=torch.tensor([image.size[::-1]]).to(self.device)
            )[0]
            
            detections = []
            for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
                label_name = self.detection_model.config.id2label[label.item()]
                detections.append({
                    'label': label_name.lower(),
                    'score': float(score.item()),
                    'box': [float(b) for b in box.tolist()],
                })
            
            return detections
        except Exception as e:
            print(f"Error in object detection: {e}")
            return []
    
    def _analyze_weather(self, image: Image.Image, settings: Dict) -> str:
        """Analyze weather conditions using weather model or image analysis"""
        if self.weather_model and self.weather_model_name:
            try:
                inputs = self.weather_processor(images=image, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                with torch.no_grad():
                    outputs = self.weather_model(**inputs)
                
                # Get top prediction
                predicted_class = outputs.logits.argmax(-1).item()
                label = self.weather_model.config.id2label[predicted_class]
                
                # Map model labels to weather classes (handle cases where model returns wrong labels)
                label_lower = label.lower()
                if "clear" in label_lower or "sunny" in label_lower or "day" in label_lower:
                    return "Clear"
                elif "cloud" in label_lower or "overcast" in label_lower:
                    return "Cloudy"
                elif "rain" in label_lower or "wet" in label_lower or "water" in label_lower:
                    return "Rainy"
                elif "fog" in label_lower or "mist" in label_lower:
                    return "Foggy"
                elif "snow" in label_lower:
                    return "Snowy"
                else:
                    # If model returns something unexpected (like "car mirror"), use image analysis
                    print(f"Warning: Weather model returned unexpected label '{label}', using image analysis")
                    return self._estimate_weather_from_image(image)
            except Exception as e:
                print(f"Error in weather analysis: {e}")
                return self._estimate_weather_from_image(image)
        
        # Fallback to image analysis
        return self._estimate_weather_from_image(image)
    
    def _estimate_weather_from_image(self, image: Image.Image) -> str:
        """Estimate weather using image analysis (like tesla-fish-local)"""
        image_array = np.array(image)
        
        # Calculate image properties
        brightness = np.mean(image_array)
        contrast = np.std(image_array)
        
        # Convert to grayscale for edge detection
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY) if len(image_array.shape) == 3 else image_array
        
        # Edge detection (Canny) - foggy/rainy have fewer edges, clear has many
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        
        # Color analysis - check for blue sky (clear), gray (cloudy), dark (rainy)
        if len(image_array.shape) == 3:
            # Sky region analysis (top 30% of image)
            sky_region = image_array[:int(image_array.shape[0] * 0.3), :, :]
            sky_brightness = np.mean(sky_region)
            sky_blue_ratio = np.mean(sky_region[:, :, 2] > 150)  # Blue channel
            sky_gray_ratio = np.mean(np.abs(sky_region[:, :, 0] - sky_region[:, :, 1]) < 20)  # Gray sky
            
            # Ground region (bottom 30%) - check for reflections (rainy)
            ground_region = image_array[int(image_array.shape[0] * 0.7):, :, :]
            ground_brightness = np.mean(ground_region)
            reflection_ratio = np.mean(ground_region > 200)  # Bright reflections = wet/rainy
        else:
            sky_brightness = brightness
            sky_blue_ratio = 0
            sky_gray_ratio = 0.5
            ground_brightness = brightness
            reflection_ratio = 0
        
        # Deterministic classification using decision tree approach (from tesla-fish-local)
        # FOGGY: Very low contrast and low edge density
        if contrast < 20 and edge_density < 0.05:
            return "Foggy"
        # SNOWY: Very bright with high contrast and high edge density
        elif brightness > 220 and contrast > 60 and edge_density > 0.15:
            return "Snowy"
        # RAINY: Dark overall, low edge density (rain blurs), high ground reflections
        elif brightness < 80 and edge_density < 0.08 and reflection_ratio > 0.15:
            return "Rainy"
        # CLEAR: Bright sky with blue, high edge density, good contrast
        elif sky_brightness > 180 and sky_blue_ratio > 0.25 and edge_density > 0.10 and contrast > 40:
            return "Clear"
        # CLOUDY: Gray sky, medium brightness, medium contrast
        elif sky_gray_ratio > 0.4 and 100 < brightness < 180 and 30 < contrast < 60:
            return "Cloudy"
        # Default fallback based on brightness
        elif brightness < 100:
            return "Rainy"
        elif brightness > 180:
            return "Clear"
        else:
            return "Cloudy"
    
    def _analyze_image_quality(self, image_array: np.ndarray) -> Dict:
        """Analyze image quality metrics"""
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        
        # Brightness (0-255)
        brightness = float(np.mean(gray))
        
        # Contrast (standard deviation)
        contrast = float(np.std(gray))
        
        # Dynamic range
        dynamic_range = float(np.max(gray) - np.min(gray))
        
        # Convert brightness to cd/m² (approximate)
        brightness_luminance = brightness * 0.318
        
        # Contrast ratio
        contrast_ratio = contrast / 100.0 if contrast > 0 else 0
        
        return {
            'brightness': brightness,
            'contrast': contrast,
            'dynamicRange': dynamic_range,
            'brightness_luminance_cd_per_m2': brightness_luminance,
            'contrast_ratio': contrast_ratio,
        }
    
    def _generate_individual_charts(
        self,
        weather_distribution: Dict,
        congestion_distribution: Dict,
        vehicle_counts: List[int],
        human_counts: List[int],
        brightness_values: List[float],
        contrast_values: List[float],
        fps: float,
        duration: float
    ) -> Dict[str, str]:
        """Generate individual matplotlib charts with scales and frame timestamps"""
        charts = {}
        
        # Color scheme - black and white only
        bg_color = '#ffffff'
        text_color = '#000000'
        line_color = '#000000'
        bar_color = '#000000'
        
        # Calculate frame timestamps (in seconds)
        frame_count = len(vehicle_counts)
        frame_timestamps = [i / fps for i in range(frame_count)] if fps > 0 else list(range(frame_count))
        
        try:
            # 1. Weather Distribution Pie Chart
            if weather_distribution:
                fig, ax = plt.subplots(figsize=(10, 8))
                fig.patch.set_facecolor(bg_color)
                ax.set_facecolor(bg_color)
                
                colors = ['#000000', '#808080', '#000000', '#808080', '#000000']
                wedges, texts, autotexts = ax.pie(
                    list(weather_distribution.values()),
                    labels=list(weather_distribution.keys()),
                    autopct='%1.1f%%',
                    colors=colors[:len(weather_distribution)],
                    startangle=90,
                    textprops={'color': text_color, 'fontsize': 14, 'family': 'Courier New'}
                )
                ax.set_title('Weather Distribution', color=text_color, fontsize=18, fontfamily='Courier New', pad=20)
                
                # Save to base64
                buf = BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor=bg_color)
                buf.seek(0)
                charts['weather'] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
            
            # 2. Traffic Congestion Bar Chart
            if congestion_distribution:
                fig, ax = plt.subplots(figsize=(10, 8))
                fig.patch.set_facecolor(bg_color)
                ax.set_facecolor(bg_color)
                
                congestion_keys = list(congestion_distribution.keys())
                congestion_values = list(congestion_distribution.values())
                bar_colors = ['#000000', '#808080', '#000000']
                
                bars = ax.bar(congestion_keys, congestion_values, color=bar_colors[:len(congestion_keys)])
                ax.set_title('Traffic Congestion', color=text_color, fontsize=18, fontfamily='Courier New', pad=20)
                ax.set_ylabel('Count', color=text_color, fontsize=14, fontfamily='Courier New')
                ax.set_xlabel('Congestion Level', color=text_color, fontsize=14, fontfamily='Courier New')
                ax.tick_params(colors=text_color, labelsize=12)
                ax.spines['bottom'].set_color(text_color)
                ax.spines['top'].set_color(text_color)
                ax.spines['left'].set_color(text_color)
                ax.spines['right'].set_color(text_color)
                
                # Add value labels on bars
                for bar in bars:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f'{int(height)}',
                           ha='center', va='bottom', color=text_color, fontsize=12, fontfamily='Courier New')
                
                # Add scale/grid
                ax.grid(True, alpha=0.3, color='#cccccc', axis='y')
                ax.set_ylim(0, max(congestion_values) * 1.1 if congestion_values else 1)
                
                buf = BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor=bg_color)
                buf.seek(0)
                charts['congestion'] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
            
            # 3. Vehicle Count Over Time Line Chart (with timestamps)
            if vehicle_counts:
                fig, ax = plt.subplots(figsize=(12, 8))
                fig.patch.set_facecolor(bg_color)
                ax.set_facecolor(bg_color)
                
                # Use timestamps if available, otherwise frame numbers
                x_data = frame_timestamps if frame_timestamps else list(range(len(vehicle_counts)))
                x_label = 'Time (seconds)' if frame_timestamps else 'Frame Number'
                
                ax.plot(x_data, vehicle_counts, color=line_color, linewidth=3, marker='o', markersize=6, label='Vehicles')
                ax.fill_between(x_data, vehicle_counts, alpha=0.2, color=line_color)
                ax.set_title('Vehicle Count Over Time', color=text_color, fontsize=18, fontfamily='Courier New', pad=20)
                ax.set_xlabel(x_label, color=text_color, fontsize=14, fontfamily='Courier New')
                ax.set_ylabel('Vehicle Count', color=text_color, fontsize=14, fontfamily='Courier New')
                ax.tick_params(colors=text_color, labelsize=12)
                ax.spines['bottom'].set_color(text_color)
                ax.spines['top'].set_color(text_color)
                ax.spines['left'].set_color(text_color)
                ax.spines['right'].set_color(text_color)
                ax.grid(True, alpha=0.3, color='#cccccc')
                ax.legend(loc='upper right', facecolor=bg_color, edgecolor=text_color, labelcolor=text_color, 
                         prop={'family': 'Courier New', 'size': 12})
                
                # Add scale
                if x_data:
                    ax.set_xlim(min(x_data), max(x_data))
                if vehicle_counts:
                    ax.set_ylim(0, max(vehicle_counts) * 1.1)
                
                buf = BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor=bg_color)
                buf.seek(0)
                charts['vehicles'] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
            
            # 4. Human Count Over Time Line Chart (with timestamps)
            if human_counts:
                fig, ax = plt.subplots(figsize=(12, 8))
                fig.patch.set_facecolor(bg_color)
                ax.set_facecolor(bg_color)
                
                x_data = frame_timestamps if frame_timestamps else list(range(len(human_counts)))
                x_label = 'Time (seconds)' if frame_timestamps else 'Frame Number'
                
                ax.plot(x_data, human_counts, color=line_color, linewidth=3, marker='s', markersize=6, label='Humans')
                ax.fill_between(x_data, human_counts, alpha=0.2, color=line_color)
                ax.set_title('Human Count Over Time', color=text_color, fontsize=18, fontfamily='Courier New', pad=20)
                ax.set_xlabel(x_label, color=text_color, fontsize=14, fontfamily='Courier New')
                ax.set_ylabel('Human Count', color=text_color, fontsize=14, fontfamily='Courier New')
                ax.tick_params(colors=text_color, labelsize=12)
                ax.spines['bottom'].set_color(text_color)
                ax.spines['top'].set_color(text_color)
                ax.spines['left'].set_color(text_color)
                ax.spines['right'].set_color(text_color)
                ax.grid(True, alpha=0.3, color='#cccccc')
                ax.legend(loc='upper right', facecolor=bg_color, edgecolor=text_color, labelcolor=text_color,
                         prop={'family': 'Courier New', 'size': 12})
                
                if x_data:
                    ax.set_xlim(min(x_data), max(x_data))
                if human_counts:
                    ax.set_ylim(0, max(human_counts) * 1.1)
                
                buf = BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor=bg_color)
                buf.seek(0)
                charts['humans'] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
            
            # 5. Image Quality Metrics - Dual axis (Brightness and Contrast)
            if brightness_values and contrast_values:
                fig, ax = plt.subplots(figsize=(12, 8))
                fig.patch.set_facecolor(bg_color)
                ax.set_facecolor(bg_color)
                
                ax_twin = ax.twinx()
                
                x_data = frame_timestamps if frame_timestamps else list(range(len(brightness_values)))
                x_label = 'Time (seconds)' if frame_timestamps else 'Frame Number'
                
                # Convert brightness to cd/m²
                brightness_cd = [b * 0.318 for b in brightness_values]
                contrast_ratio = [c / 100.0 for c in contrast_values]
                
                line1 = ax.plot(x_data, brightness_cd, color='#000000', linewidth=3, marker='o', markersize=6, label='Brightness (cd/m²)')
                line2 = ax_twin.plot(x_data, contrast_ratio, color='#808080', linewidth=3, marker='s', markersize=6, label='Contrast Ratio')
                
                ax.set_title('Image Quality Metrics', color=text_color, fontsize=18, fontfamily='Courier New', pad=20)
                ax.set_xlabel(x_label, color=text_color, fontsize=14, fontfamily='Courier New')
                ax.set_ylabel('Brightness (cd/m²)', color='#000000', fontsize=14, fontfamily='Courier New')
                ax_twin.set_ylabel('Contrast Ratio', color='#808080', fontsize=14, fontfamily='Courier New')
                
                ax.tick_params(colors=text_color, labelsize=12)
                ax_twin.tick_params(colors=text_color, labelsize=12)
                ax.spines['bottom'].set_color(text_color)
                ax.spines['top'].set_color(text_color)
                ax.spines['left'].set_color('#000000')
                ax.spines['right'].set_color('#808080')
                ax_twin.spines['bottom'].set_color(text_color)
                ax_twin.spines['top'].set_color(text_color)
                ax_twin.spines['left'].set_color('#000000')
                ax_twin.spines['right'].set_color('#808080')
                ax.grid(True, alpha=0.3, color='#cccccc')
                
                # Combined legend
                lines = line1 + line2
                labels = [l.get_label() for l in lines]
                ax.legend(lines, labels, loc='upper right', facecolor=bg_color, edgecolor=text_color, 
                         labelcolor=text_color, prop={'family': 'Courier New', 'size': 12})
                
                if x_data:
                    ax.set_xlim(min(x_data), max(x_data))
                
                buf = BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor=bg_color)
                buf.seek(0)
                charts['quality'] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
                
        except Exception as e:
            print(f"Error generating charts: {e}")
            import traceback
            traceback.print_exc()
        
        return charts
    
    def _annotate_frame(self, image_array: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw bounding boxes on image"""
        annotated = image_array.copy()
        
        for det in detections:
            box = det['box']
            label = det['label']
            score = det['score']
            
            x1, y1, x2, y2 = map(int, box)
            
            # Draw rectangle
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 0), 3)
            
            # Draw label
            label_text = f'{label} {score:.2f}'
            cv2.putText(annotated, label_text, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return annotated
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL image to base64 string"""
        buffered = BytesIO()
        image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/jpeg;base64,{img_str}"

