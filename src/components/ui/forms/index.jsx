import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export function Button({ children, variant = 'primary', size = 'md', outline = false, icon, isLoading, className = '', ...props }) {
  const baseClasses = "inline-flex items-center justify-center font-bold tracking-wider rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary",
    error: "bg-error text-white hover:bg-error/90 focus:ring-error shadow-sm",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90 focus:ring-warning shadow-sm",
    info: "bg-info text-info-foreground hover:bg-info/90 focus:ring-info",
    success: "bg-success text-white hover:bg-success/90 focus:ring-success shadow-sm",
    neutral: "bg-foreground/10 text-foreground hover:bg-foreground/20 focus:ring-foreground/50",
    ghost: "bg-transparent text-foreground/70 hover:bg-foreground/10 hover:text-foreground focus:ring-foreground/50",
  };

  const outlineVariants = {
    primary: "border border-primary text-primary hover:bg-primary/10",
    error: "border border-error text-error hover:bg-error/10",
    neutral: "border border-border text-foreground hover:bg-muted",
  };

  const sizes = { 
    xs: "h-6 px-2.5 text-[9px] uppercase", 
    sm: "h-8 px-3 text-[10px] uppercase", 
    md: "h-10 px-4 text-[11px] uppercase", 
    lg: "h-12 px-6 text-xs uppercase" 
  };
  
  const currentVariant = outline ? (outlineVariants[variant] || outlineVariants.primary) : (variants[variant] || variants.primary);

  return (
    <button className={cn(baseClasses, currentVariant, sizes[size], "w-auto", className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="animate-spin mr-2" size={14} /> : (icon && <span className="mr-2">{icon}</span>)}
      {children}
    </button>
  );
}

export function FormField({ label, error, children, className }) {
  return (
    <div className={cn("flex flex-col w-full gap-1.5", className)}>
      {label && (
        <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">
          {label}
        </label>
      )}
      {children}
      {error && (
        <span className="text-error font-bold text-[10px] ml-1 mt-0.5">{error}</span>
      )}
    </div>
  );
}

export const Input = React.forwardRef(({ label, error, type = 'text', className = '', ...props }, ref) => {
  return (
    <FormField label={label} error={error} className={props.wrapperClassName}>
      <input 
        ref={ref}
        type={type} 
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error focus-visible:ring-error",
          className
        )} 
        {...props} 
      />
    </FormField>
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <FormField label={label} error={error} className={props.wrapperClassName}>
      <textarea 
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          error && "border-error focus-visible:ring-error",
          className
        )} 
        {...props} 
      />
    </FormField>
  );
});
Textarea.displayName = "Textarea";

export const Select = React.forwardRef(({ label, error, className = '', children, ...props }, ref) => {
  return (
    <FormField label={label} error={error} className={props.wrapperClassName}>
      <select 
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-bold shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring uppercase tracking-wider disabled:opacity-50",
          error && "border-error focus-visible:ring-error",
          className
        )} 
        {...props} 
      >
        {children}
      </select>
    </FormField>
  );
});
Select.displayName = "Select";
