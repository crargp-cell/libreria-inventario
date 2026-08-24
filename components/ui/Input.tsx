import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-black mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 border-2 rounded-lg transition-all duration-200 focus:outline-none text-black ${
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
            : 'border-gray-300 focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10'
        } ${className} placeholder:text-gray-700 placeholder:font-medium`}
        {...props}
      />
      {error && (
        <p className="text-red-600 text-sm mt-2 font-medium">{error}</p>
      )}
    </div>
  );
}
