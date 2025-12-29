"""
tilda-tesla Backend API Server
Handles video/image analysis with GPU/CUDA acceleration
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import torch
import os
import json
import time
import threading
import queue
from pathlib import Path

# Try to import analysis module, but handle gracefully if it fails
try:
    from analysis import VideoAnalyzer
    ANALYSIS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: analysis module not available: {e}")
    print("Install dependencies: pip install transformers pillow opencv-python numpy")
    ANALYSIS_AVAILABLE = False
    VideoAnalyzer = None

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Output directory for analysis results
OUTPUT_DIR = Path('./output')
OUTPUT_DIR.mkdir(exist_ok=True)

# Global analyzer instance (lazy loaded)
_analyzer = None

def get_analyzer(settings: dict):
    """Get or create analyzer with specified model settings"""
    global _analyzer
    
    if not ANALYSIS_AVAILABLE:
        return None
    
    detection_model = settings.get('detectionModel', 'facebook/detr-resnet-50')
    weather_model = settings.get('weatherModel')
    
    # Create new analyzer if models changed
    if _analyzer is None or _analyzer.detection_model_name != detection_model:
        try:
            _analyzer = VideoAnalyzer(
                detection_model_name=detection_model,
                weather_model_name=weather_model if weather_model else None
            )
        except Exception as e:
            print(f"Error creating analyzer: {e}")
            return None
    
    return _analyzer


def get_system_info():
    """Get GPU/CPU system information"""
    has_gpu = torch.cuda.is_available()
    gpu_name = None
    cuda_available = False
    device = 'cpu'
    torch_version = torch.__version__
    
    if has_gpu:
        gpu_name = torch.cuda.get_device_name(0)
        cuda_available = True
        device = 'cuda'
    
    return {
        'hasGPU': has_gpu,
        'gpuName': gpu_name,
        'cudaAvailable': cuda_available,
        'device': device,
        'torchVersion': torch_version
    }


@app.route('/api/system-info', methods=['GET'])
def system_info():
    """Return GPU/CPU system information"""
    try:
        info = get_system_info()
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze-video', methods=['POST'])
def analyze_video():
    """Analyze video file"""
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        settings = {}
        
        if 'settings' in request.form:
            settings = json.loads(request.form['settings'])
        
        # Create output directory for this analysis
        timestamp = int(time.time())
        output_path = OUTPUT_DIR / f'analysis_{timestamp}'
        output_path.mkdir(exist_ok=True)
        
        # Save uploaded video
        video_path = output_path / video_file.filename
        video_file.save(str(video_path))
        
        # Get analyzer with model settings
        analyzer = get_analyzer(settings)
        
        def generate_progress():
            """Generate progress updates and perform real analysis"""
            # Create queues for communication between threads
            progress_queue = queue.Queue()
            result_queue = queue.Queue()
            error_queue = queue.Queue()
            
            def progress_callback(progress, step):
                """Callback to send progress updates"""
                progress_queue.put((progress, step))
            
            def run_analysis():
                """Run analysis in a separate thread"""
                try:
                    if analyzer is None:
                        raise Exception("Analysis module not available. Install dependencies: pip install transformers pillow opencv-python numpy")
                    
                    start_time = time.time()
                    result = analyzer.analyze_video(str(video_path), settings, output_path, progress_callback=progress_callback)
                    result['processingTime'] = time.time() - start_time
                    
                    # Ensure all required fields are present
                    if 'summary' not in result:
                        result['summary'] = 'Video analysis complete'
                    if 'metadata' not in result:
                        result['metadata'] = {'filename': video_file.filename}
                    if 'frames' not in result:
                        result['frames'] = []
                    if 'images' not in result:
                        result['images'] = []
                    
                    # Put result in queue - this must happen
                    result_queue.put(result)
                    print(f"[Backend] Analysis complete, result put in queue. Queue size: {result_queue.qsize()}")
                except Exception as e:
                    import traceback
                    error_trace = traceback.format_exc()
                    print(f"Analysis error: {error_trace}")
                    error_queue.put(e)
                    print(f"[Backend] Error put in error queue. Error queue size: {error_queue.qsize()}")
            
            # Send initial progress
            yield f"data: {json.dumps({'progress': 5, 'step': 'Initialising video analysis...'})}\n\n"
            time.sleep(0.1)
            
            # Start analysis in background thread
            analysis_thread = threading.Thread(target=run_analysis)
            analysis_thread.start()
            
            # Stream progress updates while analysis runs
            last_progress = 5
            result = None
            while analysis_thread.is_alive() or not progress_queue.empty() or not result_queue.empty():
                # Check for progress updates
                try:
                    while True:
                        prog, step_msg = progress_queue.get_nowait()
                        yield f"data: {json.dumps({'progress': prog, 'step': step_msg})}\n\n"
                        last_progress = prog
                except queue.Empty:
                    pass
                
                # Check if analysis is done
                try:
                    result = result_queue.get_nowait()
                    print(f"[Backend] Got result from queue in main loop")
                    break
                except queue.Empty:
                    pass
                
                # Check for errors
                try:
                    error = error_queue.get_nowait()
                    raise error
                except queue.Empty:
                    pass
                
                time.sleep(0.1)  # Small delay to avoid busy waiting
            
            # Wait for thread to finish (with longer timeout for analysis)
            analysis_thread.join(timeout=300.0)  # 5 minute timeout for analysis
            
            # If we didn't get result in loop, try to get it now
            if result is None:
                # Try multiple times in case of race condition
                for attempt in range(10):
                    try:
                        result = result_queue.get_nowait()
                        print(f"[Backend] Got result from queue after thread join (attempt {attempt + 1})")
                        break
                    except queue.Empty:
                        # Check for error first
                        try:
                            error = error_queue.get_nowait()
                            raise error
                        except queue.Empty:
                            pass
                        
                        # If thread is still alive, wait a bit
                        if analysis_thread.is_alive():
                            time.sleep(0.2)
                        else:
                            # Thread finished but no result - check one more time
                            if attempt < 9:
                                time.sleep(0.1)
                                continue
                            else:
                                # Final attempt failed
                                raise Exception("Analysis completed but no result returned. Thread finished but result queue is empty.")
            
            if result is None:
                raise Exception("Analysis completed but no result returned")
            
            # Final progress is sent by analysis function, just send 100% when done
            yield f"data: {json.dumps({'progress': 100, 'step': 'Analysis complete!'})}\n\n"
            time.sleep(0.1)
            
            # Send final result
            yield f"data: {json.dumps(result)}\n\n"
        
        # Return streaming response with progress
        return Response(
            generate_progress(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Video analysis error: {error_trace}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    """Analyze image file"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        settings = {}
        
        if 'settings' in request.form:
            settings = json.loads(request.form['settings'])
        
        # Create output directory for this analysis
        timestamp = int(time.time())
        output_path = OUTPUT_DIR / f'analysis_{timestamp}'
        output_path.mkdir(exist_ok=True)
        
        # Save uploaded image
        image_path = output_path / image_file.filename
        image_file.save(str(image_path))
        
        # Get analyzer with model settings
        analyzer = get_analyzer(settings)
        
        def generate_progress():
            """Generate progress updates and perform real analysis"""
            # Create queues for communication between threads
            progress_queue = queue.Queue()
            result_queue = queue.Queue()
            error_queue = queue.Queue()
            
            def progress_callback(progress, step):
                """Callback to send progress updates"""
                progress_queue.put((progress, step))
            
            def run_analysis():
                """Run analysis in a separate thread"""
                try:
                    if analyzer is None:
                        raise Exception("Analysis module not available. Install dependencies: pip install transformers pillow opencv-python numpy")
                    
                    start_time = time.time()
                    result = analyzer.analyze_image(str(image_path), settings, output_path, progress_callback=progress_callback)
                    result['processingTime'] = time.time() - start_time
                    
                    # Ensure all required fields are present
                    if 'summary' not in result:
                        result['summary'] = 'Image analysis complete'
                    if 'metadata' not in result:
                        result['metadata'] = {'filename': image_file.filename}
                    if 'annotatedImage' not in result:
                        result['annotatedImage'] = ''
                    if 'images' not in result:
                        result['images'] = []
                    
                    # Put result in queue - this must happen
                    result_queue.put(result)
                    print(f"[Backend] Analysis complete, result put in queue. Queue size: {result_queue.qsize()}")
                except Exception as e:
                    import traceback
                    error_trace = traceback.format_exc()
                    print(f"Analysis error: {error_trace}")
                    error_queue.put(e)
                    print(f"[Backend] Error put in error queue. Error queue size: {error_queue.qsize()}")
            
            # Start analysis in background thread
            analysis_thread = threading.Thread(target=run_analysis)
            analysis_thread.start()
            
            # Stream progress updates while analysis runs
            result = None
            while analysis_thread.is_alive() or not progress_queue.empty() or not result_queue.empty():
                # Check for progress updates
                try:
                    while True:
                        prog, step_msg = progress_queue.get_nowait()
                        yield f"data: {json.dumps({'progress': prog, 'step': step_msg})}\n\n"
                except queue.Empty:
                    pass
                
                # Check if analysis is done
                try:
                    result = result_queue.get_nowait()
                    print(f"[Backend] Got result from queue in main loop (image)")
                    break
                except queue.Empty:
                    pass
                
                # Check for errors
                try:
                    error = error_queue.get_nowait()
                    raise error
                except queue.Empty:
                    pass
                
                time.sleep(0.1)  # Small delay to avoid busy waiting
            
            # Wait for thread to finish (with longer timeout for analysis)
            analysis_thread.join(timeout=300.0)  # 5 minute timeout for analysis
            
            # If we didn't get result in loop, try to get it now
            if result is None:
                # Try multiple times in case of race condition
                for attempt in range(10):
                    try:
                        result = result_queue.get_nowait()
                        print(f"[Backend] Got result from queue after thread join (image, attempt {attempt + 1})")
                        break
                    except queue.Empty:
                        # Check for error first
                        try:
                            error = error_queue.get_nowait()
                            raise error
                        except queue.Empty:
                            pass
                        
                        # If thread is still alive, wait a bit
                        if analysis_thread.is_alive():
                            time.sleep(0.2)
                        else:
                            # Thread finished but no result - check one more time
                            if attempt < 9:
                                time.sleep(0.1)
                                continue
                            else:
                                # Final attempt failed
                                raise Exception("Analysis completed but no result returned. Thread finished but result queue is empty.")
            
            if result is None:
                raise Exception("Analysis completed but no result returned")
            
            # Send final result
            yield f"data: {json.dumps(result)}\n\n"
        
        # Return streaming response with progress
        return Response(
            generate_progress(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Image analysis error: {error_trace}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload file endpoint"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        timestamp = int(time.time())
        output_path = OUTPUT_DIR / f'upload_{timestamp}'
        output_path.mkdir(exist_ok=True)
        
        file_path = output_path / file.filename
        file.save(str(file_path))
        
        return jsonify({
            'success': True,
            'path': str(file_path),
            'filename': file.filename
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'system': get_system_info()})


if __name__ == '__main__':
    print('=' * 60)
    print('tilda-tesla Backend API Server')
    print('=' * 60)
    system = get_system_info()
    print(f"Device: {system['device'].upper()}")
    if system['hasGPU']:
        print(f"GPU: {system['gpuName']}")
    print(f"PyTorch: {system['torchVersion']}")
    print('=' * 60)
    print('Starting server on http://localhost:7860')
    print('API endpoints:')
    print('  GET  /api/system-info')
    print('  POST /api/analyze-video')
    print('  POST /api/analyze-image')
    print('  POST /api/upload')
    print('  GET  /health')
    print('=' * 60)
    
    app.run(host='0.0.0.0', port=7860, debug=True)
