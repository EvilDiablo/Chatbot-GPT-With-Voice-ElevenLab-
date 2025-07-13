# Medical Assistant with AI-Powered Analysis

A comprehensive medical assistant application that combines AI-powered chat functionality with document analysis, medical imaging, and patient management capabilities.

## Features

### 💬 Medical Chat
- AI-powered medical consultation using Azure OpenAI
- Real-time chat interface with conversation management
- Voice response capabilities
- Comprehensive health advice and symptom analysis
- Persistent conversation history with sidebar management

### 📄 Document Assistant
- Upload and analyze medical documents (PDF, DOCX, DOC, TXT)
- Patient context integration for personalized analysis
- Extract medical information, allergies, medications, and treatment details
- AI-powered document parsing and information extraction
- Conversation continuity with patient data preservation

### 🔬 Medical Imaging
- Upload and analyze medical images including X-rays, CT scans, and other diagnostic imaging
- AI-powered orthopedic analysis using GPT-4 Vision
- Detailed clinical findings extraction
- Support for various image formats (PNG, JPG, JPEG)
- Professional medical imaging insights

### 👥 Patient Database
- Comprehensive patient record management system
- Add, edit, search, and manage patient information
- Store medical history, contact details, and treatment records
- Full CRUD operations with JSON-based storage
- Patient search and selection for document analysis context

## Backend Endpoints

### Chat & Conversation Endpoints
- `POST /chat-response` - Main medical chat endpoint using Azure OpenAI
- `POST /new-medical-conversation` - Create new medical chat conversation
- `GET /medical-conversations` - List all medical conversations
- `GET /conversation/{id}/messages` - Get conversation messages
- `POST /conversation/{id}/save-message` - Save message to conversation
- `POST /conversation/{id}/rename` - Rename conversation
- `DELETE /conversation/{id}` - Delete conversation

### Document Analysis Endpoints
- `POST /thinker` - Medical document analysis with patient context
- `POST /new-document-conversation` - Create new document analysis conversation
- `GET /document-conversations` - List all document conversations
- `POST /conversation/{id}/patient-data` - Save patient data to conversation
- `GET /conversation/{id}/patient-data` - Get patient data from conversation

### Patient Management Endpoints
- `GET /patients` - List all patients
- `POST /patients` - Create new patient
- `GET /patients/{id}` - Get patient by ID
- `PUT /patients/{id}` - Update patient
- `DELETE /patients/{id}` - Delete patient
- `POST /patients/search` - Search patients by name, MRN, or DOB

### Image Analysis Endpoints
- `POST /analyze-image/` - Medical image analysis using GPT-4 Vision

## Frontend Components

### Medical Chat Tab
- Real-time chat interface with conversation management
- Persistent conversation history with sidebar
- Message history and conversation switching
- Loading states and voice response controls
- Auto-creation of new conversations

### Document Assistant Tab
- File upload for medical documents (PDF, DOCX, DOC, TXT)
- Patient search and selection workflow
- Document analysis with patient context
- Conversation continuity with patient data preservation
- Professional medical document processing

### Medical Imaging Tab
- Drag-and-drop image upload for medical images
- Image preview and analysis results display
- Support for X-rays, CT scans, and other diagnostic imaging
- Professional medical UI with detailed insights

### Patient Database Tab
- Comprehensive patient management interface
- Add, edit, search, and delete patient records
- Patient information display and management
- Integration with document analysis workflow

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables in a `.env` file:
   ```
   AZURE_OPENAI_ENDPOINT=your_azure_endpoint
   AZURE_OPENAI_API_KEY=your_azure_api_key
   ASSISTANT_ID=your_assistant_id
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Run the backend server:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Medical Chat
1. Click on the "Medical Chat" tab
2. Type your medical question in the text area
3. Press Enter or click the send button
4. The AI assistant will respond using Azure OpenAI
5. Use the voice button to hear the response
6. Manage conversations using the sidebar

### Document Assistant
1. Click on the "Document Assistant" tab
2. Search for a patient by name, MRN, or date of birth
3. Select the patient from the search results
4. Upload a medical document (PDF, DOCX, DOC, TXT)
5. Ask specific questions about the document content
6. Get AI-powered analysis with patient context

### Medical Imaging
1. Click on the "Medical Imaging" tab
2. Upload a medical image by clicking the upload area or dragging and dropping
3. Click "Analyze Image" to process the image
4. View the detailed medical imaging analysis results

### Patient Database
1. Click on the "Patient Database" tab
2. Add new patients with comprehensive medical information
3. Search and edit existing patient records
4. Manage patient data including medical history and contact details

## Technical Details

### Backend Architecture
- **FastAPI**: Modern Python web framework
- **Azure OpenAI**: For chat and document analysis
- **OpenAI GPT-4 Vision**: For X-ray image analysis
- **CORS**: Configured for frontend communication

### Frontend Architecture
- **Next.js**: React framework with TypeScript
- **Tailwind CSS**: Styling and responsive design
- **Radix UI**: Accessible UI components
- **Axios**: HTTP client for API communication

### Key Features
- Real-time medical chat with conversation management
- Professional document analysis with patient context
- Medical imaging analysis for X-rays and diagnostic images
- Comprehensive patient database management
- Persistent conversation storage and history
- Responsive design with modern UI
- Error handling and loading states
- Voice response capabilities
- Auto-creation of conversations
- Patient data integration across modules

## API Documentation

Once the backend is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.