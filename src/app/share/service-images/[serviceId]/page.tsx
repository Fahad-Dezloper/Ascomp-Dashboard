"use client"

import { use, useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import JSZip from "jszip"

interface ImagesPageProps {
    params: Promise<{ serviceId: string }>
}

export default function PublicServiceImagesPage({ params }: ImagesPageProps) {
    const { serviceId } = use(params)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloadingSection, setDownloadingSection] = useState<string | null>(null)
    const [serviceData, setServiceData] = useState<{
        images: string[]
        afterImages: string[]
        brokenImages: string[]
        serviceNumber?: number
        date?: string
        cinemaName?: string
    } | null>(null)

    useEffect(() => {
        const fetchService = async () => {
            try {
                setLoading(true)
                setError(null)
                // Use the new public API endpoint
                const response = await fetch(`/api/public/service-images/${serviceId}`)

                if (!response.ok) {
                    throw new Error("Failed to fetch service images")
                }

                const { service } = await response.json()
                setServiceData({
                    images: service.images || [],
                    afterImages: service.afterImages || [],
                    brokenImages: service.brokenImages || [],
                    serviceNumber: service.serviceNumber,
                    date: service.date,
                    cinemaName: service.cinemaName,
                })
            } catch (err) {
                console.error("Error fetching service:", err)
                setError("Failed to load service images")
            } finally {
                setLoading(false)
            }
        }

        fetchService()
    }, [serviceId])

    const isVideoUrl = (url: string) =>
        /\.(mp4|mov|m4v|avi|mkv|webm)$/i.test(url.split('?')[0] || "")

    const downloadImagesAsZip = async (images: string[], sectionName: string) => {
        try {
            setDownloadingSection(sectionName)
            const zip = new JSZip()

            // Fetch all images and add them to the zip
            const imagePromises = images.map(async (imageUrl, index) => {
                try {
                    const response = await fetch(imageUrl)
                    if (!response.ok) throw new Error(`Failed to fetch image ${index + 1}`)

                    const blob = await response.blob()
                    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg'
                    const fileName = `${sectionName}_${index + 1}.${extension}`

                    zip.file(fileName, blob)
                } catch (err) {
                    console.error(`Error fetching image ${index + 1}:`, err)
                }
            })

            await Promise.all(imagePromises)

            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' })

            // Create download link
            const url = URL.createObjectURL(zipBlob)
            const link = document.createElement('a')
            link.href = url

            const serviceName = serviceData?.cinemaName?.replace(/\s+/g, '_') || 'Service'
            const serviceNum = serviceData?.serviceNumber || serviceId
            link.download = `${serviceName}_${serviceNum}_${sectionName}.zip`

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error creating ZIP:', err)
            setError('Failed to download images')
        } finally {
            setDownloadingSection(null)
        }
    }

    const Section = ({ title, images, emptyMessage, sectionKey }: { title: string; images: string[]; emptyMessage?: string; sectionKey: string }) => {
        if (images.length === 0) {
            if (emptyMessage) {
                return (
                    <div className="border border-black mb-6 break-inside-avoid shadow-sm rounded-sm bg-white">
                        <div className="bg-gray-100 border-b border-black px-4 py-3 font-bold text-base text-black uppercase tracking-wide">
                            {title}
                        </div>
                        <div className="p-6 text-center text-gray-500">
                            <p>{emptyMessage}</p>
                        </div>
                    </div>
                )
            }
            return null
        }

        const isDownloading = downloadingSection === sectionKey

        return (
            <div className="border border-black mb-6 break-inside-avoid shadow-sm rounded-sm bg-white">
                <div className="bg-gray-100 border-b border-black px-4 py-3 font-bold text-base text-black uppercase tracking-wide flex items-center justify-between">
                    <span>{title} ({images.length})</span>
                    <Button
                        onClick={() => downloadImagesAsZip(images, sectionKey)}
                        disabled={isDownloading}
                        size="sm"
                        className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Download ZIP
                            </>
                        )}
                    </Button>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {images.map((mediaUrl, index) => {
                            const isVideo = isVideoUrl(mediaUrl)
                            return (
                                <div
                                    key={index}
                                    className="relative aspect-video border border-gray-300 rounded overflow-hidden bg-gray-100 flex items-center justify-center"
                                >
                                    {isVideo ? (
                                        <video
                                            src={mediaUrl}
                                            controls
                                            className="w-full h-full object-contain bg-black"
                                        />
                                    ) : (
                                        <Image
                                            src={mediaUrl}
                                            alt={`${title} ${index + 1}`}
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    <p className="text-sm text-gray-500">Loading images...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                </div>
            </div>
        )
    }

    if (!serviceData) {
        return (
            <div className="min-h-screen bg-white w-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Service record not found</p>
                </div>
            </div>
        )
    }

    const hasAnyImages =
        serviceData.images.length > 0 ||
        serviceData.afterImages.length > 0 ||
        serviceData.brokenImages.length > 0

    return (
        <div className="min-h-screen bg-white w-full pb-12">
            {/* Header */}
            <div className="border-b-2 border-black p-4 sticky top-0 bg-white/95 backdrop-blur z-20 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-black">
                            Service Images
                            {serviceData.serviceNumber && (
                                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 ml-2">
                                    Service #{serviceData.serviceNumber}
                                </span>
                            )}
                        </h1>
                        {serviceData.cinemaName && (
                            <p className="text-sm text-gray-600">{serviceData.cinemaName}</p>
                        )}
                        {serviceData.date && (
                            <p className="text-xs text-gray-500">
                                {new Date(serviceData.date).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
                {!hasAnyImages ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No images available for this service record.</p>
                    </div>
                ) : (
                    <>
                        <Section
                            title="Before Service Images"
                            images={serviceData.images}
                            emptyMessage="No before service images available"
                            sectionKey="before_service"
                        />
                        <Section
                            title="After Service Images"
                            images={serviceData.afterImages}
                            emptyMessage="No after service images available"
                            sectionKey="after_service"
                        />
                        <Section
                            title="Broken/Damaged Items"
                            images={serviceData.brokenImages}
                            emptyMessage="No broken/damaged item images available"
                            sectionKey="broken_damaged"
                        />
                    </>
                )}
            </div>
        </div>
    )
}
