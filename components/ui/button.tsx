import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'

// Utils
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon'
    isLoading?: boolean
    asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, asChild = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const compProps = {
        ref,
        disabled: disabled || isLoading,
        className: cn(
            'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            {
                'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
                'bg-gray-100 text-gray-900 hover:bg-gray-200': variant === 'secondary',
                'border border-gray-300 bg-transparent hover:bg-gray-100': variant === 'outline',
                'hover:bg-gray-100 dark:hover:bg-gray-800': variant === 'ghost',
                'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
                'h-7 px-2 text-[10px]': size === 'xs',
                'h-8 px-3 text-sm': size === 'sm',
                'h-10 px-4 py-2': size === 'md',
                'h-12 px-6 text-lg': size === 'lg',
                'h-9 w-9 p-0': size === 'icon',
            },
            className
        ),
        ...props
    }

    if (asChild) {
        return (
            <Slot {...compProps}>
                {children}
            </Slot>
        )
    }

    return (
        <button {...compProps}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    )
}
)
Button.displayName = 'Button'

export { Button }
