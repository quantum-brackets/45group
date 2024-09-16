"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { motion, useAnimation } from "framer-motion";
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
  const [isMobile, setIsMobile] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const nextIndex = useCallback(
    (index: number) => {
      return (index + 1) % images.length;
    },
    [images.length]
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if ((isHovered || (isMobile && isInView)) && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => nextIndex(prevIndex));
      }, 5000);
    } else if ((!isHovered && !isMobile) || (isMobile && !isInView)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, isMobile, isInView, images.length, nextIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting && isMobile) {
          controls.start({ opacity: 1, y: 0 });
        }
      },
      { threshold: 0.5 }
    );

    const currentCardRef = cardRef.current;

    if (currentCardRef) {
      observer.observe(currentCardRef);
    }

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, [isMobile, controls]);

  function startHover() {
    if (!isMobile) setIsHovered(true);
  }

  function endHover() {
    if (!isMobile) setIsHovered(false);
  }

  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <motion.div
        ref={cardRef}
        className="relative aspect-video w-full"
        onHoverStart={startHover}
        onHoverEnd={endHover}
        initial={isMobile ? { opacity: 0, y: 50 } : {}}
        animate={controls}
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
                duration: 1,
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
