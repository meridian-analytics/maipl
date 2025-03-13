"""
Management command to toggle demo mode without restarting the application.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.cache import cache

class Command(BaseCommand):
    help = 'Toggle demo mode on/off without restarting the application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--on',
            action='store_true',
            dest='turn_on',
            help='Turn demo mode ON',
        )
        
        parser.add_argument(
            '--off',
            action='store_true',
            dest='turn_off',
            help='Turn demo mode OFF',
        )
        
        parser.add_argument(
            '--status',
            action='store_true',
            dest='status',
            help='Show current demo mode status',
        )

    def handle(self, *args, **options):
        # Check the conflicting arguments
        if options['turn_on'] and options['turn_off']:
            self.stderr.write(self.style.ERROR('Cannot specify both --on and --off'))
            return
            
        # Get current status
        current_status = cache.get('DEMO_MODE_ENABLED', settings.IS_DEMO_ENVIRONMENT)
        
        # Just show status if requested
        if options['status']:
            status_str = 'ENABLED' if current_status else 'DISABLED'
            self.stdout.write(f'Demo mode is currently {status_str}')
            return
            
        # Toggle based on arguments
        if options['turn_on']:
            cache.set('DEMO_MODE_ENABLED', True, None)  # None means no expiration
            self.stdout.write(self.style.SUCCESS('Demo mode has been ENABLED'))
        elif options['turn_off']:
            cache.set('DEMO_MODE_ENABLED', False, None)
            self.stdout.write(self.style.SUCCESS('Demo mode has been DISABLED'))
        else:
            # If no specific action, toggle the current state
            new_status = not current_status
            cache.set('DEMO_MODE_ENABLED', new_status, None)
            status_str = 'ENABLED' if new_status else 'DISABLED'
            self.stdout.write(self.style.SUCCESS(f'Demo mode has been toggled to {status_str}')) 