import React, { useState, useEffect } from 'react';
import { Mail, Plus, Edit2, Trash2, Copy, FileText, Search, Filter } from 'lucide-react';
import {
  EmailTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  validateTemplate,
  extractVariables
} from '../services/emailTemplates';

const EmailTemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EmailTemplate['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState<EmailTemplate['category']>('custom');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    const allTemplates = await getAllTemplates();
    setTemplates(allTemplates);
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.body.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateNew = () => {
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setFormCategory('custom');
    setFormErrors([]);
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleEdit = (template: EmailTemplate) => {
    if (template.isBuiltIn) {
      alert('Built-in templates cannot be edited. You can copy it to create a custom version.');
      return;
    }

    setFormName(template.name);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormCategory(template.category);
    setFormErrors([]);
    setSelectedTemplate(template);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCopy = (template: EmailTemplate) => {
    setFormName(`${template.name} (Copy)`);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormCategory(template.category);
    setFormErrors([]);
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleSave = async () => {
    try {
      const variables = extractVariables(`${formSubject} ${formBody}`);
      const templateData = {
        name: formName,
        subject: formSubject,
        body: formBody,
        category: formCategory,
        variables
      };

      // Validate
      const tempTemplate: EmailTemplate = {
        ...templateData,
        id: 'temp',
        createdAt: new Date().toISOString(),
        isBuiltIn: false
      };
      const validation = validateTemplate(tempTemplate);
      
      if (!validation.valid) {
        setFormErrors(validation.errors);
        return;
      }

      if (isEditing && selectedTemplate) {
        await updateTemplate(selectedTemplate.id, templateData);
      } else {
        await createTemplate(templateData);
      }

      await loadTemplates();
      handleCancel();
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (template.isBuiltIn) {
      alert('Built-in templates cannot be deleted.');
      return;
    }

    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      await deleteTemplate(template.id);
      await loadTemplates();
      if (selectedTemplate?.id === template.id) {
        handleCancel();
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedTemplate(null);
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setFormCategory('custom');
    setFormErrors([]);
  };

  const categoryLabels: Record<EmailTemplate['category'], string> = {
    cold_outreach: 'Cold Outreach',
    follow_up: 'Follow-up',
    introduction: 'Introduction',
    proposal: 'Proposal',
    meeting: 'Meeting',
    custom: 'Custom'
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Templates List */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No templates found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedTemplate?.id === template.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {categoryLabels[template.category]}
                        </span>
                        {template.isBuiltIn && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Built-in
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(template);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                      {!template.isBuiltIn && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(template);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Template Preview or Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {(isCreating || isEditing) ? (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold mb-4">
                {isEditing ? 'Edit Template' : 'Create New Template'}
              </h2>

              {formErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-800 mb-1">Validation Errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., My Custom Outreach"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Use {{variable}} for dynamic content"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Body
                  </label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="Use {{variable}} for dynamic content&#10;&#10;Example:&#10;Hi {{leadName}},&#10;&#10;I noticed {{companyName}} is..."
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Variables found: {extractVariables(`${formSubject} ${formBody}`).join(', ') || 'none'}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {isEditing ? 'Update Template' : 'Create Template'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {categoryLabels[selectedTemplate.category]}
                    </span>
                    {selectedTemplate.isBuiltIn && (
                      <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Built-in Template
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(selectedTemplate)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  {!selectedTemplate.isBuiltIn && (
                    <button
                      onClick={() => handleEdit(selectedTemplate)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <code className="text-sm">{selectedTemplate.subject}</code>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap font-mono text-sm">
                    {selectedTemplate.body}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Variables</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map(v => (
                      <span key={v} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">Select a template to view details</p>
                <p className="text-sm mt-1">or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatesView;
