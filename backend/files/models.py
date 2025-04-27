from django.db import models
import uuid
import os
import mimetypes

def file_upload_path(instance, filename):
    """Generate file path for new file upload"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('uploads', filename)

class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=file_upload_path)
    original_filename = models.CharField(max_length=255, db_index=True)
    file_type = models.CharField(max_length=100, db_index=True)
    size = models.BigIntegerField(db_index=True)
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    file_hash = models.CharField(max_length=64, unique=True, db_index=True, null=True)
    reference_count = models.IntegerField(default=1, db_index=True)
    
    # Enhanced metadata fields
    file_extension = models.CharField(max_length=20, db_index=True, null=True)
    content_category = models.CharField(max_length=50, db_index=True, null=True)
    last_modified = models.DateTimeField(null=True)
    description = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True, null=True)
    is_favorite = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.original_filename
    
    @property
    def saved_space(self):
        """Calculate storage space saved through deduplication"""
        if self.reference_count > 1:
            return self.size * (self.reference_count - 1)
        return 0
        
    def save(self, *args, **kwargs):
        # Set file extension from filename if not provided
        if not self.file_extension and self.original_filename:
            _, ext = os.path.splitext(self.original_filename)
            self.file_extension = ext.lower().strip('.')
            
        # Set content category based on mimetype
        if not self.content_category and self.file_type:
            main_type = self.file_type.split('/')[0]
            if main_type in ['image', 'video', 'audio']:
                self.content_category = main_type
            elif 'pdf' in self.file_type:
                self.content_category = 'document'
            elif 'text' in self.file_type or 'document' in self.file_type:
                self.content_category = 'document'
            elif 'zip' in self.file_type or 'compressed' in self.file_type:
                self.content_category = 'archive'
            else:
                self.content_category = 'other'
                
        super(File, self).save(*args, **kwargs)
