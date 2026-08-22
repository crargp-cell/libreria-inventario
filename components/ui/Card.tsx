import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
}

export function Card({ title, footer, className = '', children, ...props }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`} {...props}>
      {title && <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">{title}</h2></div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div>}
    </div>
  );
}
