"""
Direct Bunny CDN upload endpoint
"""
from flask import request, jsonify
import threading

def handle_direct_bunny_upload():
    """Handle direct upload to Bunny CDN only"""
    try:
        from direct_bunny_uploader import direct_bunny_uploader
        
        # Get form data
        course_id = request.form.get('course_id')
        title = request.form.get('title')
        description = request.form.get('description', '')
        order_index = int(request.form.get('order_index', 0)) if request.form.get('order_index') else 0
        is_preview = 'is_preview' in request.form
        instructions = request.form.get('instructions', '')
        external_links = request.form.get('external_links', '')
        upload_id = request.form.get('upload_id')
        
        print(f"🎯 Direct Bunny upload: {title}, Course: {course_id}, Upload ID: {upload_id}")
        
        # Validate course
        from app import Course
        course = Course.query.get(course_id)
        if not course:
            return jsonify({
                'success': False,
                'message': 'Course not found'
            }), 404
        
        # Check video file
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
        
        # Prepare metadata
        video_metadata = {
            'title': title,
            'description': description,
            'order_index': order_index,
            'is_preview': is_preview,
            'instructions': instructions,
            'external_links': external_links,
            'filename': video_file.filename
        }
        
        # Start direct upload
        direct_bunny_uploader.upload_video_direct_async(
            video_file, int(course_id), video_metadata, upload_id
        )
        
        return jsonify({
            'success': True,
            'message': 'Direct Bunny CDN upload started - tracking real-time progress...',
            'upload_id': upload_id
        })
        
    except Exception as e:
        print(f"❌ Direct Bunny endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Upload error: {str(e)}'
        }), 500
