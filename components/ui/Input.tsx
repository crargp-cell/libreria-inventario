import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-900 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-4 py-2.5 min-h-11 border-2 rounded-lg bg-white text-gray-900 transition-[border-color,box-shadow] duration-150 ease-[var(--ease-out)] focus:outline-none placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-500 ${
          error
            ? 'border-red-500 focus:ring-4 focus:ring-red-100'
            : 'border-gray-300 hover:border-gray-400 focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/15'
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-red-600 text-sm mt-1.5 font-medium anim-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
