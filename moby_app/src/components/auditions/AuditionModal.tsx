import React, { useEffect, useState, JSX } from "react";
import { X } from "lucide-react";

interface AuditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  auditionTypes?: {
    [key: string]: { label: string; icon: JSX.Element };
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
  updateFormData: React.Dispatch<
    React.SetStateAction<{
      date: string;
      projectTitle: string;
      castingDirector: string;
      auditionType: string;
      auditionRole: string;
      billing: string;
      source: string;
      status: string;
    }>
  >;
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
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
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
  handleInputChange,
}) => {
  const [currentStage, setCurrentStage] = useState(0);

  // Update form data when initialData changes or modal opens
  useEffect(() => {
    if (initialData && isEditing) {
      updateFormData({
        date: initialData.date || "",
        projectTitle: initialData.projectTitle || "",
        auditionType: initialData.auditionType || "",
        castingDirector: initialData.castingDirector || "",
        auditionRole: initialData.auditionRole || "",
        source: initialData.source || "",
        billing: initialData.billing || "",
        status: initialData.status || "",
      });
    } else if (!isEditing) {
      // Reset form for new audition
      updateFormData({
        date: "",
        projectTitle: "",
        auditionType: "",
        castingDirector: "",
        auditionRole: "",
        source: "",
        billing: "",
        status: "",
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    // Reset form when closing
    updateFormData({
      date: "",
      projectTitle: "",
      auditionType: "",
      castingDirector: "",
      auditionRole: "",
      source: "",
      billing: "",
      status: "",
    });
    onClose();
  };

  // Button disabled states
  const requiredComplete =
    formData.projectTitle.trim() &&
    formData.date &&
    formData.auditionType &&
    formData.auditionRole.trim();

  const hasAnyOptionalField =
    formData.castingDirector.trim() ||
    formData.source.trim() ||
    formData.billing ||
    formData.status;

  const hasChanges = isEditing
    ? Object.keys(formData).some((key) => {
        const currentValue =
          formData[key as keyof typeof formData]?.trim?.() ??
          formData[key as keyof typeof formData];
        const initialValue =
          initialData?.[key as keyof typeof formData]?.trim?.() ??
          initialData?.[key as keyof typeof formData];
        return currentValue !== (initialValue || "");
      })
    : false;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-opacity-90 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Modal */}
      <div
        className={`bg-white rounded-2xl p-2 w-full ${
          isEditing ? "max-w-4xl" : "max-w-xl"
        } max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100`}
      >
        <div
          className="p-8 relative rounded-2xl w-full h-full overflow-y-auto transform transition-all duration-300 border border-gray-300"
          style={{
            background:
              "radial-gradient(circle at center, #DDE7EB 0%, #FFFFFF 100%)",
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-6 border-b border-gray-300">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {isEditing
                  ? "Update Audition"
                  : currentStage === 0
                  ? "New Audition"
                  : "More Details"}
              </h2>
              <p className="text-gray-600 mt-1">
                {isEditing
                  ? "Update the details for this audition"
                  : currentStage === 0
                  ? "Tell us a little about the project"
                  : "Add optional details for this project"}
              </p>
            </div>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-3 rounded-full transition-colors duration-200 text-gray-400 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isEditing) onSubmit();
              else if (currentStage === 0) setCurrentStage(1);
              else onSubmit();
            }}
          >
            <div className="bg-[#a8a8a8]/10 py-10 px-8 rounded-xl space-y-6">
              {isEditing ? (
                <>
                  {/* Two-column grid for edit mode */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column - Required Fields */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="projectTitle"
                          name="projectTitle"
                          value={formData.projectTitle}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="auditionType"
                          name="auditionType"
                          value={formData.auditionType}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
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
                        <label className="block text-sm font-medium text-gray-900">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="auditionRole"
                          name="auditionRole"
                          value={formData.auditionRole}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* Right Column - Optional Fields */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Casting Director
                        </label>
                        <input
                          type="text"
                          id="castingDirector"
                          name="castingDirector"
                          value={formData.castingDirector}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Source
                        </label>
                        <input
                          type="text"
                          id="source"
                          name="source"
                          value={formData.source}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Billing
                        </label>
                        <select
                          id="billing"
                          name="billing"
                          value={formData.billing}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">Select billing</option>
                          <option value="star">Star</option>
                          <option value="co-star">Co-Star</option>
                          <option value="extra">Extra</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-900">
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
                </>
              ) : currentStage === 0 ? (
                <>
                  {/* Required Fields */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="projectTitle"
                      name="projectTitle"
                      value={formData.projectTitle}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="auditionType"
                      name="auditionType"
                      value={formData.auditionType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select audition type</option>
                      {Object.entries(auditionTypes).map(([key, type]) => (
                        <option key={key} value={key}>
                          {type.label || key}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="auditionRole"
                      name="auditionRole"
                      value={formData.auditionRole}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Optional Fields */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Casting Director
                    </label>
                    <input
                      type="text"
                      id="castingDirector"
                      name="castingDirector"
                      value={formData.castingDirector}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Source
                    </label>
                    <input
                      type="text"
                      id="source"
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Billing
                    </label>
                    <select
                      id="billing"
                      name="billing"
                      value={formData.billing}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select billing</option>
                      <option value="star">Star</option>
                      <option value="co-star">Co-Star</option>
                      <option value="extra">Extra</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Select status</option>
                      <option value="booked">Booked</option>
                      <option value="declined">Declined</option>
                      <option value="callback">Callback</option>
                      <option value="hold">Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-8 border-t border-gray-100">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!hasChanges}
                    className="flex-1 bg-primary-dark-alt text-white px-6 py-3 rounded-lg font-medium hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Update Audition
                  </button>
                </>
              ) : currentStage === 0 ? (
                <button
                  type="submit"
                  disabled={!requiredComplete}
                  className="flex-1 bg-primary-dark-alt text-white px-6 py-3 rounded-lg font-medium hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 w-[30%] px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:cursor-pointer"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={!hasAnyOptionalField}
                    className="flex-1 w-[70%] bg-primary-dark-alt text-white px-6 py-3 rounded-lg font-medium hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save Audition
                  </button>
                </>
              )}
            </div>

            {/* Progress Bar (only show when adding new audition) */}
            {!isEditing && (
              <div className="flex justify-between items-center gap-2 mt-8 px-1">
                <div
                  className={`h-1 flex-1 transition-all duration-300 ${
                    currentStage === 0 ? "bg-primary-dark-alt" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`h-1 flex-1 transition-all duration-300 ${
                    currentStage === 1 ? "bg-primary-dark-alt" : "bg-gray-300"
                  }`}
                />
              </div>
            )}
          </form>
        </div>
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
