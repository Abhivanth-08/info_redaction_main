# AI PII Redactor - FastAPI Backend

A comprehensive FastAPI backend that integrates with your React frontend to provide AI-powered PII/PHI detection and redaction capabilities.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies (if not already done)
npm install
```

### 2. Environment Setup

Copy the environment template and configure your API keys:

```bash
cp env.example .env
```

Edit `.env` and add your OpenRouter API key:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Start the Backend

```bash
# Option 1: Use the startup script (recommended)
python start_backend.py

# Option 2: Direct uvicorn command
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start the Frontend

```bash
# In a separate terminal
npm run dev
```

## 📋 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information and available endpoints |
| `GET` | `/health` | Health check endpoint |
| `POST` | `/upload` | Upload PDF file for processing |
| `POST` | `/process/{job_id}` | Start processing a document |
| `GET` | `/status/{job_id}` | Get processing status |
| `GET` | `/download/{filename}` | Download processed files |
| `GET` | `/jobs` | List all processing jobs |
| `DELETE` | `/jobs/{job_id}` | Delete a job and associated files |

### Upload Endpoint

```bash
curl -X POST "http://localhost:8000/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf"
```

Response:
```json
{
  "job_id": "job_20241201_143022_1234",
  "filename": "document.pdf",
  "file_size": 1024000,
  "status": "uploaded",
  "message": "File uploaded successfully"
}
```

### Process Document

```bash
curl -X POST "http://localhost:8000/process/job_20241201_143022_1234" \
  -H "Content-Type: application/json" \
  -d '{
    "create_overlay": true,
    "user_replacement_choice": "text_box"
  }'
```

### Check Status

```bash
curl "http://localhost:8000/status/job_20241201_143022_1234"
```

Response:
```json
{
  "job_id": "job_20241201_143022_1234",
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "result_files": [
    "job_20241201_143022_1234_redacted.pdf",
    "job_20241201_143022_1234_overlay.pdf",
    "job_20241201_143022_1234_log.json"
  ]
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key for LangChain integration | Required |
| `API_HOST` | Host to bind the server | `0.0.0.0` |
| `API_PORT` | Port to bind the server | `8000` |
| `SECRET_KEY` | Secret key for security | Auto-generated |

### File Storage

The backend creates and manages these directories:

- `uploads/` - Temporary storage for uploaded files
- `processed/` - Processed and redacted documents
- `logs/` - Processing logs and audit trails

## 🏗️ Architecture

### Core Components

1. **SecureInfoRedactionPipeline** - Main processing pipeline
2. **SecureRedactionPolicyManager** - Policy management for redaction rules
3. **LangChainDummyDataGenerator** - AI-powered dummy data generation
4. **FastAPI Application** - REST API with async processing

### Processing Flow

1. **Upload** - User uploads PDF file
2. **Parse** - Document parsing with Docling AI
3. **Detect** - PII/PHI detection using multiple methods
4. **Generate** - LangChain-powered dummy data generation
5. **Redact** - Apply redaction based on policies
6. **Export** - Generate final documents and overlays

## 🔒 Security Features

- **Memory-only processing** - No intermediate files saved
- **Secure file handling** - Automatic cleanup of temporary files
- **Policy-based redaction** - Configurable redaction strategies
- **Audit logging** - Complete processing logs
- **CORS protection** - Configured for frontend integration

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:8000/health
```

### Job Management

```bash
# List all jobs
curl http://localhost:8000/jobs

# Delete a job
curl -X DELETE http://localhost:8000/jobs/job_id
```

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Install missing dependencies
   pip install -r requirements.txt
   ```

2. **API Key Issues**
   ```bash
   # Check environment variables
   echo $OPENROUTER_API_KEY
   ```

3. **Port Conflicts**
   ```bash
   # Use different port
   uvicorn main:app --port 8001
   ```

4. **File Upload Issues**
   - Ensure file is PDF format
   - Check file size (10MB limit)
   - Verify CORS settings

### Logs

Check the `logs/` directory for detailed processing logs and error information.

## 🔄 Integration with Frontend

The backend is designed to work seamlessly with the React frontend:

1. **Upload Integration** - `UploadZone` component uploads files
2. **Real-time Updates** - `ProcessingPipeline` polls job status
3. **Download Integration** - Direct download links for processed files
4. **Error Handling** - Comprehensive error messages and user feedback

## 🚀 Deployment

### Development
```bash
python start_backend.py
```

### Production
```bash
# Using Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Using Docker (if containerized)
docker run -p 8000:8000 ai-pii-redactor
```

## 📈 Performance

- **Async Processing** - Non-blocking file uploads and processing
- **Background Jobs** - Long-running tasks don't block API responses
- **Memory Optimization** - Efficient handling of large PDF files
- **Caching** - LangChain dummy data generation caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
