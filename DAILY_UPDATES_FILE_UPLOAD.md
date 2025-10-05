# Daily Updates File Upload Feature

## Summary
Added document attachment capability to Daily Updates, allowing admins to upload files (PDF, Excel, Word, etc.) that clients can download from their dashboard announcements.

## Changes Made

### Backend

#### 1. **daily_updates/models.py**
- Added 3 new fields to `DailyUpdate` model:
  - `attachment`: FileField for storing uploaded documents
  - `attachment_name`: CharField for display name
  - `attachment_size`: IntegerField for file size in bytes
- Added `save()` method override to auto-populate attachment metadata
- Added properties:
  - `attachment_file_extension`: Returns file extension
  - `attachment_size_display`: Human-readable file size (e.g., "2.5 MB")

#### 2. **daily_updates/serializers.py**
- Added attachment-related fields to `DailyUpdateSerializer`:
  - `attachment_file_extension` (read-only)
  - `attachment_size_display` (read-only)
  - `attachment_url` (computed field with full URL)
- Added `validate_attachment()` method:
  - Max file size: 10MB
  - Allowed types: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, JPEG, PNG, ZIP, RAR
- Set `attachment_name` and `attachment_size` as read-only (auto-populated)

#### 3. **daily_updates/views.py**
- Updated `DailyUpdateViewSet`:
  - Added `get_serializer_context()` to include request for building absolute URLs

#### 4. **Database Migration**
- Created migration: `0002_dailyupdate_attachment_dailyupdate_attachment_name_and_more.py`
- Adds the 3 new fields to database schema

### Frontend

#### 1. **services/dailyUpdatesService.ts**
- Updated `DailyUpdate` interface with attachment fields:
  - `attachment`, `attachment_name`, `attachment_size`
  - `attachment_file_extension`, `attachment_size_display`, `attachment_url`
- Added new method `createOrUpdateWithFile()`:
  - Handles multipart/form-data uploads
  - Uses native `fetch()` API instead of apiClient
  - Supports both create (POST) and update (PATCH)
  - Includes proper error handling

#### 2. **components/daily-updates/DailyUpdateForm.tsx**
- Added file upload state:
  - `selectedFile`: Currently selected file
  - `fileError`: Validation error message
- Added `handleFileChange()` function:
  - Validates file size (10MB max)
  - Validates file type
  - Updates selected file state
- Modified `handleFormSubmit()`:
  - Now creates FormData object
  - Appends all form fields including file
  - Calls `createOrUpdateWithFile()` instead of regular create/update
- Added file input field in form:
  - File type restrictions via accept attribute
  - Shows selected file name and size
  - Clear button to remove selection
  - Shows current attachment for existing updates

#### 3. **pages/CustomerDashboard.tsx**
- Updated `DailyUpdateCard` component:
  - Added attachment display section (shows when expanded)
  - Shows file name and size
  - Download button with link to file
  - Styled with icon and bordered container

## File Validation Rules

### Backend (Serializer)
```python
max_size = 10 * 1024 * 1024  # 10MB
allowed_extensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv',
    'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'
]
```

### Frontend (Form)
```typescript
maxSize = 10 * 1024 * 1024;  // 10MB
allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/jpeg',
    'image/png',
    'application/zip',
    'application/x-rar-compressed',
];
```

## File Storage

- **Upload path**: `media/daily_updates/attachments/%Y/%m/`
- **Example**: `media/daily_updates/attachments/2025/10/report.pdf`
- Files are organized by year/month for better organization

## Usage

### For Admins
1. Navigate to Daily Updates Admin page
2. Create or edit a daily update
3. Fill in title, content, priority, expiry date
4. Click "Choose File" to select a document
5. Selected file will show name and size
6. Submit the form
7. File will be uploaded and attached to the update

### For Customers
1. View Daily Updates from dashboard
2. Expand an update by clicking the chevron icon
3. If update has an attachment, it will display below content
4. Click "Download" button to download the file
5. File opens/downloads based on browser settings

## API Changes

### Create/Update Endpoint
- **POST** `/api/daily-updates/`
- **PATCH** `/api/daily-updates/{id}/`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with fields:
  - `title`: string
  - `content`: string
  - `priority`: 'low' | 'medium' | 'high'
  - `expires_at`: ISO date string (optional)
  - `attachment`: File (optional)

### Response
```json
{
  "id": 1,
  "title": "Important Update",
  "content": "Please review the attached document...",
  "priority": "high",
  "attachment": "/media/daily_updates/attachments/2025/10/report.pdf",
  "attachment_name": "report.pdf",
  "attachment_size": 2560000,
  "attachment_size_display": "2.4 MB",
  "attachment_file_extension": "pdf",
  "attachment_url": "http://localhost:8000/media/daily_updates/attachments/2025/10/report.pdf",
  "created_at": "2025-10-05T10:00:00Z",
  "is_expired": false,
  "days_until_expiry": 5
}
```

## Testing Steps

1. **Run migrations**:
   ```bash
   python manage.py migrate daily_updates
   ```

2. **Test file upload (Admin)**:
   - Login as admin
   - Go to Daily Updates Admin
   - Create new update with file attachment
   - Verify file uploads successfully
   - Check that file appears in media folder

3. **Test file download (Customer)**:
   - Login as customer
   - View dashboard announcements
   - Expand update with attachment
   - Click download button
   - Verify file downloads correctly

4. **Test validations**:
   - Try uploading file > 10MB (should fail)
   - Try uploading invalid file type (should fail)
   - Try uploading valid file (should succeed)

## Production Considerations

1. **Media Storage**: Ensure MEDIA_ROOT and MEDIA_URL are properly configured
2. **File Serving**: Configure web server (nginx/Apache) to serve media files
3. **Security**: Consider adding authentication to media file URLs
4. **Storage**: Monitor disk space for uploaded files
5. **Cleanup**: Consider implementing automatic cleanup of old attachments

## Future Enhancements

- [ ] Multiple file attachments per update
- [ ] File preview (for images/PDFs)
- [ ] Virus scanning for uploaded files
- [ ] Cloud storage integration (S3, Azure Blob)
- [ ] Drag-and-drop file upload
- [ ] File version history
- [ ] Automatic file compression
