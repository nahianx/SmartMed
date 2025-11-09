import React from 'react'

export interface CardProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
      )}
      {children}
    </div>
  )
}
