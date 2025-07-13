from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
import json
import os
from datetime import datetime

router = APIRouter(
    responses={404: {"description": "error"}}
)

# Pydantic models
class Patient(BaseModel):
    id: str
    name: str
    dateOfBirth: str
    medicalRecordNumber: str
    lastVisit: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergencyContact: Optional[str] = None
    insuranceProvider: Optional[str] = None
    insuranceNumber: Optional[str] = None
    primaryCarePhysician: Optional[str] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    conditions: Optional[List[str]] = None

class PatientCreate(BaseModel):
    name: str
    dateOfBirth: str
    medicalRecordNumber: str
    lastVisit: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergencyContact: Optional[str] = None
    insuranceProvider: Optional[str] = None
    insuranceNumber: Optional[str] = None
    primaryCarePhysician: Optional[str] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    conditions: Optional[List[str]] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    dateOfBirth: Optional[str] = None
    medicalRecordNumber: Optional[str] = None
    lastVisit: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergencyContact: Optional[str] = None
    insuranceProvider: Optional[str] = None
    insuranceNumber: Optional[str] = None
    primaryCarePhysician: Optional[str] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[str]] = None
    conditions: Optional[List[str]] = None

class PatientSearchRequest(BaseModel):
    query: str

class PatientSearchResponse(BaseModel):
    patients: List[Patient]
    total: int

# File path for patient data
PATIENTS_FILE = "data/patients.json"

def load_patients() -> List[dict]:
    """Load patients from JSON file"""
    try:
        if os.path.exists(PATIENTS_FILE):
            with open(PATIENTS_FILE, 'r') as f:
                return json.load(f)
        else:
            # Create data directory if it doesn't exist
            os.makedirs(os.path.dirname(PATIENTS_FILE), exist_ok=True)
            return []
    except Exception as e:
        print(f"Error loading patients: {e}")
        return []

def save_patients(patients: List[dict]):
    """Save patients to JSON file"""
    try:
        os.makedirs(os.path.dirname(PATIENTS_FILE), exist_ok=True)
        with open(PATIENTS_FILE, 'w') as f:
            json.dump(patients, f, indent=2)
    except Exception as e:
        print(f"Error saving patients: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving patients: {str(e)}")

def get_next_id() -> str:
    """Generate next available ID"""
    patients = load_patients()
    if not patients:
        return "1"
    max_id = max(int(p["id"]) for p in patients)
    return str(max_id + 1)

def search_patients(query: str) -> List[Patient]:
    """Search patients by name, MRN, or other criteria"""
    query_lower = query.lower()
    matching_patients = []
    patients_data = load_patients()
    
    for patient_data in patients_data:
        # Search by name, MRN, email, or phone
        if (query_lower in patient_data["name"].lower() or
            query_lower in patient_data["medicalRecordNumber"].lower() or
            (patient_data.get("email") and query_lower in patient_data["email"].lower()) or
            (patient_data.get("phone") and query_lower in patient_data["phone"].lower())):
            matching_patients.append(Patient(**patient_data))
    
    return matching_patients

def get_patient_by_id(patient_id: str) -> Optional[Patient]:
    """Get a specific patient by ID"""
    patients_data = load_patients()
    for patient_data in patients_data:
        if patient_data["id"] == patient_id:
            return Patient(**patient_data)
    return None

def get_patient_by_mrn(mrn: str) -> Optional[Patient]:
    """Get a specific patient by Medical Record Number"""
    patients_data = load_patients()
    for patient_data in patients_data:
        if patient_data["medicalRecordNumber"].lower() == mrn.lower():
            return Patient(**patient_data)
    return None

# CRUD Endpoints
@router.post("/", response_model=Patient)
async def create_patient(patient: PatientCreate):
    """Create a new patient"""
    try:
        patients_data = load_patients()
        
        # Check if MRN already exists
        for existing_patient in patients_data:
            if existing_patient["medicalRecordNumber"].lower() == patient.medicalRecordNumber.lower():
                raise HTTPException(status_code=400, detail="Medical Record Number already exists")
        
        new_patient = {
            "id": get_next_id(),
            **patient.dict()
        }
        
        patients_data.append(new_patient)
        save_patients(patients_data)
        
        return Patient(**new_patient)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating patient: {str(e)}")

@router.get("/", response_model=List[Patient])
async def get_all_patients():
    """Get all patients"""
    try:
        patients_data = load_patients()
        return [Patient(**patient_data) for patient_data in patients_data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting patients: {str(e)}")

@router.get("/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str):
    """Get a specific patient by ID"""
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient_update: PatientUpdate):
    """Update a patient"""
    try:
        patients_data = load_patients()
        
        # Find the patient
        patient_index = None
        for i, patient in enumerate(patients_data):
            if patient["id"] == patient_id:
                patient_index = i
                break
        
        if patient_index is None:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check if MRN is being changed and if it conflicts
        if patient_update.medicalRecordNumber:
            for i, existing_patient in enumerate(patients_data):
                if (i != patient_index and 
                    existing_patient["medicalRecordNumber"].lower() == patient_update.medicalRecordNumber.lower()):
                    raise HTTPException(status_code=400, detail="Medical Record Number already exists")
        
        # Update the patient
        update_data = patient_update.dict(exclude_unset=True)
        patients_data[patient_index].update(update_data)
        
        save_patients(patients_data)
        
        return Patient(**patients_data[patient_index])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating patient: {str(e)}")

@router.delete("/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient"""
    try:
        patients_data = load_patients()
        
        # Find and remove the patient
        for i, patient in enumerate(patients_data):
            if patient["id"] == patient_id:
                deleted_patient = patients_data.pop(i)
                save_patients(patients_data)
                return {"message": f"Patient {deleted_patient['name']} deleted successfully"}
        
        raise HTTPException(status_code=404, detail="Patient not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting patient: {str(e)}")

# Search endpoints
@router.post("/search", response_model=PatientSearchResponse)
async def search_patients_endpoint(request: PatientSearchRequest):
    """Search for patients by name, MRN, or other criteria"""
    try:
        patients = search_patients(request.query)
        return PatientSearchResponse(
            patients=patients,
            total=len(patients)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching patients: {str(e)}")

@router.get("/mrn/{mrn}", response_model=Patient)
async def get_patient_by_mrn_endpoint(mrn: str):
    """Get a specific patient by Medical Record Number"""
    patient = get_patient_by_mrn(mrn)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient 