import * as React from 'react'

import { cn } from './utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      data-slot="card"
      ref={ref}
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border',
        className,
      )}
      {...props}
    />
  ),
)

Card.displayName = 'Card'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      data-slot="card-header"
      ref={ref}
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  ),
)

CardHeader.displayName = 'CardHeader'

export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h4
      data-slot="card-title"
      ref={ref}
      className={cn('leading-none', className)}
      {...props}
    />
  ),
)

CardTitle.displayName = 'CardTitle'

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardDescription = React.forwardRef<
  HTMLDivElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    data-slot="card-description"
    ref={ref}
    className={cn('text-muted-foreground', className)}
    {...props}
  />
))

CardDescription.displayName = 'CardDescription'

export interface CardActionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardAction = React.forwardRef<HTMLDivElement, CardActionProps>(
  ({ className, ...props }, ref) => (
    <div
      data-slot="card-action"
      ref={ref}
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  ),
)

CardAction.displayName = 'CardAction'

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      data-slot="card-content"
      ref={ref}
      className={cn('px-6 [&:last-child]:pb-6', className)}
      {...props}
    />
  ),
)

CardContent.displayName = 'CardContent'

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      data-slot="card-footer"
      ref={ref}
      className={cn('flex items-center px-6 pb-6 [.border-t]:pt-6', className)}
      {...props}
    />
  ),
)

CardFooter.displayName = 'CardFooter'
