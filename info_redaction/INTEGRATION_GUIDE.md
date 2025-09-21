# AI PII Redactor - Full Stack Integration Guide

## 🎯 Overview

This guide explains how to integrate your existing Python PII/PHI redaction functionality (`app3.py`) with your React frontend using FastAPI as the backend API.

## 📁 Project Structure

```
nasscom/
├── main.py                          # FastAPI backend server
├── requirements.txt                 # Python dependencies
├── start_backend.py                 # Python startup script
├── start_backend.bat               # Windows startup script
├── start_backend.sh                # Unix/Linux/Mac startup script
├── env.example                     # Environment configuration template
├── README_API.md                   # API documentation
├── INTEGRATION_GUIDE.md            # This guide
├── src/
│   ├── services/
│   │   └── api.ts                  # Frontend API service
│   ├── components/dashboard/
│   │   ├── UploadZone.tsx          # Updated upload component
│   │   └── ProcessingPipeline.tsx  # Updated processing pipeline
│   └── pages/
│       └── Dashboard.tsx           # Updated dashboard
└── uploads/, processed/, logs/     # Backend directories (auto-created)
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy and configure environment
cp env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Start backend (choose one method):
# Option 1: Python script
python start_backend.py

# Option 2: Windows batch file
start_backend.bat

# Option 3: Unix/Linux/Mac shell script
./start_backend.sh
```

### 2. Frontend Setup

```bash
# Install frontend dependencies (if not already done)
npm install

# Start frontend
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🔄 How It Works

### Upload Flow

1. User drags/drops or selects PDF in `UploadZone`
2. Frontend validates file (PDF only, <10MB)
3. File uploaded to `/upload` endpoint
4. Backend returns `job_id`
5. Frontend automatically switches to Pipeline tab

### Processing Flow

1. `ProcessingPipeline` component starts processing via `/process/{job_id}`
2. Backend runs your PII/PHI detection pipeline in background
3. Frontend polls `/status/{job_id}` every 2 seconds
4. Real-time progress updates and step visualization
5. Completion triggers download options

### Download Flow

1. Backend generates multiple files:
   - `{job_id}_redacted.pdf` - Redacted document
   - `{job_id}_overlay.pdf` - Redaction overlay
   - `{job_id}_log.json` - Processing log
2. Frontend provides download buttons for each file
3. Files downloaded directly to user's device

## 🔧 Key Features

### Backend Features

- **Async Processing**: Non-blocking file uploads and processing
- **Background Jobs**: Long-running tasks don't block API
- **Memory Optimization**: Efficient PDF handling
- **Automatic Cleanup**: Temporary files removed after processing
- **Comprehensive Logging**: Full audit trail
- **Error Handling**: Robust error recovery and reporting

### Frontend Features

- **Real-time Updates**: Live progress tracking
- **File Validation**: Client-side file type and size checking
- **Toast Notifications**: User feedback for all operations
- **Download Management**: Easy access to processed files
- **Error Display**: Clear error messages and recovery options

### Integration Features

- **CORS Configured**: Seamless frontend-backend communication
- **Type Safety**: Full TypeScript integration
- **API Service**: Centralized API communication
- **State Management**: Proper job tracking and status updates

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/upload` | POST | Upload PDF file |
| `/process/{job_id}` | POST | Start processing |
| `/status/{job_id}` | GET | Check processing status |
| `/download/{filename}` | GET | Download processed files |
| `/jobs` | GET | List all jobs |
| `/jobs/{job_id}` | DELETE | Delete job and files |

## 🔒 Security Considerations

- **File Validation**: Only PDF files accepted
- **Size Limits**: 10MB maximum file size
- **Temporary Storage**: Files cleaned up after processing
- **API Key Protection**: Environment-based configuration
- **CORS Protection**: Configured for specific origins

## 🐛 Troubleshooting

### Backend Issues

1. **Import Errors**: Run `pip install -r requirements.txt`
2. **API Key Issues**: Check `.env` file configuration
3. **Port Conflicts**: Change port in startup scripts
4. **File Permissions**: Ensure write access to upload/processed directories

### Frontend Issues

1. **CORS Errors**: Verify backend is running on port 8000
2. **Upload Failures**: Check file type and size
3. **Processing Stuck**: Check backend logs in `logs/` directory
4. **Download Issues**: Verify processed files exist

### Integration Issues

1. **API Connection**: Check if backend is running
2. **Job Status**: Verify job_id is being passed correctly
3. **File Paths**: Ensure directory structure is correct
4. **Environment**: Check all environment variables

## 📈 Performance Optimization

### Backend Optimizations

- **Async Processing**: Non-blocking operations
- **Memory Management**: Efficient PDF handling
- **Caching**: LangChain dummy data caching
- **Background Tasks**: Long-running operations

### Frontend Optimizations

- **Polling Optimization**: 2-second intervals for status checks
- **File Validation**: Client-side checks before upload
- **Error Boundaries**: Graceful error handling
- **Loading States**: Clear user feedback

## 🔄 Development Workflow

### Making Changes

1. **Backend Changes**: Modify `main.py` and restart server
2. **Frontend Changes**: Hot reload with `npm run dev`
3. **API Changes**: Update TypeScript interfaces in `api.ts`
4. **Component Changes**: Update React components as needed

### Testing

1. **Backend**: Use `/docs` endpoint for API testing
2. **Frontend**: Use browser dev tools for debugging
3. **Integration**: Test full upload → process → download flow
4. **Error Cases**: Test with invalid files and network issues

## 🚀 Deployment

### Development

```bash
# Terminal 1: Backend
python start_backend.py

# Terminal 2: Frontend
npm run dev
```

### Production

```bash
# Backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Frontend
npm run build
# Serve build directory with nginx/apache
```

## 📝 Next Steps

### Potential Enhancements

1. **Database Integration**: Store job history and user data
2. **User Authentication**: Add login/signup functionality
3. **Batch Processing**: Handle multiple files simultaneously
4. **Advanced Policies**: Custom redaction rules
5. **Cloud Storage**: AWS S3 or Azure Blob integration
6. **Monitoring**: Application performance monitoring
7. **Caching**: Redis for improved performance

### Integration with Your Existing Code

Your `app3.py` functionality is fully integrated:

- **PII Detection**: `execute_pii()` function
- **Document Parsing**: `extract_document_elements()`
- **Image Processing**: `find_img()` function
- **PDF Operations**: `write_text_to_pdf_from_data()`
- **LangChain Integration**: `OpenRouterChat` for dummy data generation

All your existing modules are imported and used in the `main.py` FastAPI application.

## 🎉 Conclusion

You now have a fully integrated full-stack application that combines:

- ✅ Your existing Python PII/PHI redaction pipeline
- ✅ Modern React frontend with real-time updates
- ✅ FastAPI backend with async processing
- ✅ Complete file upload, processing, and download flow
- ✅ Professional UI with progress tracking
- ✅ Comprehensive error handling and logging
- ✅ Production-ready architecture

The system is ready to use and can be easily extended with additional features as needed!
