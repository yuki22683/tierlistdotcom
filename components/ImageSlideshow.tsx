'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface ImageSlideshowProps {
  images: string[]
  itemName: string
}

export default function ImageSlideshow({ images, itemName }: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        // Generate a random index different from current
        let newIndex
        do {
          newIndex = Math.floor(Math.random() * images.length)
        } while (newIndex === prevIndex && images.length > 1)
        return newIndex
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [images.length])

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full text-4xl font-bold bg-white text-gray-400">
        {itemName[0]}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {images.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={src}
            alt={itemName}
            fill
            className="object-cover"
          />
        </div>
      ))}
    </div>
  )
}
