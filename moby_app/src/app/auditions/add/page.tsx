"use client";
import { useState } from 'react';
import { Film, Megaphone, Plus, Tv, User, Video } from "lucide-react";
import { addAudition } from '@/lib/firebase/client/auditions';
import AuditionModal from '@/components/auditions/AuditionModal';

// Remove the props interface since Next.js pages don't use custom props
export default function AddAuditionPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.projectTitle || !formData.auditionRole || !formData.auditionType || !formData.date) {
            alert('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);

        try {
            await addAudition(formData);
            closeModal();
        } catch (error) {
            console.error('Error saving audition:', error);
            alert('Error saving audition. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container">
            <div className="flex justify-end">
                <button
                    onClick={openModal}
                    className="text-white px-4 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all duration-300 flex items-center gap-2"
                    style={{ backgroundColor: '#4B3F72' }}
                    title="Add New Audition"
                >
                    <Plus className="w-5 h-5 text-white" />
                    <span>Add Audition</span>
                </button>
            </div>

            <AuditionModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                auditionTypes={auditionTypes}
                initialData={null}
                isEditing={false}
                isSubmitting={isSubmitting}
                updateFormData={setFormData}
                formData={formData}
                handleInputChange={handleInputChange}
            />
        </div>
    );
}