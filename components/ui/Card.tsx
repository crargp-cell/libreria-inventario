import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
}

export function Card({ title, footer, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-blue-100 shadow-[0_2px_4px_rgba(11,27,77,0.04),0_8px_24px_-8px_rgba(29,78,216,0.12)] ${className}`}
      {...props}
    >
      {title && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      <div className="px-4 sm:px-6 py-4">{children}</div>
      {footer && <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">{footer}</div>}
    </div>
  );
}
