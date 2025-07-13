"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  FileText,
  AlertTriangle,
  Pill,
  Heart,
  Loader2,
  Save,
  X
} from "lucide-react";
import axios from "axios";

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  lastVisit: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  primaryCarePhysician?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
}

interface PatientFormData {
  name: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  lastVisit: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  insuranceProvider: string;
  insuranceNumber: string;
  primaryCarePhysician: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
}

const PatientManagement = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<PatientFormData>({
    name: "",
    dateOfBirth: "",
    medicalRecordNumber: "",
    lastVisit: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
    insuranceProvider: "",
    insuranceNumber: "",
    primaryCarePhysician: "",
    allergies: [],
    medications: [],
    conditions: []
  });

  // Load patients on component mount
  useEffect(() => {
    loadPatients();
  }, []);

  // Filter patients based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.medicalRecordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (patient.phone && patient.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/patients/");
      setPatients(response.data);
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPatient) {
        // Update existing patient
        await axios.put(`http://localhost:8000/patients/${editingPatient.id}`, formData);
      } else {
        // Create new patient
        await axios.post("http://localhost:8000/patients/", formData);
      }
      
      await loadPatients();
      resetForm();
    } catch (error: any) {
      console.error("Error saving patient:", error);
      alert(error.response?.data?.detail || "Error saving patient");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (patientId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to delete ${patientName}?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`http://localhost:8000/patients/${patientId}`);
      await loadPatients();
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Error deleting patient");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      medicalRecordNumber: patient.medicalRecordNumber,
      lastVisit: patient.lastVisit,
      email: patient.email || "",
      phone: patient.phone || "",
      address: patient.address || "",
      emergencyContact: patient.emergencyContact || "",
      insuranceProvider: patient.insuranceProvider || "",
      insuranceNumber: patient.insuranceNumber || "",
      primaryCarePhysician: patient.primaryCarePhysician || "",
      allergies: patient.allergies || [],
      medications: patient.medications || [],
      conditions: patient.conditions || []
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      dateOfBirth: "",
      medicalRecordNumber: "",
      lastVisit: "",
      email: "",
      phone: "",
      address: "",
      emergencyContact: "",
      insuranceProvider: "",
      insuranceNumber: "",
      primaryCarePhysician: "",
      allergies: [],
      medications: [],
      conditions: []
    });
    setEditingPatient(null);
    setShowForm(false);
  };

  const addArrayItem = (field: keyof Pick<PatientFormData, 'allergies' | 'medications' | 'conditions'>, value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const removeArrayItem = (field: keyof Pick<PatientFormData, 'allergies' | 'medications' | 'conditions'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const renderArrayField = (
    field: keyof Pick<PatientFormData, 'allergies' | 'medications' | 'conditions'>,
    label: string,
    icon: React.ReactNode
  ) => (
    <div className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder={`Add ${label.toLowerCase()}`}
          className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addArrayItem(field, e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>
      {formData[field].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {formData[field].map((item, index) => (
            <span
              key={index}
              className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded-md text-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeArrayItem(field, index)}
                className="ml-1 hover:text-red-300"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col p-6">
      <div className="w-full flex flex-col items-center justify-center mt-8 mb-6">
        {/* <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-full p-3 mb-2 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 11-8 0 4 4 0 018 0zm6-2a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div> */}
        <h2 className="text-2xl font-bold text-white mb-1">Patient Database Management</h2>
        {/* <p className="text-gray-300 text-sm text-center max-w-xl">Comprehensive patient record management system. Add, edit, search, and manage patient information including medical history, contact details, and treatment records.</p> */}
      </div>

      {/* Search and Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
          />
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Patient</span>
        </Button>
      </div>

      {/* Patient Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingPatient ? "Edit Patient" : "Add New Patient"}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <User className="w-4 h-4" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Date of Birth *</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Medical Record Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.medicalRecordNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, medicalRecordNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Last Visit *</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.lastVisit}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastVisit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <Phone className="w-4 h-4" />
                  <span>Phone</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Address</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2">Primary Care Physician</label>
                <input
                  type="text"
                  value={formData.primaryCarePhysician}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryCarePhysician: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2">Insurance Provider</label>
                <input
                  type="text"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2">Insurance Number</label>
                <input
                  type="text"
                  value={formData.insuranceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              {renderArrayField('allergies', 'Allergies', <AlertTriangle className="w-4 h-4" />)}
              {renderArrayField('medications', 'Current Medications', <Pill className="w-4 h-4" />)}
              {renderArrayField('conditions', 'Medical Conditions', <Heart className="w-4 h-4" />)}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{editingPatient ? "Update" : "Create"} Patient</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Patients List */}
      <div className="flex-1 overflow-y-auto">
        {loading && !showForm ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {searchQuery ? "No patients found matching your search." : "No patients found. Add your first patient!"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{patient.name}</h3>
                      <span className="text-sm text-gray-400">MRN: {patient.medicalRecordNumber}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>DOB: {patient.dateOfBirth}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Last Visit: {patient.lastVisit}</span>
                      </div>
                      {patient.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>{patient.email}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                    </div>

                    {(patient.allergies?.length || patient.medications?.length || patient.conditions?.length) && (
                      <div className="mt-3 space-y-2">
                        {patient.allergies?.length && (
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-gray-300">
                              Allergies: {patient.allergies.join(", ")}
                            </span>
                          </div>
                        )}
                        {patient.medications?.length && (
                          <div className="flex items-center space-x-2">
                            <Pill className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-gray-300">
                              Medications: {patient.medications.join(", ")}
                            </span>
                          </div>
                        )}
                        {patient.conditions?.length && (
                          <div className="flex items-center space-x-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-300">
                              Conditions: {patient.conditions.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(patient)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(patient.id, patient.name)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientManagement; 