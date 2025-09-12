"use client";
import { useState } from 'react';
import { Film, Megaphone, Plus, Tv, User, Video, SaveIcon } from "lucide-react";
import { addAudition } from '@/lib/firebase/client/auditions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AddAuditionButton( triggerRefresh: any ) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        date: '',
        projectTitle: '',
        castingDirector: '',
        auditionType: '',
        auditionRole: '',
        billing: '',
        source: '',
        status: '',
    });

    const auditionTypes = {
        tv: { label: 'TV', icon: <Tv className="w-4 h-4" /> },
        film: { label: 'Film', icon: <Film className="w-4 h-4" /> },
        commercial: { label: 'Commercial', icon: <Megaphone className="w-4 h-4" /> },
        theater: { label: 'Theater', icon: <User className="w-4 h-4" /> },
        voiceover: { label: 'Voiceover', icon: <Video className="w-4 h-4" /> },
        other: { label: 'Other', icon: <Video className="w-4 h-4" /> }
    };

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
            billing: '',
            source: '',
            status: '',
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        // // Validate required fields
        // if (!formData.projectTitle || !formData.auditionRole || !formData.auditionType || !formData.date) {
        //     alert('Please fill in all required fields.');
        //     return;
        // }

        // // Create FormData object
        // const submitData = new FormData();

        // // Add form fields
        // Object.keys(formData).forEach(key => {
        //     submitData.append(key, formData[key]);
        // });

        // // // Add files
        // // selectedFiles.forEach((file, index) => {
        // //     submitData.append(`files[${index}]`, file);
        // // });

        // // Here you would typically send to your API
        // console.log('Form Data:', formData);
        // console.log('Selected Files:', selectedFiles);
        // console.log('FormData for API:', submitData);

        // // Simulate success
        // alert('Audition saved successfully!');
        // closeModal();
        if (!formData.projectTitle || !formData.auditionRole || !formData.auditionType || !formData.date) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const auditionId = await addAudition(formData);
            console.log('Audition saved with ID:', auditionId);
            // alert('Audition saved successfully!');
            closeModal();
        } catch (error) {
            console.error('Error saving audition:', error);
            // alert('Error saving audition. Please try again.');
        } finally {
            triggerRefresh();
        }
    };

    return (
        <>
            {/* Regular Button - No longer floating */}
            <button
                onClick={openModal}
                className="text-white px-4 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-300 flex items-center gap-2"
                style={{ backgroundColor: '#4B3F72' }}
                title="Add New Audition"
            >
                {/* <span className="text-xl" style={{ color: '#fff' }}>➕</span> */}
                <Plus className="w-5 h-5 text-white" />
                <span>Add Audition</span>
            </button>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-5"
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
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Project Title */}
                            <div>
                                <label htmlFor="projectTitle" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Project Title *
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

                            {/* Audition Type */}
                            <div>
                                <label htmlFor="auditionType" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Audition Type *
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
                                    {Object.entries(auditionTypes).map(([key, type]) => (
                                        <option key={key} value={key}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </select>
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
                                    placeholder="Who is the casting director?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            
                            {/* Audition Role */}
                            <div>
                                <label htmlFor="auditionRole" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Audition Role *
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
                                    placeholder="Where did you find this audition?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Role Level */}
                            <div>
                                <label htmlFor="billing" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Billing
                                </label>
                                <input
                                    type="text"
                                    id="billing"
                                    name="billing"
                                    value={formData.billing}
                                    onChange={handleInputChange}
                                    placeholder="What is the level of your role (e.g. Main, supporting, etc)?"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            {/* Current Status */}
                            <div>
                                <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white"
                                >
                                    <option value="">Select status</option>
                                    <option value="applied">Booked</option>
                                    <option value="auditioned">Declined</option>
                                    <option value="callback">Callback</option>
                                    <option value="booked">Hold</option>
                                    <option value="rejected">Completed</option>
                                </select>
                            </div>
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
                                    className="flex-1 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: "#4B3F72" }}
                                >
                                    <SaveIcon className="w-5 h-5" />
                                    Save Audition
                                </button>
                            </div>
                        </div>
                    </div>
                // </div>
            )}
        </>
    );
}