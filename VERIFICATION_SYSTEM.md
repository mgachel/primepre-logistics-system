# Customer Account Verification System

## Overview

This system allows customers who were added via Excel upload to verify their accounts using their shipping mark and set their own password.

## How It Works

### 1. Customer Upload via Excel
- Admins upload customers via Excel with shipping marks
- Customers are created with `is_verified=False`
- Each customer has a unique shipping mark (e.g., "PM 001", "PM 002")

### 2. Verification Flow

#### Step 1: Phone Number & Shipping Mark Check
1. Customer visits `/verify-account`
2. Enters their phone number registered in the system
3. Selects whether they have a shipping mark:
   - **YES**: System searches cargo database for their shipping mark
   - **NO**: Proceeds directly to password setup

#### Step 2: Shipping Mark Verification (if applicable)
1. Customer enters their shipping mark (e.g., "PM 001")
2. System searches `CargoItem` table for items with matching shipping mark
3. If found:
   - Shows a list of their cargo items (tracking IDs, containers, descriptions)
   - Confirms shipping mark matches their account
4. If not found:
   - Shows error message
   - Customer can try again or contact support

#### Step 3: Confirm & Set Password
1. Customer reviews their account information
2. (If applicable) Reviews their cargo items to confirm
3. Sets a password (min 8 characters)
4. Confirms password
5. System:
   - Sets the password
   - Marks account as verified (`is_verified=True`)
   - Generates JWT tokens for auto-login
   - Redirects to dashboard

## API Endpoints

### Backend (Django)

#### 1. Verify Shipping Mark
```
POST /api/auth/verify/shipping-mark/
```

**Request Body:**
```json
{
  "phone": "+233123456789",
  "has_shipping_mark": true,
  "shipping_mark": "PM 001"
}
```

**Response (Success - Shipping Mark Found):**
```json
{
  "success": true,
  "has_shipping_mark": true,
  "shipping_mark_verified": true,
  "message": "Shipping mark found! Please review your cargo items below.",
  "user": {
    "phone": "+233123456789",
    "name": "John Doe",
    "email": "john@example.com",
    "shipping_mark": "PM 001"
  },
  "cargo_items": [
    {
      "tracking_id": "BGI123_PM001_20250101_0001",
      "container_id": "BGI123",
      "description": "Electronics",
      "quantity": 5,
      "cargo_type": "sea",
      "status": "in_transit",
      "eta": "2025-01-15"
    }
  ],
  "total_items": 1,
  "instructions": "If these are your items, please confirm to proceed with account verification."
}
```

**Response (No Shipping Mark):**
```json
{
  "success": true,
  "has_shipping_mark": false,
  "message": "No shipping mark verification needed",
  "user": {
    "phone": "+233123456789",
    "name": "John Doe",
    "email": "john@example.com",
    "shipping_mark": "PM 001"
  },
  "instructions": "You can proceed to set your password and verify your account.",
  "verification_required": true
}
```

**Response (Error - Not Found):**
```json
{
  "success": false,
  "error": "No cargo items found with this shipping mark",
  "message": "Please check your shipping mark and try again. Contact support if the issue persists.",
  "provided_mark": "PM 999"
}
```

#### 2. Confirm Shipping Mark & Set Password
```
POST /api/auth/verify/shipping-mark/confirm/
```

**Request Body:**
```json
{
  "phone": "+233123456789",
  "shipping_mark": "PM 001",
  "password": "MySecurePass123",
  "confirm_password": "MySecurePass123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Account verified successfully!",
  "user": {
    "id": 123,
    "phone": "+233123456789",
    "email": "john@example.com",
    "name": "John Doe",
    "shipping_mark": "PM 001",
    "is_verified": true,
    "user_role": "CUSTOMER"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  },
  "instructions": "Your account is now active. You can login and track your shipments."
}
```

## Frontend Pages

### `/verify-account` - Account Verification Page

**Features:**
- Two-step verification process
- Phone number input
- Radio button selection for shipping mark
- Shipping mark input field
- Cargo items table display
- Password setup form
- Error and success alerts

**UI Components:**
- Card layout with centered design
- Form validation
- Loading states
- Error/success messages
- Cargo items table with badges
- Back navigation button

## Security Features

1. **Verification Check**: Only unverified users can use this endpoint
2. **Shipping Mark Match**: System verifies shipping mark matches account
3. **Password Validation**: Min 8 characters
4. **Phone Validation**: Must be registered in system
5. **Auto-login**: Generates JWT tokens after successful verification

## Database Schema

### CustomerUser Model
```python
class CustomerUser(AbstractBaseUser):
    phone = models.CharField(max_length=15, unique=True)
    shipping_mark = models.CharField(max_length=100, unique=True)
    is_verified = models.BooleanField(default=False)
    # ... other fields
```

### CargoItem Model
```python
class CargoItem(models.Model):
    client = models.ForeignKey(CustomerUser, related_name='cargo_items')
    tracking_id = models.CharField(max_length=100, unique=True)
    container = models.ForeignKey(CargoContainer)
    # ... other fields
```

## User Journey

```
1. Admin uploads customer Excel
   ↓
2. Customer receives notification (email/SMS)
   ↓
3. Customer visits /verify-account
   ↓
4. Enters phone number
   ↓
5. Selects "Yes, I have shipping mark"
   ↓
6. Enters shipping mark (e.g., "PM 001")
   ↓
7. System searches cargo database
   ↓
8. Shows matching cargo items
   ↓
9. Customer confirms items are theirs
   ↓
10. Sets password
   ↓
11. Account verified & auto-logged in
   ↓
12. Redirected to customer dashboard
```

## Error Handling

### Common Errors:
1. **Phone not found**: "No account found with this phone number"
2. **Already verified**: "This account is already verified"
3. **Shipping mark not found**: "No cargo items found with this shipping mark"
4. **Shipping mark mismatch**: "The shipping mark you provided does not match your registered account"
5. **Weak password**: "Password must be at least 8 characters long"
6. **Password mismatch**: "Passwords do not match"

## Testing

### Test Scenarios:
1. ✅ Verify with valid shipping mark
2. ✅ Verify without shipping mark
3. ❌ Try with invalid shipping mark
4. ❌ Try with already verified account
5. ❌ Try with non-existent phone
6. ❌ Try with mismatched shipping mark
7. ✅ Set weak password (should fail)
8. ✅ Set mismatched passwords (should fail)

## Implementation Files

### Backend:
- `users/views.py` - `ShippingMarkVerificationView`, `ShippingMarkConfirmationView`
- `users/serializers.py` - `ShippingMarkVerificationSerializer`, `ShippingMarkConfirmationSerializer`
- `users/urls.py` - Route configuration
- `users/models.py` - CustomerUser with `is_verified` field
- `cargo/models.py` - CargoItem with client relationship

### Frontend:
- `frontend/src/pages/VerifyAccount.tsx` - Main verification page
- `frontend/src/App.tsx` - Route: `/verify-account`
- `frontend/src/pages/Login.tsx` - Link to verification

## Future Enhancements

1. **Email Notifications**: Send verification link via email
2. **SMS Notifications**: Send verification code via SMS
3. **Bulk Verification**: Allow admins to bulk-verify customers
4. **Verification Expiry**: Add time limit for verification
5. **Multi-language**: Support multiple languages
6. **QR Code**: Generate QR code for quick verification
7. **Two-Factor Auth**: Add 2FA after password setup

## Support

If customers have issues:
1. Check phone number is correct
2. Verify shipping mark spelling
3. Contact support if shipping mark not found
4. Admin can manually verify account if needed
