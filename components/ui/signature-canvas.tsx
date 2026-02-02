'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

interface SignatureCanvasProps {
    width?: number
    height?: number
    className?: string
}

export interface SignatureCanvasHandle {
    toDataURL: () => string | null
    clear: () => void
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
    ({ width = 500, height = 200, className }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null)
        const [isDrawing, setIsDrawing] = useState(false)

        useImperativeHandle(ref, () => ({
            toDataURL: () => {
                const canvas = canvasRef.current
                return canvas ? canvas.toDataURL('image/png') : null
            },
            clear: () => {
                const canvas = canvasRef.current
                if (!canvas) return
                const ctx = canvas.getContext('2d')
                ctx?.clearRect(0, 0, canvas.width, canvas.height)
            }
        }))

        // Touch/Mouse Event Handlers
        const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current
            if (!canvas) return

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            setIsDrawing(true)

            // Get coordinates
            const { x, y } = getCoordinates(e, canvas)
            ctx.beginPath()
            ctx.moveTo(x, y)
        }

        const draw = (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing) return
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            e.preventDefault() // Prevent scrolling on mobile

            const { x, y } = getCoordinates(e, canvas)
            ctx.lineTo(x, y)
            ctx.stroke()
        }

        const stopDrawing = () => {
            setIsDrawing(false)
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')
                ctx?.closePath()
            }
        }

        const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
            const rect = canvas.getBoundingClientRect()
            let clientX, clientY

            if ('touches' in e) {
                clientX = e.touches[0].clientX
                clientY = e.touches[0].clientY
            } else {
                clientX = (e as React.MouseEvent).clientX
                clientY = (e as React.MouseEvent).clientY
            }

            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            }
        }

        // Init styles
        useEffect(() => {
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.lineWidth = 2
                    ctx.lineCap = 'round'
                    ctx.strokeStyle = '#000000'
                }
            }
        }, [])

        return (
            <div className={cn("border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white cursor-crosshair touch-none", className)}>
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full block"
                />
            </div>
        )
    }
)

SignatureCanvas.displayName = 'SignatureCanvas'

// Helper for class names since we are in a component
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
