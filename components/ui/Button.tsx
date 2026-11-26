import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  // Transiciones con propiedades explícitas; el "press" da feedback inmediato (<160ms)
  const baseStyles =
    'font-medium rounded-lg flex items-center justify-center select-none touch-manipulation ' +
    'min-h-10 transition-[background-color,box-shadow,transform,color] duration-150 ease-[var(--ease-out)] ' +
    'active:scale-[0.97] disabled:active:scale-100 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-gradient-to-b from-[#2F6BFF] to-[#1D4ED8] text-white shadow-md shadow-blue-600/25 hover:from-[#3B78FF] hover:to-[#1E40AF] hover:shadow-lg hover:shadow-blue-600/35 disabled:bg-gray-400 disabled:shadow-none',
    secondary: 'bg-[#E4ECFF] text-[#1E40AF] hover:bg-[#CFDDFF] disabled:bg-gray-200 disabled:text-gray-500',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-gray-400 disabled:shadow-none',
    ghost: 'bg-transparent text-[#1D4ED8] hover:bg-[#E4ECFF] disabled:text-gray-400',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
