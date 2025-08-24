import React, { useState } from 'react';
import { Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateAssistantButtonProps {
  onAssistantCreated?: (assistantId: string) => void;
  businessName?: string;
  timezone?: string;
}

interface CreateAssistantResponse {
  success: boolean;
  assistant: {
    id: string;
    name: string;
    timezone: string;
  };
  assistantId: string;
  message: string;
}

interface ApiError {
  error: string;
}

export default function CreateAssistantButton({ 
  onAssistantCreated, 
  businessName = '',
  timezone = 'America/New_York'
}: CreateAssistantButtonProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);

  // Form state for business name and timezone
  const [formData, setFormData] = useState({
    businessName: businessName,
    timezone: timezone
  });

  const handleCreateAssistant = async () => {
    if (!user) {
      setError('You must be logged in to create an assistant');
      return;
    }

    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication session not found');
      }

      // Call the Supabase Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            businessName: formData.businessName.trim(),
            timezone: formData.timezone,
          }),
        }
      );

      const data: CreateAssistantResponse | ApiError = await response.json();

      if (!response.ok) {
        const errorData = data as ApiError;
        throw new Error(errorData.error || `HTTP ${response.status}: Request failed`);
      }

      const successData = data as CreateAssistantResponse;
      
      // Handle success
      setSuccess(successData.message || 'Assistant created successfully!');
      setAssistantId(successData.assistantId);
      
      // Call the callback if provided
      if (onAssistantCreated) {
        onAssistantCreated(successData.assistantId);
      }

      // Clear form
      setFormData({ businessName: '', timezone: 'America/New_York' });

    } catch (err) {
      console.error('Error creating assistant:', err);
      
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('Rate limit')) {
          setError('Rate limit exceeded. Please try again in a few minutes.');
        } else if (err.message.includes('already exists')) {
          setError('You already have an assistant created.');
        } else if (err.message.includes('Authentication')) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bot className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Create AI Assistant</h3>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-700 font-medium">{success}</p>
            {assistantId && (
              <p className="text-green-600 text-sm mt-1">
                Assistant ID: <code className="bg-green-100 px-2 py-1 rounded text-xs">{assistantId}</code>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            id="businessName"
            type="text"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
            placeholder="Enter your business name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="America/Phoenix">Arizona Time</option>
            <option value="America/Anchorage">Alaska Time</option>
            <option value="Pacific/Honolulu">Hawaii Time</option>
          </select>
        </div>

        <button
          onClick={handleCreateAssistant}
          disabled={isLoading || !formData.businessName.trim() || !user}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating Assistant...</span>
            </>
          ) : (
            <>
              <Bot className="w-5 h-5" />
              <span>Create My Assistant</span>
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>🔒 Secure:</strong> Your assistant is created using encrypted API calls. 
          All sensitive operations are handled securely on our backend servers.
        </p>
      </div>
    </div>
  );
}