# users/sms_sender.py
from django.conf import settings
import logging
import os

logger = logging.getLogger(__name__)


class SMSSender:
    """
    Utility class for sending SMS messages.
    In development mode, logs PIN to console instead of sending SMS.
    """
    
    def __init__(self):
        """Initialize SMS sender based on environment."""
        self.is_development = settings.DEBUG or os.getenv('ENVIRONMENT', 'development') == 'development'
        
        if self.is_development:
            logger.info("SMS sender initialized in DEVELOPMENT mode - PINs will be logged to console")
        else:
            try:
                # Only try to import Twilio in production
                from twilio.rest import Client
                from twilio.base.exceptions import TwilioException
                
                self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
                self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
                self.from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
                
                if not all([self.account_sid, self.auth_token, self.from_number]):
                    raise ValueError("Missing Twilio configuration in settings")
                
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("SMS sender initialized successfully with Twilio")
                
            except Exception as e:
                logger.error(f"Failed to initialize SMS sender: {str(e)}")
                self.client = None
    
    def send_verification_pin(self, phone_number, pin):
        """
        Send verification PIN via SMS or log to console in development.
        
        Args:
            phone_number: Recipient's phone number
            pin: 6-digit verification PIN
            
        Returns:
            dict: {'success': bool, 'message': str, 'sid': str or None}
        """
        if self.is_development:
            # In development mode, just log the PIN to console
            logger.info(f"📱 DEVELOPMENT MODE - SMS would be sent to {phone_number}")
            logger.info(f"🔐 VERIFICATION PIN: {pin}")
            print(f"\n{'='*50}")
            print(f"📱 SMS VERIFICATION (DEVELOPMENT MODE)")
            print(f"Phone: {phone_number}")
            print(f"PIN: {pin}")
            print(f"{'='*50}\n")
            
            return {
                'success': True,
                'message': f'Development mode: PIN {pin} logged to console for {phone_number}',
                'sid': 'dev_mode_message'
            }
        
        # Production mode - use Twilio
        if not hasattr(self, 'client') or not self.client:
            return {
                'success': False,
                'message': 'SMS service not configured properly',
                'sid': None
            }
        
        try:
            from twilio.base.exceptions import TwilioException
            # Format phone number
            formatted_phone = self._format_phone_number(phone_number)
            
            # Create message text
            message_body = (
                f"Your PrimePre verification code is: {pin}\n\n"
                f"This code will expire in 10 minutes. "
                f"Do not share this code with anyone."
            )
            
            # Send SMS
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=formatted_phone
            )
            
            logger.info(f"Verification PIN sent successfully to {formatted_phone}, SID: {message.sid}")
            
            return {
                'success': True,
                'message': 'Verification code sent successfully',
                'sid': message.sid
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending verification PIN to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send SMS: {str(e)}',
                'sid': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending verification PIN to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': 'An unexpected error occurred',
                'sid': None
            }
    
    def send_password_reset_pin(self, phone_number, pin):
        """
        Send password reset PIN via SMS or log to console in development.
        
        Args:
            phone_number: Recipient's phone number
            pin: 6-digit reset PIN
            
        Returns:
            dict: {'success': bool, 'message': str, 'sid': str or None}
        """
        if self.is_development:
            # In development mode, just log the PIN to console
            logger.info(f"📱 DEVELOPMENT MODE - Password reset SMS would be sent to {phone_number}")
            logger.info(f"🔐 PASSWORD RESET PIN: {pin}")
            print(f"\n{'='*50}")
            print(f"📱 PASSWORD RESET SMS (DEVELOPMENT MODE)")
            print(f"Phone: {phone_number}")
            print(f"Reset PIN: {pin}")
            print(f"{'='*50}\n")
            
            return {
                'success': True,
                'message': f'Development mode: Reset PIN {pin} logged to console for {phone_number}',
                'sid': 'dev_mode_reset_message'
            }
        
        # Production mode - use Twilio
        if not hasattr(self, 'client') or not self.client:
            return {
                'success': False,
                'message': 'SMS service not configured properly',
                'sid': None
            }
        
        try:
            from twilio.base.exceptions import TwilioException
            # Format phone number
            formatted_phone = self._format_phone_number(phone_number)
            
            # Create message text
            message_body = (
                f"Your PrimePre password reset code is: {pin}\n\n"
                f"This code will expire in 10 minutes. "
                f"If you didn't request this, please ignore this message."
            )
            
            # Send SMS
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=formatted_phone
            )
            
            logger.info(f"Password reset PIN sent successfully to {formatted_phone}, SID: {message.sid}")
            
            return {
                'success': True,
                'message': 'Password reset code sent successfully',
                'sid': message.sid
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending reset PIN to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send SMS: {str(e)}',
                'sid': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending reset PIN to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': 'An unexpected error occurred',
                'sid': None
            }
    
    def send_welcome_message(self, phone_number, user_name):
        """
        Send welcome message to new user or log to console in development.
        
        Args:
            phone_number: Recipient's phone number
            user_name: User's full name
            
        Returns:
            dict: {'success': bool, 'message': str, 'sid': str or None}
        """
        if self.is_development:
            # In development mode, just log the welcome message to console
            logger.info(f"📱 DEVELOPMENT MODE - Welcome SMS would be sent to {phone_number}")
            logger.info(f"👋 WELCOME MESSAGE for {user_name}")
            print(f"\n{'='*50}")
            print(f"📱 WELCOME SMS (DEVELOPMENT MODE)")
            print(f"Phone: {phone_number}")
            print(f"User: {user_name}")
            print(f"Message: Welcome to PrimePre! Your account is now verified.")
            print(f"{'='*50}\n")
            
            return {
                'success': True,
                'message': f'Development mode: Welcome message logged to console for {user_name}',
                'sid': 'dev_mode_welcome_message'
            }
        
        # Production mode - use Twilio
        if not hasattr(self, 'client') or not self.client:
            return {
                'success': False,
                'message': 'SMS service not configured properly',
                'sid': None
            }
        
        try:
            from twilio.base.exceptions import TwilioException
            # Format phone number
            formatted_phone = self._format_phone_number(phone_number)
            
            # Create message text
            message_body = (
                f"Welcome to PrimePre, {user_name}!\n\n"
                f"Your account has been successfully verified. "
                f"You can now log in and start using our logistics services."
            )
            
            # Send SMS
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=formatted_phone
            )
            
            logger.info(f"Welcome message sent successfully to {formatted_phone}, SID: {message.sid}")
            
            return {
                'success': True,
                'message': 'Welcome message sent successfully',
                'sid': message.sid
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending welcome message to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send SMS: {str(e)}',
                'sid': None
            }
        except Exception as e:
            logger.error(f"Unexpected error sending welcome message to {phone_number}: {str(e)}")
            return {
                'success': False,
                'message': 'An unexpected error occurred',
                'sid': None
            }
    
    def _format_phone_number(self, phone_number):
        """
        Format phone number for Twilio (ensure it starts with +).
        
        Args:
            phone_number: Raw phone number
            
        Returns:
            str: Formatted phone number
        """
        # Remove all non-digit characters except +
        cleaned = ''.join(char for char in phone_number if char.isdigit() or char == '+')
        
        # If it doesn't start with +, assume US number and add +1
        if not cleaned.startswith('+'):
            if len(cleaned) == 10:  # US number without country code
                cleaned = '+1' + cleaned
            elif len(cleaned) == 11 and cleaned.startswith('1'):  # US number with 1 prefix
                cleaned = '+' + cleaned
            else:
                # For international numbers, assume they need + prefix
                cleaned = '+' + cleaned
        
        return cleaned
    
    def validate_phone_number(self, phone_number):
        """
        Validate phone number using Twilio lookup service.
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            dict: {'valid': bool, 'formatted': str or None, 'country': str or None}
        """
        if not self.client:
            return {
                'valid': False,
                'formatted': None,
                'country': None,
                'error': 'SMS service not configured properly'
            }
        
        try:
            formatted_phone = self._format_phone_number(phone_number)
            
            # Use Twilio's lookup service to validate
            phone_info = self.client.lookups.v1.phone_numbers(formatted_phone).fetch()
            
            return {
                'valid': True,
                'formatted': phone_info.phone_number,
                'country': phone_info.country_code,
                'error': None
            }
            
        except TwilioException as e:
            logger.warning(f"Phone validation failed for {phone_number}: {str(e)}")
            return {
                'valid': False,
                'formatted': None,
                'country': None,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error validating phone {phone_number}: {str(e)}")
            return {
                'valid': False,
                'formatted': None,
                'country': None,
                'error': 'Validation service error'
            }


# Global SMS sender instance
sms_sender = SMSSender()


# Convenience functions
def send_verification_pin(phone_number, pin):
    """Send verification PIN via SMS."""
    return sms_sender.send_verification_pin(phone_number, pin)


def send_password_reset_pin(phone_number, pin):
    """Send password reset PIN via SMS."""
    return sms_sender.send_password_reset_pin(phone_number, pin)


def send_welcome_message(phone_number, user_name):
    """Send welcome message to new user."""
    return sms_sender.send_welcome_message(phone_number, user_name)


def validate_phone_number(phone_number):
    """Validate phone number."""
    return sms_sender.validate_phone_number(phone_number)