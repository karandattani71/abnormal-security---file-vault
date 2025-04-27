from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import File
from .serializers import FileSerializer
import hashlib
from django.db.models import Sum, F, Count
from rest_framework import filters
import datetime
from django.utils.dateparse import parse_date
from django.core.cache import cache
from django.conf import settings
import json
import os

# Cache timeout (1 hour)
CACHE_TTL = getattr(settings, 'CACHE_TTL', 60 * 60)

# Create your views here.

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['original_filename', 'file_type']
    ordering_fields = ['original_filename', 'size', 'uploaded_at', 'reference_count']
    ordering = ['-uploaded_at']

    def get_queryset(self):
        """
        Override get_queryset to apply custom filtering based on query parameters.
        """
        # Build cache key from query parameters
        cache_key = f"file_queryset_{hash(frozenset(self.request.query_params.items()))}"
        
        # Try to get queryset from cache
        cached_result = cache.get(cache_key)
        if cached_result and not settings.DEBUG:
            return cached_result
            
        queryset = super().get_queryset().select_related().prefetch_related()
        
        # Get query parameters
        params = self.request.query_params
        
        # File type filter
        file_type = params.get('file_type')
        if file_type:
            queryset = queryset.filter(file_type__icontains=file_type)
        
        # Size range filters
        min_size = params.get('min_size')
        max_size = params.get('max_size')
        if min_size and min_size.isdigit():
            queryset = queryset.filter(size__gte=int(min_size))
        if max_size and max_size.isdigit():
            queryset = queryset.filter(size__lte=int(max_size))
        
        # Date range filters
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        if start_date:
            start = parse_date(start_date)
            if start:
                queryset = queryset.filter(uploaded_at__date__gte=start)
        if end_date:
            end = parse_date(end_date)
            if end:
                queryset = queryset.filter(uploaded_at__date__lte=end)
        
        # Date range shortcuts
        date_range = params.get('date_range')
        if date_range:
            today = datetime.date.today()
            if date_range == 'today':
                queryset = queryset.filter(uploaded_at__date=today)
            elif date_range == 'yesterday':
                queryset = queryset.filter(uploaded_at__date=today-datetime.timedelta(days=1))
            elif date_range == 'this_week':
                start_of_week = today - datetime.timedelta(days=today.weekday())
                queryset = queryset.filter(uploaded_at__date__gte=start_of_week)
            elif date_range == 'this_month':
                queryset = queryset.filter(
                    uploaded_at__date__year=today.year,
                    uploaded_at__date__month=today.month
                )
            elif date_range == 'this_year':
                queryset = queryset.filter(uploaded_at__date__year=today.year)
        
        # Store in cache for future requests
        cache.set(cache_key, queryset, CACHE_TTL)
        
        return queryset

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
            'size': file_obj.size,
            'file_extension': os.path.splitext(file_obj.name)[1].lower().strip('.'),
            'last_modified': datetime.datetime.now()
        }
        
        # Extract additional metadata provided in the request
        if 'description' in request.data:
            data['description'] = request.data['description']
            
        if 'tags' in request.data:
            try:
                tags = json.loads(request.data['tags']) if isinstance(request.data['tags'], str) else request.data['tags']
                data['tags'] = tags
            except json.JSONDecodeError:
                pass
            
        if 'is_favorite' in request.data:
            data['is_favorite'] = request.data['is_favorite'] in ['true', 'True', True, 1]
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Save file and update hash
        instance = serializer.save()
        instance.file_hash = file_hash
        instance.save()
        
        # Invalidate cache after new upload
        cache.clear()
        
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
    
    @action(detail=False, methods=['get'])
    def file_types(self, request):
        """Endpoint to get list of unique file types in the system"""
        types = File.objects.values_list('file_type', flat=True).distinct()
        return Response(list(types))
    
    @action(detail=False, methods=['get'])
    def advanced_search(self, request):
        """Enhanced search endpoint with more powerful capabilities"""
        query = request.query_params.get('q', '')
        
        if not query:
            return Response({'error': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Implement more advanced search
        # For SQLite, we use LIKE as a simple full-text search replacement
        # In production with PostgreSQL, you would use full-text search features
        results = File.objects.filter(
            original_filename__icontains=query
        ) | File.objects.filter(
            file_type__icontains=query
        )
        
        # Apply additional filters
        results = self._apply_filters_to_queryset(results, request.query_params)
            
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
    
    def _apply_filters_to_queryset(self, queryset, params):
        """Helper method to apply filters to a queryset"""
        # File type filter
        file_type = params.get('file_type')
        if file_type:
            queryset = queryset.filter(file_type__icontains=file_type)
        
        # Size range filters
        min_size = params.get('min_size')
        max_size = params.get('max_size')
        if min_size and min_size.isdigit():
            queryset = queryset.filter(size__gte=int(min_size))
        if max_size and max_size.isdigit():
            queryset = queryset.filter(size__lte=int(max_size))
        
        # Date range filters
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        if start_date:
            start = parse_date(start_date)
            if start:
                queryset = queryset.filter(uploaded_at__date__gte=start)
        if end_date:
            end = parse_date(end_date)
            if end:
                queryset = queryset.filter(uploaded_at__date__lte=end)
        
        # Date range shortcuts
        date_range = params.get('date_range')
        if date_range:
            today = datetime.date.today()
            if date_range == 'today':
                queryset = queryset.filter(uploaded_at__date=today)
            elif date_range == 'yesterday':
                queryset = queryset.filter(uploaded_at__date=today-datetime.timedelta(days=1))
            elif date_range == 'this_week':
                start_of_week = today - datetime.timedelta(days=today.weekday())
                queryset = queryset.filter(uploaded_at__date__gte=start_of_week)
            elif date_range == 'this_month':
                queryset = queryset.filter(
                    uploaded_at__date__year=today.year,
                    uploaded_at__date__month=today.month
                )
            elif date_range == 'this_year':
                queryset = queryset.filter(uploaded_at__date__year=today.year)
                
        return queryset
    
    def _compute_file_hash(self, file_obj):
        """Compute SHA-256 hash of file contents"""
        sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        
        # Reset file position for subsequent reads
        file_obj.seek(0)
        
        return sha256.hexdigest()

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple files at once"""
        file_ids = request.data.get('file_ids', [])
        
        if not file_ids:
            return Response({'error': 'No file IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        deleted_count = 0
        errors = []
        
        for file_id in file_ids:
            try:
                file_obj = File.objects.get(id=file_id)
                
                if file_obj.reference_count > 1:
                    # If referenced by multiple uploads, just decrement the counter
                    file_obj.reference_count -= 1
                    file_obj.save()
                else:
                    # If this is the last reference, perform actual deletion
                    file_obj.delete()
                    
                deleted_count += 1
            except File.DoesNotExist:
                errors.append(f"File with ID {file_id} not found")
            except Exception as e:
                errors.append(f"Error deleting file {file_id}: {str(e)}")
                
        # Invalidate cache after bulk operations
        cache.clear()
                
        return Response({
            'deleted_count': deleted_count,
            'total_requested': len(file_ids),
            'errors': errors
        })
    
    @action(detail=False, methods=['post'])
    def bulk_tag(self, request):
        """Add tags to multiple files at once"""
        file_ids = request.data.get('file_ids', [])
        tags = request.data.get('tags', [])
        
        if not file_ids or not tags:
            return Response({'error': 'Both file_ids and tags are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        updated_count = 0
        errors = []
        
        for file_id in file_ids:
            try:
                file_obj = File.objects.get(id=file_id)
                
                # Initialize tags if None
                if file_obj.tags is None:
                    file_obj.tags = []
                    
                # Add new tags that don't already exist
                current_tags = set(file_obj.tags)
                for tag in tags:
                    if tag not in current_tags:
                        file_obj.tags.append(tag)
                        
                file_obj.save()
                updated_count += 1
            except File.DoesNotExist:
                errors.append(f"File with ID {file_id} not found")
            except Exception as e:
                errors.append(f"Error updating file {file_id}: {str(e)}")
                
        # Invalidate cache after bulk operations
        cache.clear()
                
        return Response({
            'updated_count': updated_count,
            'total_requested': len(file_ids),
            'errors': errors
        })
