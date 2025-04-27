from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import File
from .serializers import FileSerializer
import hashlib
from django.db.models import Sum, F, Count

# Create your views here.

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Compute file hash
        file_hash = self._compute_file_hash(file_obj)
        
        # Check for duplicate files
        existing_file = File.objects.filter(file_hash=file_hash).first()
        
        if existing_file:
            # Handle duplicate file - increment reference count
            existing_file.reference_count += 1
            existing_file.save()
            serializer = self.get_serializer(existing_file)
            return Response(
                {**serializer.data, 'message': 'File already exists; no duplicate stored.'},
                status=status.HTTP_200_OK
            )
        
        # No duplicate found, proceed with normal upload
        data = {
            'file': file_obj,
            'original_filename': file_obj.name,
            'file_type': file_obj.content_type,
            'size': file_obj.size
        }
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Save file and update hash
        instance = serializer.save()
        instance.file_hash = file_hash
        instance.save()
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance.reference_count > 1:
            # If referenced by multiple uploads, just decrement the counter
            instance.reference_count -= 1
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        else:
            # If this is the last reference, perform actual deletion
            return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def savings(self, request):
        """Endpoint to get total storage savings"""
        total_saved = File.objects.annotate(
            file_saved_space=F('size') * (F('reference_count') - 1)
        ).filter(reference_count__gt=1).aggregate(total=Sum('file_saved_space'))['total'] or 0
        
        # Convert to KB, MB or GB for better readability
        saved_kb = total_saved / 1024
        saved_mb = saved_kb / 1024
        
        return Response({
            'total_bytes': total_saved,
            'total_kb': round(saved_kb, 2),
            'total_mb': round(saved_mb, 2)
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Endpoint to get comprehensive file statistics"""
        # Get file counts
        unique_files_count = File.objects.count()
        total_uploads = File.objects.aggregate(total=Sum('reference_count'))['total'] or 0
        
        # Get storage metrics
        total_size = File.objects.aggregate(total=Sum('size'))['total'] or 0
        total_saved = File.objects.annotate(
            file_saved_space=F('size') * (F('reference_count') - 1)
        ).filter(reference_count__gt=1).aggregate(total=Sum('file_saved_space'))['total'] or 0
        
        # Calculate efficiency metrics
        total_size_without_dedup = total_size + total_saved
        dedup_ratio = (total_saved / total_size_without_dedup * 100) if total_size_without_dedup > 0 else 0
        
        # File type distribution
        file_types = File.objects.values('file_type').annotate(
            count=Count('file_type'),
            total_size=Sum('size')
        ).order_by('-count')
        
        # Convert to more readable units
        total_size_kb = total_size / 1024
        total_size_mb = total_size_kb / 1024
        saved_kb = total_saved / 1024
        saved_mb = saved_kb / 1024
        total_size_without_dedup_kb = total_size_without_dedup / 1024
        total_size_without_dedup_mb = total_size_without_dedup_kb / 1024
        
        return Response({
            'unique_files': unique_files_count,
            'total_uploads': total_uploads,
            'duplication_rate': round((total_uploads - unique_files_count) / total_uploads * 100 if total_uploads > 0 else 0, 2),
            'storage': {
                'actual_bytes': total_size,
                'actual_kb': round(total_size_kb, 2),
                'actual_mb': round(total_size_mb, 2),
                'saved_bytes': total_saved,
                'saved_kb': round(saved_kb, 2),
                'saved_mb': round(saved_mb, 2),
                'without_dedup_bytes': total_size_without_dedup,
                'without_dedup_kb': round(total_size_without_dedup_kb, 2),
                'without_dedup_mb': round(total_size_without_dedup_mb, 2),
                'efficiency_percentage': round(dedup_ratio, 2)
            },
            'file_types': file_types
        })
    
    def _compute_file_hash(self, file_obj):
        """Compute SHA-256 hash of file contents"""
        sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        
        # Reset file position for subsequent reads
        file_obj.seek(0)
        
        return sha256.hexdigest()
