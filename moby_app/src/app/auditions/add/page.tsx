"use client"
import { useState, useRef } from 'react';

export default function AuditionManager() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        date: '',
        projectTitle: '',
        castingDirector: '',
        auditionType: '',
        auditionRole: '',
        auditonRoleLevel: '',
        source: '',
        currentStatus: '',
        files: '',
        location: '',
        description: ''
    });

    const auditionTypes = [
        { value: 'film', label: 'Film', icon: '🎬' },
        { value: 'tv', label: 'Television', icon: '📺' },
        { value: 'theater', label: 'Theater', icon: '🎭' },
        { value: 'commercial', label: 'Commercial', icon: '📹' },
        { value: 'voiceover', label: 'Voice Over', icon: '🎙️' },
        { value: 'modeling', label: 'Modeling', icon: '📸' }
    ];

    const openModal = () => {
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setIsModalOpen(false);
        document.body.style.overflow = 'auto';
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            date: '',
            projectTitle: '',
            castingDirector: '',
            auditionType: '',
            auditionRole: '',
            auditonRoleLevel: '',
            source: '',
            currentStatus: '',
            files: '',
            location: '',
            description: ''
        });
        setSelectedFiles([]);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (filename) => {
        const extension = filename.split('.').pop().toLowerCase();

        switch (extension) {
            case 'pdf':
            case 'doc':
            case 'docx':
                return '📄';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return '🖼️';
            case 'mp4':
            case 'mov':
            case 'avi':
                return '🎥';
            case 'mp3':
            case 'wav':
            case 'aac':
                return '🎵';
            default:
                return '📁';
        }
    };

    const handleSubmit = () => {
        // Validate required fields
        if (!formData.projectTitle || !formData.auditionRole || !formData.auditionType || !formData.date) {
            alert('Please fill in all required fields.');
            return;
        }

        // Create FormData object
        const submitData = new FormData();

        // Add form fields
        Object.keys(formData).forEach(key => {
            submitData.append(key, formData[key]);
        });

        // Add files
        selectedFiles.forEach((file, index) => {
            submitData.append(`files[${index}]`, file);
        });

        // Here you would typically send to your API
        console.log('Form Data:', formData);
        console.log('Selected Files:', selectedFiles);
        console.log('FormData for API:', submitData);

        // Simulate success
        alert('Audition saved successfully!');
        closeModal();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-5">
            <div className="text-center max-w-lg w-full">
                {/* Header */}
                <div className="text-white mb-10">
                    <h1 className="text-5xl font-bold mb-3 text-shadow-lg animate-fade-in-up">
                        Audition Manager
                    </h1>
                    <p className="text-xl opacity-90 animate-fade-in-up animation-delay-200">
                        Manage your casting calls and auditions
                    </p>
                </div>

                {/* Add Button */}
                <button
                    onClick={openModal}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-10 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-3 animate-fade-in-up animation-delay-400"
                >
                    <span className="text-xl">➕</span>
                    Add New Audition
                </button>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-5"
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    {/* Modal */}
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-800">Add New Audition</h2>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors duration-200 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Date
                                </label>
                                <input
                                    type="text"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Date"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Role Name */}
                            <div>
                                <label htmlFor="projectTitle" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Project Title
                                </label>
                                <input
                                    type="text"
                                    id="projectTitle"
                                    name="projectTitle"
                                    value={formData.projectTitle}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter project title"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Casting Director */}
                            <div>
                                <label htmlFor="castingDirector" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Casting Director
                                </label>
                                <input
                                    type="text"
                                    id="castingDirector"
                                    name="castingDirector"
                                    value={formData.castingDirector}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Who is the casting director?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Audition Type */}
                            <div>
                                <label htmlFor="auditionType" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Audition Type 
                                </label>
                                <select
                                    id="auditionType"
                                    name="auditionType"
                                    value={formData.auditionType}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                >
                                    <option value="">Select audition type</option>
                                    {auditionTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Audition Role */}
                            <div>
                                <label htmlFor="auditionRole" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Audition Role
                                </label>
                                <input
                                    type="text"
                                    id="auditionRole"
                                    name="auditionRole"
                                    value={formData.auditionRole}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="What is your role in this audition?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Role Level */}
                            <div>
                                <label htmlFor="auditionRoleLevel" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Audition Role Level
                                </label>
                                <input
                                    type="text"
                                    id="auditionRoleLevel"
                                    name="auditionRoleLevel"
                                    value={formData.auditonRoleLevel}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="What is the level of your role (e.g. Main, supporting, etc)?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Source */}
                            <div>
                                <label htmlFor="source" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Source
                                </label>
                                <input
                                    type="text"
                                    id="source"
                                    name="source"
                                    value={formData.source}
                                    onChange={handleInputChange}
                                    required
                                    placeholder=""
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Current Status */}
                            <div>
                                <label htmlFor="currentStatus" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Current Status
                                </label>
                                <input
                                    type="text"
                                    id="currentStatus"
                                    name="currentStatus"
                                    value={formData.currentStatus}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="What is the status of your audition?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="location"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="description"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Casting Director */}
                            <div>
                                <label htmlFor="castingDirector" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Casting Director
                                </label>
                                <input
                                    type="text"
                                    id="castingDirector"
                                    name="castingDirector"
                                    value={formData.castingDirector}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Who is the casting director?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Upload Files
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragOver
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-indigo-500 hover:bg-indigo-50'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov,.wav,.mp3"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-3">
                                        <div className={`text-4xl ${dragOver ? 'text-indigo-500' : 'text-gray-400'}`}>☁️⬆️</div>
                                        <div className="text-gray-600">
                                            <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop<br />
                                            <span className="text-sm">Scripts, photos, videos, or audio files</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Files */}
                                {selectedFiles.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {selectedFiles.map((file, index) => {
                                            const IconComponent = getFileIcon(file.name);
                                            return (
                                                <div key={index} className="bg-white p-3 rounded-lg shadow-sm border flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <IconComponent className="w-5 h-5 text-indigo-500" />
                                                        <span className="text-sm font-medium text-gray-700">{file.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(index)}
                                                        className="p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors duration-200"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <span className="text-lg">💾</span>
                                    Save Audition
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        .text-shadow-lg {
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
      `}</style>
        </div>
    );
}