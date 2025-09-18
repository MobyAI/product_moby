import React, { useEffect, JSX } from 'react';

interface AuditionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    auditionTypes?: {
        [key: string]: { label: string, icon: JSX.Element }
    };
    initialData?: {
        date?: string;
        projectTitle?: string;
        castingDirector?: string;
        auditionType?: string;
        auditionRole?: string;
        billing?: string;
        source?: string;
        status?: string;
    } | null;
    isEditing?: boolean;
    isSubmitting?: boolean;
    updateFormData: React.Dispatch<React.SetStateAction<{
        date: string;
        projectTitle: string;
        castingDirector: string;
        auditionType: string;
        auditionRole: string;
        billing: string;
        source: string;
        status: string;
    }>>;
    formData: {
        date: string;
        projectTitle: string;
        castingDirector: string;
        auditionType: string;
        auditionRole: string;
        billing: string;
        source: string;
        status: string;
    };
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const AuditionModal: React.FC<AuditionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    auditionTypes = {},
    initialData = null,
    isEditing = false,
    isSubmitting = false,
    updateFormData,
    formData,
    handleInputChange
}) => {

    // Update form data when initialData changes or modal opens
    useEffect(() => {
        if (initialData && isEditing) {
            updateFormData({
                date: initialData.date || '',
                projectTitle: initialData.projectTitle || '',
                auditionType: initialData.auditionType || '',
                castingDirector: initialData.castingDirector || '',
                auditionRole: initialData.auditionRole || '',
                source: initialData.source || '',
                billing: initialData.billing || '',
                status: initialData.status || ''
            });
        } else if (!isEditing) {
            // Reset form for new audition
            updateFormData({
                date: '',
                projectTitle: '',
                auditionType: '',
                castingDirector: '',
                auditionRole: '',
                source: '',
                billing: '',
                status: ''
            });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClose = () => {
        // Reset form when closing
        updateFormData({
            date: '',
            projectTitle: '',
            auditionType: '',
            castingDirector: '',
            auditionRole: '',
            source: '',
            billing: '',
            status: ''
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            {/* Modal */}
            <div className="bg-white rounded-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            {isEditing ? 'Edit Audition' : 'Add New Audition'}
                        </h2>
                        <p className="text-gray-600 mt-1">
                            {isEditing
                                ? 'Update the details for this audition'
                                : 'Fill in the details for your upcoming audition'
                            }
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-3 rounded-full hover:bg-gray-100 transition-colors duration-200 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}>
                    <div className="space-y-8">
                        {/* Row 1: Date and Project Title */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="date" className="block text-sm font-medium text-gray-900">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="projectTitle" className="block text-sm font-medium text-gray-900">
                                    Project Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="projectTitle"
                                    name="projectTitle"
                                    value={formData.projectTitle}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="Enter project title"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Row 2: Audition Type and Role */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="auditionType" className="block text-sm font-medium text-gray-900">
                                    Audition Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="auditionType"
                                    name="auditionType"
                                    value={formData.auditionType}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select audition type</option>
                                    {Object.entries(auditionTypes).map(([key, type]) => (
                                        <option key={key} value={key}>
                                            {type.label || key}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="auditionRole" className="block text-sm font-medium text-gray-900">
                                    Audition Role <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="auditionRole"
                                    name="auditionRole"
                                    value={formData.auditionRole}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="What is your role in this audition?"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Row 3: Casting Director and Source */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="castingDirector" className="block text-sm font-medium text-gray-900">
                                    Casting Director
                                </label>
                                <input
                                    type="text"
                                    id="castingDirector"
                                    name="castingDirector"
                                    value={formData.castingDirector}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    placeholder="Who is the casting director?"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="source" className="block text-sm font-medium text-gray-900">
                                    Source
                                </label>
                                <input
                                    type="text"
                                    id="source"
                                    name="source"
                                    value={formData.source}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    placeholder="Where did you find this audition?"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Row 4: Billing and Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="billing" className="block text-sm font-medium text-gray-900">
                                    Billing
                                </label>
                                <select
                                    id="billing"
                                    name="billing"
                                    value={formData.billing}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select billing</option>
                                    <option value="star">Star</option>
                                    <option value="co-star">Co-Star</option>
                                    <option value="extra">Extra</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="status" className="block text-sm font-medium text-gray-900">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select status</option>
                                    <option value="booked">Booked</option>
                                    <option value="declined">Declined</option>
                                    <option value="callback">Callback</option>
                                    <option value="hold">Hold</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-4 pt-8 mt-8 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Audition' : 'Save Audition')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuditionModal;

// Usage example in parent component:
/*
import AuditionModal from './AuditionModal';

const ParentComponent = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAudition, setEditingAudition] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const auditionTypes = {
        film: { label: 'Film' },
        tv: { label: 'TV Show' },
        commercial: { label: 'Commercial' },
        theater: { label: 'Theater' }
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingAudition(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (audition) => {
        setIsEditing(true);
        setEditingAudition(audition);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingAudition(null);
    };

    const handleSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await updateAudition(editingAudition.id, formData);
            } else {
                await createAudition(formData);
            }
            handleCloseModal();
            // Refresh your auditions list here
        } catch (error) {
            console.error('Error saving audition:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <button onClick={handleOpenAddModal}>Add New Audition</button>
            
            <AuditionModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                auditionTypes={auditionTypes}
                initialData={editingAudition}
                isEditing={isEditing}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};
*/