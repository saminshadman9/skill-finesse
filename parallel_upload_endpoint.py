"""
Parallel upload endpoint for Flask app
"""
from flask import request, jsonify
import tempfile
import uuid
import time
import os

def handle_parallel_upload_with_progress():
    """Handle parallel upload to server and CDN"""
    try:
        from ultra_fast_video_uploader import ultra_fast_video_uploader
        from parallel_upload_system import init_parallel_upload_system
        
        # Initialize parallel upload system
        parallel_system = init_parallel_upload_system(ultra_fast_video_uploader)
        
        # Get form data
        course_id = request.form.get('course_id')
        title = request.form.get('title')
        description = request.form.get('description', '')
        order_index = int(request.form.get('order_index', 0)) if request.form.get('order_index') else 0
        is_preview = 'is_preview' in request.form
        instructions = request.form.get('instructions', '')
        external_links = request.form.get('external_links', '')
        upload_id = request.form.get('upload_id')
        
        print(f"🚀 Starting parallel upload: {title}, Course: {course_id}, Upload ID: {upload_id}")
        
        # Validate course exists
        from app import Course
        course = Course.query.get(course_id)
        if not course:
            return jsonify({
                'success': False,
                'message': 'Course not found'
            }), 404
        
        # Check if video file is provided
        if 'video' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No video file provided'
            }), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No video file selected'
            }), 400
        
        # Prepare video metadata
        video_metadata = {
            'title': title,
            'description': description,
            'order_index': order_index,
            'is_preview': is_preview,
            'instructions': instructions,
            'external_links': external_links,
            'filename': video_file.filename
        }
        
        # Start parallel upload in background thread
        import threading
        
        def parallel_upload_worker():
            try:
                from flask import current_app
                with current_app.app_context():
                    result = parallel_system.upload_parallel_streams(
                        upload_id, video_file, int(course_id), video_metadata
                    )
                    
                    if result['success']:
                        print(f"✅ Parallel upload completed: {title}")
                    else:
                        print(f"❌ Parallel upload failed: {result['error']}")
                        ultra_fast_video_uploader.update_progress(
                            upload_id, 0,
                            f"Parallel upload failed: {result['error']}",
                            "0 B/s", "error", "Failed", 0, 0, "error"
                        )
            except Exception as e:
                print(f"❌ Parallel upload worker error: {e}")
                import traceback
                traceback.print_exc()
                ultra_fast_video_uploader.update_progress(
                    upload_id, 0,
                    f"Upload error: {str(e)}",
                    "0 B/s", "error", "Failed", 0, 0, "error"
                )
        
        # Start background upload
        upload_thread = threading.Thread(target=parallel_upload_worker, daemon=True)
        upload_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Parallel upload started - tracking progress...',
            'upload_id': upload_id
        })
        
    except Exception as e:
        print(f"❌ Parallel upload endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Upload error: {str(e)}'
        }), 500
