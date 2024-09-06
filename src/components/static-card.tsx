"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "~/utils/helpers";

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const nextIndex = useCallback(
    (index: number) => {
      return (index + 1) % images.length;
    },
    [images.length]
  );

  useEffect(() => {
    if (isHovered) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => nextIndex(prevIndex));
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, images.length, nextIndex]);

  function startHover() {
    setIsHovered(true);
  }

  function endHover() {
    setIsHovered(false);
  }

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <motion.div
        className="relative aspect-video w-full"
        onHoverStart={startHover}
        onHoverEnd={endHover}
      >
        {images.map((image, index) => {
          const imagePosition = (index - currentIndex + images.length) % images.length;

          const shouldBeVisible = imagePosition >= 0 && imagePosition < 3;

          return (
            <motion.div
              key={index}
              className={cn(
                "absolute h-full w-full overflow-hidden rounded-xl largeLaptop:rounded-2xl",
                {
                  block: shouldBeVisible,
                  hidden: !shouldBeVisible,
                }
              )}
              initial={{
                bottom: index === currentIndex ? 0 : `-${14 * index}px`,
                right: index === currentIndex ? 0 : `-${14 * index}px`,
              }}
              animate={{
                bottom: imagePosition === 0 ? 0 : `-${14 * imagePosition}px`,
                right: imagePosition === 0 ? 0 : `-${14 * imagePosition}px`,
                zIndex: images.length - imagePosition,
              }}
              transition={{
                duration: 2,
                ease: "easeInOut",
              }}
            >
              <div className="relative h-full w-full">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === currentIndex ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute h-full w-full"
                >
                  <Image
                    src={image}
                    alt={`${name} - Image ${index + 1}`}
                    className="absolute h-full w-full object-cover"
                  />
                </motion.div>
                <div
                  className="absolute top-0 z-[1] h-full w-full bg-black/40"
                  style={{
                    backgroundColor: `rgba(0, 0, 0, ${
                      index === currentIndex
                        ? 0.4
                        : imagePosition === 1
                          ? 0.25
                          : imagePosition === 2
                            ? 0.15
                            : 0
                    })`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <div className="flex flex-col items-center gap-1">
        <h5 className="text-sm largeMobile:text-xs largeMobile:font-semibold largeLaptop:text-lg">
          {name}
        </h5>
        <small className="text-xs largeMobile:text-xs largeLaptop:text-base">{location}</small>
      </div>
    </Link>
  );
}
