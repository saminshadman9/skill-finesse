from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Use a placeholder db object, it will be replaced when app.py imports this file
db = None

class TrustedDevice(object):
    """Placeholder class to be defined later"""
    pass

class LoginAttempt(object):
    """Placeholder class to be defined later"""
    pass

# Video Course Models
class VideoCourse(object):
    """Model for video courses with Bunny.net integration"""
    pass

class VideoLesson(object):
    """Model for individual video lessons"""
    pass

class CourseEnrollment(object):
    """Model for course enrollments with progress tracking"""
    pass

class LessonProgress(object):
    """Model for tracking individual lesson progress"""
    pass

class HomepageContent(object):
    """Model for storing homepage section content - will be replaced when db is available"""
    pass
