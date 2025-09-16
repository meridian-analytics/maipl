"""
Middleware for handling demo environment functionality.
"""

from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.db import transaction
from django.core.cache import cache
import re
from django.http import JsonResponse

class DemoEnvironmentMiddleware(MiddlewareMixin):
    """
    Middleware that rolls back all database changes in the demo environment.
    
    This middleware wraps each request in a transaction and rolls it back at the end,
    effectively making the entire demo environment read-only while still allowing
    users to see the effects of their actions during their session.
    """
    
    # Paths that should be excluded from rollback
    EXCLUDED_PATHS = [
        r'^/api/auth/',         # Authentication endpoints
        r'^/api/token/',        # JWT token endpoints
        r'^/api/token/refresh/', # Token refresh
        r'^/admin/login/',      # Admin login
        r'^/login/',            # Any login endpoint
    ]
    
    def is_demo_mode_enabled(self):
        """
        Check if demo mode is enabled either via settings or runtime configuration.
        """
        return cache.get('DEMO_MODE_ENABLED', settings.IS_DEMO_ENVIRONMENT)
    
    def is_excluded_path(self, path):
        """
        Check if the current path should be excluded from rollback.
        """
        for pattern in self.EXCLUDED_PATHS:
            if re.match(pattern, path):
                return True
        return False
    
    def process_request(self, request):
        """
        Start a transaction for each request in the demo environment.
        """
        # Store whether this request should be rolled back
        request._demo_rollback = False
        
        # Don't do anything if demo mode isn't enabled
        if not self.is_demo_mode_enabled():
            return None
            
        # Don't rollback GET requests (read-only)
        if request.method == 'GET':
            return None
            
        # Don't rollback excluded paths (auth-related)
        if self.is_excluded_path(request.path):
            return None
            
        # Mark this request for rollback
        request._demo_rollback = True
        
        # Start transaction
        if not transaction.get_connection().in_atomic_block:
            # If we're not already in a transaction, start one
            transaction.set_autocommit(False)
            transaction.atomic().__enter__()
            request._demo_atomic_entered = True
        else:
            # If we're already in a transaction, create a savepoint
            sid = transaction.savepoint()
            request._demo_savepoint_id = sid
            request._demo_atomic_entered = False
        
        return None
        
    def process_response(self, request, response):
        """
        Roll back the transaction at the end of each request in the demo environment.
        """
        # Don't do anything if this request isn't marked for rollback
        if not hasattr(request, '_demo_rollback') or not request._demo_rollback:
            return response
            
        # Handle transaction rollback based on how we started it
        if hasattr(request, '_demo_savepoint_id'):
            # If we created a savepoint, roll back to it
            try:
                transaction.savepoint_rollback(request._demo_savepoint_id)
            except:
                # If rollback fails, just continue - we're in demo mode anyway
                pass
        elif hasattr(request, '_demo_atomic_entered') and request._demo_atomic_entered:
            # If we entered an atomic block, exit and rollback
            try:
                transaction.atomic().__exit__(None, None, None)
                transaction.set_autocommit(True)
            except:
                # If rollback fails, just continue
                pass
        
        return response
        
    def process_exception(self, request, exception):
        """
        Ensure transaction is rolled back on exceptions.
        """
        # Don't do anything if this request isn't marked for rollback
        if not hasattr(request, '_demo_rollback') or not request._demo_rollback:
            return None
            
        # Handle transaction rollback based on how we started it
        if hasattr(request, '_demo_savepoint_id'):
            # If we created a savepoint, roll back to it
            try:
                transaction.savepoint_rollback(request._demo_savepoint_id)
            except:
                # If rollback fails, just continue - we're in demo mode anyway
                pass
        elif hasattr(request, '_demo_atomic_entered') and request._demo_atomic_entered:
            # If we entered an atomic block, exit and rollback
            try:
                transaction.atomic().__exit__(None, None, None)
                transaction.set_autocommit(True)
            except:
                # If rollback fails, just continue
                pass
        
        return None