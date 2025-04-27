from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    saved_space = serializers.ReadOnlyField()
    content_category = serializers.ReadOnlyField()
    
    class Meta:
        model = File
        fields = [
            'id', 'file', 'original_filename', 'file_type', 'size',
            'uploaded_at', 'file_hash', 'reference_count', 'saved_space',
            'file_extension', 'content_category', 'last_modified',
            'description', 'tags', 'is_favorite'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'file_hash', 'reference_count', 'saved_space', 
            'content_category', 'file_extension'
        ] 